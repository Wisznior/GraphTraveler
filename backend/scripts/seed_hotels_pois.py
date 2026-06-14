import os
import time
import requests
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql"
REQUEST_DELAY_SEC = 2 
RADIUS_M = 15000 # dla hoteli (Overpass)
RADIUS_KM = 15 # dla POI (Wikidata)

HEADERS = {
    "User-Agent": "GraphTraveler/1.0 (educational project)"
}

#Mapowanie typów Wikidata
WIKIDATA_TYPES = {
    "Q570116": "viewpoint",
    "Q33506":  "museum",
    "Q23413":  "castle",
    "Q4989906": "monument",
    "Q22698":  "park",
    "Q16970":  "church",
    "Q41176":  "landmark", #fallback dla znanych budynków
}


def get_driver():
    return GraphDatabase.driver(
        os.getenv("NEO4J_URI", "bolt://localhost:7687"),
        auth=(os.getenv("NEO4J_USER", "neo4j"),
              os.getenv("NEO4J_PASSWORD", "graphtraveler123"))
    )


def fetch_overpass(query, retries=3, backoff=10):
    for attempt in range(1, retries + 1):
        try:
            response = requests.post(OVERPASS_URL, data={"data": query}, headers=HEADERS, timeout=60)
            response.raise_for_status()
            return response.json().get("elements", [])
        except requests.RequestException as e:
            print(f"  Błąd zapytania Overpass (próba {attempt}/{retries}): {e}")
            if attempt < retries:
                time.sleep(backoff * attempt)
    return []


def fetch_wikidata_sparql(query, retries=3, backoff=10):
    for attempt in range(1, retries + 1):
        try:
            response = requests.get(
                WIKIDATA_SPARQL_URL,
                params={"query": query, "format": "json"},
                headers=HEADERS,
                timeout=60,
            )
            response.raise_for_status()
            return response.json().get("results", {}).get("bindings", [])
        except requests.RequestException as e:
            print(f"  Błąd zapytania Wikidata (próba {attempt}/{retries}): {e}")
            if attempt < retries:
                time.sleep(backoff * attempt)
    return []


def build_hotel_query(lat, lon, radius_m=RADIUS_M):
    return f"""
    [out:json][timeout:25];
    node(around:{radius_m},{lat},{lon})["tourism"="hotel"];
    out;
    """


def build_poi_sparql(lat, lon, radius_km=RADIUS_KM, limit=10):
    return f"""
    SELECT ?item ?itemLabel ?lat ?lon (COUNT(?sitelink) AS ?sitelinks) WHERE {{
      SERVICE wikibase:around {{
        ?item wdt:P625 ?location .
        bd:serviceParam wikibase:center "Point({lon} {lat})"^^geo:wktLiteral .
        bd:serviceParam wikibase:radius "{radius_km}" .
      }}
      ?item wdt:P31/wdt:P279* wd:Q570116 .
      ?item p:P625/psv:P625 ?coord .
      ?coord wikibase:geoLatitude ?lat ;
             wikibase:geoLongitude ?lon .
      ?sitelink schema:about ?item .
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "pl,en". }}
    }}
    GROUP BY ?item ?itemLabel ?lat ?lon
    HAVING (COUNT(?sitelink) >= 15)
    ORDER BY DESC(?sitelinks)
    LIMIT {limit}
    """

def parse_hotels(elements, city):
    hotels = []
    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name")
        lat = el.get("lat")
        lon = el.get("lon")
        if not name or lat is None or lon is None:
            continue

        stars_raw = tags.get("stars")
        try:
            stars = float(stars_raw) if stars_raw else None
        except ValueError:
            stars = None

        hotels.append({
            "name": name,
            "stars": stars,
            "lat": lat,
            "lon": lon,
            "city": city,
        })
    return hotels


def parse_wikidata_pois(bindings, city):
    pois = []
    for b in bindings:
        name = b.get("itemLabel", {}).get("value")
        lat = b.get("lat", {}).get("value")
        lon = b.get("lon", {}).get("value")
        sitelinks = b.get("sitelinks", {}).get("value")

        if not name or lat is None or lon is None:
            continue

        pois.append({
            "name": name,
            "category": "attraction",
            "lat": float(lat),
            "lon": float(lon),
            "city": city,
            "sitelinks": int(sitelinks) if sitelinks else 0,
        })
    return pois

def dedupe_pois(pois):
    seen = {}
    for p in pois:
        key = (p["name"], round(p["lat"], 5), round(p["lon"], 5))
        if key not in seen or p["sitelinks"] > seen[key]["sitelinks"]:
            seen[key] = p
    return list(seen.values())


def save_hotels(session, hotels):
    if not hotels:
        return
    session.run("""
        UNWIND $rows AS row
        MATCH (c:City {name: row.city})
        MERGE (h:Hotel {name: row.name})
        SET h.stars = row.stars,
            h.lat = row.lat,
            h.lon = row.lon,
            h.city = row.city
        MERGE (c)-[:HAS_HOTEL]->(h)
    """, rows=hotels)


def save_pois(session, pois):
    if not pois:
        return
    session.run("""
        UNWIND $rows AS row
        MATCH (c:City {name: row.city})
        MERGE (p:POI {name: row.name})
        SET p.category = row.category,
            p.lat = row.lat,
            p.lon = row.lon,
            p.city = row.city,
            p.sitelinks = row.sitelinks
        MERGE (c)-[:HAS_POI]->(p)
    """, rows=pois)


def main():
    driver = get_driver()

    with driver.session() as session:
        result = session.run("""
            MATCH (c:City)
            WHERE c.appeal IS NOT NULL AND c.lat IS NOT NULL AND c.lon IS NOT NULL
              AND NOT (c)-[:HAS_HOTEL]->(:Hotel)
            RETURN c.name AS name, c.lat AS lat, c.lon AS lon
        """)
        cities = [(r["name"], r["lat"], r["lon"]) for r in result]

    print(f"Znaleziono {len(cities)} miast do przetworzenia")

    total_hotels = 0
    total_pois = 0

    with driver.session() as session:
        for i, (city, lat, lon) in enumerate(cities, start=1):
            print(f"[{i}/{len(cities)}] {city}")

            if lat is None or lon is None:
                print("    Pominięto (brak współrzędnych)")
                continue

            #Hotele (Overpass)
            hotel_elements = fetch_overpass(build_hotel_query(lat, lon))
            hotels = parse_hotels(hotel_elements, city)
            save_hotels(session, hotels)
            total_hotels += len(hotels)
            print(f"    Hotele: {len(hotels)}")
            time.sleep(REQUEST_DELAY_SEC)

            #POI (Wikidata SPARQL)
            bindings = fetch_wikidata_sparql(build_poi_sparql(lat, lon))
            pois = dedupe_pois(parse_wikidata_pois(bindings, city))
            save_pois(session, pois)
            total_pois += len(pois)
            print(f"    POI: {len(pois)}")
            time.sleep(REQUEST_DELAY_SEC)

    driver.close()

    print("Zakończono.")
    print(f"  Łącznie hoteli: {total_hotels}")
    print(f"  Łącznie POI: {total_pois}")


if __name__ == "__main__":
    main()