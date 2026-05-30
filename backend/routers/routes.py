from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from services.neo4j_service import Neo4jService

router = APIRouter()


class AirportOut(BaseModel):
    code: str
    name: str
    city_name: str
    country: str
    lat: float
    lon: float


class FlightOut(BaseModel):
    src_code:     str
    src_name:     str
    src_city:     str
    dst_code:     str
    dst_name:     str
    dst_city:     str
    price:        float
    dist_km:      float
    duration_min: int
    departure:    str
    arrival:      str


class ConnectingFlightOut(BaseModel):
    src_code:           str
    src_name:           str
    src_city:           str
    src_lat:            float
    src_lon:            float
    hub_code:           str
    hub_name:           str
    hub_city:           str
    hub_lat:            float
    hub_lon:            float
    dst_code:           str
    dst_name:           str
    dst_city:           str
    dst_lat:            float
    dst_lon:            float
    total_price:        float
    total_dist_km:      float
    total_duration_min: int
    first_departure:    str
    first_arrival:      str
    second_departure:   str
    second_arrival:     str


CYPHER_CITIES = """
MATCH (c:City)
WHERE c.lat IS NOT NULL AND c.lon IS NOT NULL
RETURN c.name AS name, c.country AS country,
       c.lat AS lat, c.lon AS lon, c.is_unesco AS is_unesco
ORDER BY c.name
"""

CYPHER_AIRPORTS = """
MATCH (a:Airport)
WHERE a.lat IS NOT NULL AND a.lon IS NOT NULL
RETURN a.code AS code, a.name AS name, a.city_name AS city_name,
       a.country AS country, a.lat AS lat, a.lon AS lon
ORDER BY a.city_name, a.code
"""

CYPHER_FLIGHTS_FROM = """
MATCH (src:Airport {code: $code})-[f:FLIGHT_TO]->(dst:Airport)
RETURN src.code AS src_code, src.name AS src_name, src.city_name AS src_city,
       dst.code AS dst_code, dst.name AS dst_name, dst.city_name AS dst_city,
       f.price AS price, f.dist_km AS dist_km, f.duration_min AS duration_min,
       f.departure AS departure, coalesce(f.arrival, '--:--') AS arrival
ORDER BY f.departure ASC, f.price ASC
"""

CYPHER_FLIGHTS_BETWEEN = """
MATCH (src:Airport {code: $src})-[f:FLIGHT_TO]->(dst:Airport {code: $dst})
RETURN src.code AS src_code, src.name AS src_name, src.city_name AS src_city,
       dst.code AS dst_code, dst.name AS dst_name, dst.city_name AS dst_city,
       f.price AS price, f.dist_km AS dist_km, f.duration_min AS duration_min,
       f.departure AS departure, coalesce(f.arrival, '--:--') AS arrival
ORDER BY f.departure ASC
"""

CYPHER_ALL_FLIGHTS = """
MATCH (src:Airport)-[f:FLIGHT_TO]->(dst:Airport)
RETURN src.code AS src_code, src.name AS src_name, src.city_name AS src_city,
       dst.code AS dst_code, dst.name AS dst_name, dst.city_name AS dst_city,
       f.price AS price, f.dist_km AS dist_km, f.duration_min AS duration_min,
       f.departure AS departure, coalesce(f.arrival, '--:--') AS arrival
ORDER BY f.price ASC
LIMIT $limit
"""

CYPHER_CONNECTING = """
MATCH (src:Airport {code: $src})-[f1:FLIGHT_TO]->(hub:Airport)-[f2:FLIGHT_TO]->(dst:Airport {code: $dst})
WHERE hub <> src AND hub <> dst
WITH src, f1, hub, f2, dst,
     f1.price + f2.price                             AS total_price,
     f1.dist_km + f2.dist_km                         AS total_dist_km,
     f1.duration_min + f2.duration_min + 90          AS total_duration_min
RETURN src.code AS src_code, src.name AS src_name, src.city_name AS src_city,
       src.lat  AS src_lat,  src.lon  AS src_lon,
       hub.code AS hub_code, hub.name AS hub_name, hub.city_name AS hub_city,
       hub.lat  AS hub_lat,  hub.lon  AS hub_lon,
       dst.code AS dst_code, dst.name AS dst_name, dst.city_name AS dst_city,
       dst.lat  AS dst_lat,  dst.lon  AS dst_lon,
       total_price, total_dist_km, total_duration_min,
       f1.departure AS first_departure,  coalesce(f1.arrival, '--:--') AS first_arrival,
       f2.departure AS second_departure, coalesce(f2.arrival, '--:--') AS second_arrival
ORDER BY total_price ASC
LIMIT $limit
"""

@router.get("/cities", summary="Lista miast")
def get_cities():
    svc = Neo4jService()
    try:
        return svc.query(CYPHER_CITIES)
    finally:
        svc.close()


@router.get("/airports", response_model=list[AirportOut], summary="Lista lotnisk")
def get_airports(city: str | None = Query(None)):
    svc = Neo4jService()
    try:
        rows = svc.query(CYPHER_AIRPORTS)
        if city:
            rows = [r for r in rows if r["city_name"].lower() == city.lower()]
        return rows
    finally:
        svc.close()


@router.get("/flights", response_model=list[FlightOut], summary="Loty z opcjonalnym filtrem")
def get_flights(
    src:   str | None = Query(None),
    dst:   str | None = Query(None),
    limit: int        = Query(100),
):
    svc = Neo4jService()
    try:
        if src and dst:
            rows = svc.query(CYPHER_FLIGHTS_BETWEEN, {"src": src.upper(), "dst": dst.upper()})
            return rows
        if src:
            rows = svc.query(CYPHER_FLIGHTS_FROM, {"code": src.upper()})
            if not rows:
                raise HTTPException(status_code=404, detail=f"Brak lotów z {src.upper()}")
            return rows
        return svc.query(CYPHER_ALL_FLIGHTS, {"limit": limit})
    finally:
        svc.close()

@router.get("/flights/connecting", response_model=list[ConnectingFlightOut], summary="Loty z przesiadką")
def get_connecting_flights(
    src:   str = Query(...),
    dst:   str = Query(...),
    limit: int = Query(15),
):
    svc = Neo4jService()
    try:
        rows = svc.query(CYPHER_CONNECTING, {
            "src": src.upper(), "dst": dst.upper(), "limit": limit,
        })
        if not rows:
            raise HTTPException(
                status_code=404,
                detail=f"Brak połączeń z przesiadką {src.upper()} → {dst.upper()}"
            )
        return rows
    finally:
        svc.close()
