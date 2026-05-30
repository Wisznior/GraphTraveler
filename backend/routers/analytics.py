from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from services.neo4j_service import Neo4jService

router = APIRouter()

# modele
class HubResult(BaseModel):
    airport_name:     str
    iata_code:        str
    city:             str
    country:          str
    lat:              float
    lon:              float
    centrality_score: float
    rank:             int


class PathStop(BaseModel):
    code:      str
    name:      str
    city:      str
    lat:       float
    lon:       float
    node_type: str        # "origin" | "hub" | "destination"
    departure: str | None 
    arrival:   str | None  
    leg_price:    float | None
    leg_dist_km:  float | None
    leg_duration: int   | None

class PathResult(BaseModel):
    stops:              list[PathStop]
    total_cost:         float
    total_dist_km:      float
    total_duration_min: int
    hops:               int
    optimized_by:       str

CYPHER_EXISTS = "CALL gds.graph.exists('flight-graph') YIELD exists RETURN exists"

CYPHER_DROP = "CALL gds.graph.drop('flight-graph', false) YIELD graphName RETURN graphName"

CYPHER_PROJECT = """
CALL gds.graph.project(
    'flight-graph',
    'Airport',
    {
        FLIGHT_TO: {
            orientation: 'NATURAL',
            properties: {
                price:        { property: 'price',        defaultValue: 9999.0 },
                dist_km:      { property: 'dist_km',      defaultValue: 9999.0 },
                duration_min: { property: 'duration_min', defaultValue: 9999 }
            }
        }
    }
)
YIELD graphName, nodeCount, relationshipCount
RETURN graphName, nodeCount, relationshipCount
"""


def ensure_projection(svc: Neo4jService):
    try:
        rows = svc.query(CYPHER_EXISTS)
        if not rows or not rows[0]["exists"]:
            svc.query(CYPHER_PROJECT)
    except Exception:
        try:
            svc.query(CYPHER_DROP)
            svc.query(CYPHER_PROJECT)
        except Exception:
            pass

def build_betweenness_cypher(top: int, country: str | None, region: str | None) -> tuple[str, dict]:

    REGION_COUNTRIES = {
        "north":   {"Norway", "Sweden", "Denmark", "Finland", "Estonia", "Latvia", "Lithuania"},
        "south":   {"Italy", "Spain", "Portugal", "Greece", "Croatia", "Slovenia"},
        "east":    {"Poland", "Czechia", "Czech Republic", "Slovakia", "Hungary", "Romania", "Bulgaria"},
        "west":    {"France", "Netherlands", "Belgium", "Ireland", "United Kingdom"},
        "central": {"Germany", "Austria", "Switzerland", "Luxembourg"},
    }

    params: dict = {"top": top}
    country_filter = ""
    
    if country:
        country_filter = "AND airport.country = $country"
        params["country"] = country
    elif region and region in REGION_COUNTRIES:
        country_filter = "AND airport.country IN $countries"
        params["countries"] = list(REGION_COUNTRIES[region])

    cypher = f"""
    CALL gds.betweenness.stream('flight-graph')
    YIELD nodeId, score
    WITH gds.util.asNode(nodeId) AS airport, score
    WHERE airport.lat IS NOT NULL
      AND airport.lon IS NOT NULL
      {country_filter}
    RETURN airport.name     AS airport_name,
           airport.code     AS iata_code,
           airport.city_name AS city,
           airport.country  AS country,
           airport.lat      AS lat,
           airport.lon      AS lon,
           round(score, 2)  AS centrality_score
    ORDER BY centrality_score DESC
    LIMIT $top
    """
    return cypher, params


#Dijkstra
def build_dijkstra_cypher(weight: str) -> str:
    return f"""
    MATCH (src:Airport {{code: $src}}), (dst:Airport {{code: $dst}})
    CALL gds.shortestPath.dijkstra.stream('flight-graph', {{
        sourceNode: src,
        targetNode: dst,
        relationshipWeightProperty: '{weight}'
    }})
    YIELD nodeIds, totalCost
    RETURN nodeIds, totalCost
    LIMIT 1
    """


def get_leg_details(svc: Neo4jService, codes: list[str]) -> list[dict]:
    legs = []
    for i in range(len(codes) - 1):
        src, dst = codes[i], codes[i + 1]
        rows = svc.query("""
            MATCH (a:Airport {code: $src})-[f:FLIGHT_TO]->(b:Airport {code: $dst})
            RETURN f.price AS price, f.dist_km AS dist_km,
                   f.duration_min AS duration_min,
                   f.departure AS departure, f.arrival AS arrival
            ORDER BY f.price ASC
            LIMIT 1
        """, {"src": src, "dst": dst})
        if rows:
            legs.append(rows[0])
        else:
            legs.append({
                "price": 0, "dist_km": 0, "duration_min": 0,
                "departure": "--:--", "arrival": "--:--",
            })
    return legs

#endpoints
@router.post("/project", summary="Utwórz/odśwież projekcję grafu GDS")
def create_projection():
    svc = Neo4jService()
    try:
        svc.query(CYPHER_DROP)
        rows = svc.query(CYPHER_PROJECT)
        return rows[0] if rows else {"status": "projected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        svc.close()

@router.get(
    "/hubs",
    response_model=list[HubResult],
    summary="Ranking hubów — Betweenness Centrality z filtrami",
)
def get_hubs(
    top:     int          = Query(30,   description="Liczba wyników (5–100)"),
    country: str | None   = Query(None, description="Filtruj po kraju, np. 'Germany'"),
    region:  str | None   = Query(None, description="Makroregion: north|south|east|west|central"),
):
    top = max(5, min(100, top))
    svc = Neo4jService()
    try:
        ensure_projection(svc)
        cypher, params = build_betweenness_cypher(top, country, region)
        rows = svc.query(cypher, params)
        if not rows:
            raise HTTPException(
                status_code=404,
                detail="Brak danych dla podanych filtrów. Spróbuj inne kryteria lub zaimportuj lotniska."
            )
        return [{"rank": i + 1, **r} for i, r in enumerate(rows)]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd GDS: {e}")
    finally:
        svc.close()

@router.get(
    "/countries",
    summary="Lista krajów dostępnych w bazie (do filtrów hubów)",
)
def get_countries():
    svc = Neo4jService()
    try:
        rows = svc.query("""
            MATCH (a:Airport)
            WHERE a.country IS NOT NULL
            RETURN DISTINCT a.country AS country
            ORDER BY country
        """)
        return [r["country"] for r in rows]
    finally:
        svc.close()


@router.get(
    "/shortest-path",
    response_model=PathResult,
    summary="Najkrótsza ścieżka Dijkstra (GDS) — cena / dystans / czas",
)
def get_shortest_path(
    src:    str = Query(..., description="Kod IATA źródła, np. WAW"),
    dst:    str = Query(..., description="Kod IATA celu, np. LIS"),
    weight: str = Query("price", description="Kryterium: price | dist_km | duration_min"),
):
    if weight not in ("price", "dist_km", "duration_min"):
        raise HTTPException(status_code=422, detail="weight musi być: price | dist_km | duration_min")

    svc = Neo4jService()
    try:
        ensure_projection(svc)

        cypher = build_dijkstra_cypher(weight)
        rows = svc.query(cypher, {"src": src.upper(), "dst": dst.upper()})

        if not rows or not rows[0]["nodeIds"]:
            raise HTTPException(
                status_code=404,
                detail=f"Brak ścieżki {src.upper()} → {dst.upper()} w grafie."
            )

        node_ids   = rows[0]["nodeIds"]
        total_cost = rows[0]["totalCost"]

        id_rows = svc.query("""
            UNWIND $ids AS nid
            MATCH (a:Airport)
            WHERE id(a) = nid
            RETURN a.code AS code, a.name AS name, a.city_name AS city,
                   a.lat AS lat, a.lon AS lon
            ORDER BY nid
        """, {"ids": node_ids})

        id_map = {r["code"]: r for r in id_rows}

        codes_in_order = []
        for nid in node_ids:
            r = svc.query("""
                MATCH (a:Airport) WHERE id(a) = $nid
                RETURN a.code AS code, a.name AS name,
                       a.city_name AS city, a.lat AS lat, a.lon AS lon
            """, {"nid": nid})
            if r:
                codes_in_order.append(r[0])

        codes = [r["code"] for r in codes_in_order]

        legs = get_leg_details(svc, codes)

        stops = []
        for i, airport_data in enumerate(codes_in_order):
            leg_before = legs[i - 1] if i > 0 else None
            leg_after  = legs[i]     if i < len(legs) else None

            if i == 0:
                node_type = "origin"
            elif i == len(codes_in_order) - 1:
                node_type = "destination"
            else:
                node_type = "hub"

            stops.append(PathStop(
                code=airport_data["code"],
                name=airport_data["name"],
                city=airport_data["city"],
                lat=airport_data["lat"],
                lon=airport_data["lon"],
                node_type=node_type,
                departure=leg_after["departure"]  if leg_after  else None,
                arrival=leg_before["arrival"]     if leg_before else None,
                leg_price=leg_after["price"]          if leg_after else None,
                leg_dist_km=leg_after["dist_km"]      if leg_after else None,
                leg_duration=leg_after["duration_min"] if leg_after else None,
            ))

        total_dist     = sum(l["dist_km"]      for l in legs)
        total_duration = sum(l["duration_min"] for l in legs)
        total_price    = sum(l["price"]        for l in legs)
        hops           = len(legs)

        return PathResult(
            stops=stops,
            total_cost=round(total_price, 2),
            total_dist_km=round(total_dist, 1),
            total_duration_min=total_duration,
            hops=hops,
            optimized_by=weight,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd Dijkstra: {e}")
    finally:
        svc.close()
