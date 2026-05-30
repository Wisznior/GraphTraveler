import os
import io
import math
import random
import requests
import pandas as pd
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

AIRPORTS_URL = "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat"
ROUTES_URL   = "https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat"

AIRPORT_COLS = [
    "id", "name", "city", "country", "code", "icao",
    "lat", "lon", "alt", "tz", "dst", "tz_name", "type", "source"
]
ROUTE_COLS = [
    "airline", "airline_id", "src", "src_id", "dst", "dst_id",
    "codeshare", "stops", "equipment"
]

EUROPEAN_COUNTRIES = {
    "Poland", "Germany", "Czechia", "Czech Republic", "Austria", "France",
    "Italy", "Netherlands", "Spain", "Hungary", "Romania", "Switzerland",
    "Belgium", "Sweden", "Norway", "Denmark", "Finland", "Portugal",
    "Greece", "Croatia", "Slovakia", "Slovenia",
}

HIGH_COST_COUNTRIES = {"Norway", "Sweden", "Switzerland", "Denmark", "Finland", "United Kingdom"}

MAJOR_HUBS = {
    "LHR", "CDG", "AMS", "FRA", "MUC", "MAD", "BCN",
    "FCO", "ZRH", "VIE", "BRU", "DUB", "CPH", "ARN",
}

LCC_AIRPORTS = {
    "STN", "LTN", "BGY", "CIA", "HHN", "NRN", "CRL",
    "GRO", "RIX", "VNO", "TLL", "KTW", "WMI", "RZE",
}

DEPARTURES = ["06:10", "08:25", "10:40", "13:15", "15:50", "18:05", "20:30"]


def get_driver():
    uri      = os.getenv("NEO4J_URI",      "bolt://localhost:7687")
    user     = os.getenv("NEO4J_USER",     "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "graphtraveler123")
    return GraphDatabase.driver(uri, auth=(user, password))


def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi    = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a)), 1)


def estimate_price(dist_km, src_code, dst_code, src_country, dst_country):
    if dist_km < 250:
        base = 55 + dist_km * 0.10       
    elif dist_km < 600:
        base = 38 + dist_km * 0.075
    elif dist_km < 1200:
        base = 30 + dist_km * 0.055
    elif dist_km < 2500:
        base = 25 + dist_km * 0.042
    else:
        base = 20 + dist_km * 0.035      

    hub_premium = 0.0
    lcc_discount = 0.0

    if src_code in MAJOR_HUBS or dst_code in MAJOR_HUBS:
        hub_premium = random.uniform(0.12, 0.28)   
    if src_code in LCC_AIRPORTS or dst_code in LCC_AIRPORTS:
        lcc_discount = random.uniform(0.08, 0.22)  

    base *= (1 + hub_premium - lcc_discount)

    if src_country in HIGH_COST_COUNTRIES or dst_country in HIGH_COST_COUNTRIES:
        base *= random.uniform(1.15, 1.35)

    noise_factor = math.exp(random.gauss(0, 0.18))
    base *= noise_factor

    rounded = round(base / 10) * 10
    return max(9.99, rounded - 0.01)


def estimate_duration(dist_km):
    cruise_min = (dist_km / 820) * 60
    ground_min = 20 + max(0, (1000 - dist_km) / 100)
    return int(cruise_min + ground_min)


def departure_to_timestamp(dep_str):
    h, m = map(int, dep_str.split(":"))
    return h * 60 + m


def load_airports() -> pd.DataFrame:
    print("Pobieranie airports.dat...")
    resp = requests.get(AIRPORTS_URL, timeout=30)
    df = pd.read_csv(io.StringIO(resp.text), header=None, names=AIRPORT_COLS, na_values=["\\N"])
    df = df[df["country"].isin(EUROPEAN_COUNTRIES)]
    df = df[df["code"].notna() & (df["code"] != "")]
    df = df[df["type"] == "airport"]
    print(f"  → {len(df)} lotnisk europejskich")
    return df


def load_routes(airports: pd.DataFrame) -> pd.DataFrame:
    print("Pobieranie routes.dat...")
    resp = requests.get(ROUTES_URL, timeout=30)
    df = pd.read_csv(io.StringIO(resp.text), header=None, names=ROUTE_COLS, na_values=["\\N"])
    valid_codes = set(airports["code"].dropna())
    df = df[df["src"].isin(valid_codes) & df["dst"].isin(valid_codes)]
    df = df[df["stops"] == 0]
    print(f"  → {len(df)} tras bezpośrednich między lotniskami europejskimi")
    return df


def import_airports(driver, airports: pd.DataFrame):
    print("Import węzłów Airport i City do Neo4j...")
    cypher = """
    UNWIND $rows AS row
    MERGE (a:Airport {code: row.code})
    SET a.name      = row.name,
        a.city_name = row.city,
        a.country   = row.country,
        a.lat       = row.lat,
        a.lon       = row.lon
    MERGE (c:City {name: row.city})
    ON CREATE SET
        c.country   = row.country,
        c.lat       = row.lat,
        c.lon       = row.lon,
        c.is_unesco = false
    """
    rows = airports[["code", "name", "city", "country", "lat", "lon"]].to_dict("records")
    with driver.session() as session:
        session.run(cypher, rows=rows)
    print(f"  → {len(rows)} lotnisk zaimportowanych")


def import_routes(driver, routes: pd.DataFrame, airports: pd.DataFrame):
    print("Import relacji FLIGHT_TO do Neo4j...")

    coords = {
        row["code"]: (row["lat"], row["lon"], row["country"])
        for _, row in airports.iterrows()
        if pd.notna(row["lat"]) and pd.notna(row["lon"])
    }

    enriched = []
    for _, row in routes.iterrows():
        src, dst = row["src"], row["dst"]
        if src not in coords or dst not in coords:
            continue

        lat1, lon1, country_src = coords[src]
        lat2, lon2, country_dst = coords[dst]
        dist     = haversine(lat1, lon1, lat2, lon2)
        duration = estimate_duration(dist)

        is_popular = src in MAJOR_HUBS or dst in MAJOR_HUBS
        if dist < 400:
            num_flights = random.randint(3, 6) if is_popular else random.randint(2, 4)
        elif dist < 1000:
            num_flights = random.randint(2, 4) if is_popular else random.randint(1, 3)
        else:
            num_flights = random.randint(1, 3) if is_popular else random.randint(1, 2)

        used_departures = random.sample(DEPARTURES, min(num_flights, len(DEPARTURES)))

        for departure in used_departures:
            price = estimate_price(dist, src, dst, country_src, country_dst)
            dep_ts = departure_to_timestamp(departure)
            arr_ts = dep_ts + duration
            arr_h  = (arr_ts % 1440) // 60
            arr_m  = (arr_ts % 1440) % 60
            arrival = f"{arr_h:02d}:{arr_m:02d}"

            enriched.append({
                "src":           src,
                "dst":           dst,
                "dist_km":       dist,
                "price":         price,
                "duration_min":  duration,
                "departure":     departure,
                "arrival":       arrival,
                "dep_timestamp": dep_ts,
                "arr_timestamp": arr_ts,
                "flight_id":     f"{src}-{dst}-{departure}",
            })

    cypher = """
    UNWIND $rows AS row
    MATCH (src:Airport {code: row.src})
    MATCH (dst:Airport {code: row.dst})
    MERGE (src)-[r:FLIGHT_TO {flight_id: row.flight_id}]->(dst)
    SET r.dist_km       = row.dist_km,
        r.price         = row.price,
        r.duration_min  = row.duration_min,
        r.departure     = row.departure,
        r.arrival       = row.arrival,
        r.dep_timestamp = row.dep_timestamp,
        r.arr_timestamp = row.arr_timestamp
    """

    total = len(enriched)
    batch_size = 500
    with driver.session() as session:
        for i in range(0, total, batch_size):
            session.run(cypher, rows=enriched[i:i+batch_size])
            print(f"  → {min(i+batch_size, total)}/{total}", end="\r")

    routes_count = len(routes)
    print(f"\n  → {total} lotów z {routes_count} tras (~{total/routes_count:.1f} lotu/trasę)")


def main():
    driver   = get_driver()
    airports = load_airports()
    routes   = load_routes(airports)
    import_airports(driver, airports)
    import_routes(driver, routes, airports)
    driver.close()
    print("Import zakończony.")


if __name__ == "__main__":
    main()
