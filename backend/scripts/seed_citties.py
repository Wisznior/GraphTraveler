import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

CITY_DATA = {
    #Europa Zachodnia
    "Paris": {"appeal": 10, "cost_per_day": 180, "recommended_days": 4},
    "London": {"appeal": 10, "cost_per_day": 210, "recommended_days": 4},
    "Amsterdam": {"appeal": 9, "cost_per_day": 160, "recommended_days": 3},
    "Brussels":{"appeal": 7, "cost_per_day": 140, "recommended_days": 2},
    "Bruges": {"appeal": 8, "cost_per_day": 130, "recommended_days": 2},
    "Ghent": {"appeal": 7, "cost_per_day": 120, "recommended_days": 2},
    "Dublin":{"appeal": 8, "cost_per_day": 170, "recommended_days": 3},
    "Lisbon": {"appeal": 9, "cost_per_day": 110, "recommended_days": 4},
    "Porto": {"appeal": 9, "cost_per_day": 100, "recommended_days": 3},
    "Madrid": {"appeal": 9,"cost_per_day": 130, "recommended_days": 3},
    "Barcelona": {"appeal": 10, "cost_per_day": 150, "recommended_days": 4},
    "Seville": {"appeal": 8,"cost_per_day": 110, "recommended_days": 3},
    "Valencia": {"appeal": 7, "cost_per_day": 100, "recommended_days": 2},
    #Europa Środkowa
    "Vienna":{"appeal": 9, "cost_per_day": 150, "recommended_days": 3},
    "Prague": {"appeal": 9,  "cost_per_day": 90,  "recommended_days": 3},
    "Bratislava":{"appeal": 6, "cost_per_day": 80,  "recommended_days": 2},
    "Budapest": {"appeal": 9, "cost_per_day": 85,  "recommended_days": 3},
    "Krakow": {"appeal": 8, "cost_per_day": 70,  "recommended_days": 3},
    "Warsaw": {"appeal": 7, "cost_per_day": 80,  "recommended_days": 2},
    "Wroclaw":  {"appeal": 7, "cost_per_day": 65,  "recommended_days": 2},
    "Gdansk": {"appeal": 7, "cost_per_day": 70,  "recommended_days": 2},
    "Poznan": {"appeal": 5, "cost_per_day": 60,  "recommended_days": 1},
    "Berlin": {"appeal": 9, "cost_per_day": 130, "recommended_days": 4},
    "Munich":{"appeal": 8, "cost_per_day": 160, "recommended_days": 3},
    "Hamburg": {"appeal": 7, "cost_per_day": 140, "recommended_days": 2},
    "Frankfurt":{"appeal": 6, "cost_per_day": 150, "recommended_days": 1},
    "Cologne":{"appeal": 7, "cost_per_day": 130, "recommended_days": 2},
    "Dusseldorf": {"appeal": 6, "cost_per_day": 130, "recommended_days": 1},
    "Stuttgart": {"appeal": 5, "cost_per_day": 140, "recommended_days": 1},
    "Zurich":{"appeal": 7, "cost_per_day": 240, "recommended_days": 2},
    "Geneva":{"appeal": 7,"cost_per_day": 250, "recommended_days": 2},
    "Basel": {"appeal": 6, "cost_per_day": 200, "recommended_days": 2},
    #Europa Północna
    "Stockholm": {"appeal": 8, "cost_per_day": 180, "recommended_days": 3},
    "Oslo":{"appeal": 7,  "cost_per_day": 220, "recommended_days": 2},
    "Copenhagen":{"appeal": 8, "cost_per_day": 190, "recommended_days": 3},
    "Helsinki": {"appeal": 7,  "cost_per_day": 170, "recommended_days": 2},
    "Reykjavik":{"appeal": 9, "cost_per_day": 280, "recommended_days": 4},
    "Riga":{"appeal": 7,  "cost_per_day": 70, "recommended_days": 2},
    "Tallinn": {"appeal": 8, "cost_per_day": 75, "recommended_days": 2},
    "Vilnius": {"appeal": 7, "cost_per_day": 65, "recommended_days": 2},
    #Europa Południowa
    "Rome": {"appeal": 10, "cost_per_day": 140, "recommended_days": 4},
    "Milan": {"appeal": 8, "cost_per_day": 160, "recommended_days": 3},
    "Florence": {"appeal": 9, "cost_per_day": 140, "recommended_days": 3},
    "Venice":{"appeal": 9, "cost_per_day": 170, "recommended_days": 2},
    "Naples": {"appeal": 7, "cost_per_day": 100, "recommended_days": 2},
    "Bologna": {"appeal": 7, "cost_per_day": 110, "recommended_days": 2},
    "Turin":{"appeal": 6,  "cost_per_day": 110, "recommended_days": 2},
    "Athens": {"appeal": 9, "cost_per_day": 100, "recommended_days": 3},
    "Thessaloniki": {"appeal": 7, "cost_per_day": 80,  "recommended_days": 2},
    "Zagreb": {"appeal": 7, "cost_per_day": 75,  "recommended_days": 2},
    "Ljubljana":  {"appeal": 7, "cost_per_day": 90,  "recommended_days": 2},
    "Dubrovnik":{"appeal": 9, "cost_per_day": 130, "recommended_days": 3},
    "Split": {"appeal": 8,"cost_per_day": 110, "recommended_days": 2},
    "Bucharest":{"appeal": 6,"cost_per_day": 60,  "recommended_days": 2},
    "Sofia": {"appeal": 6, "cost_per_day": 55, "recommended_days": 2},
    "Belgrade":{"appeal": 7, "cost_per_day": 55, "recommended_days": 2},
    "Sarajevo": {"appeal": 7, "cost_per_day": 55, "recommended_days": 2},
    "Tirana": {"appeal": 5, "cost_per_day": 45, "recommended_days": 2},
    "Skopje": {"appeal": 5, "cost_per_day": 45, "recommended_days": 1},
    #Europa Wschodnia
    "Kiev": {"appeal": 7, "cost_per_day": 50, "recommended_days": 2},
    "Lviv":{"appeal": 7,"cost_per_day": 45, "recommended_days": 2},
    #Wyspy / Inne
    "Valletta": {"appeal": 7, "cost_per_day": 110, "recommended_days": 2},
    "Nicosia":{"appeal": 6, "cost_per_day": 100, "recommended_days": 2},
    "Palma de Mallorca": {"appeal": 7, "cost_per_day": 120, "recommended_days": 3},
    "Tenerife": {"appeal": 7, "cost_per_day": 110, "recommended_days": 5},
    "Las Palmas": {"appeal": 6, "cost_per_day": 100, "recommended_days": 4},
}

DEFAULTS_BY_COUNTRY = {
    "Germany": {"appeal": 6, "cost_per_day": 130, "recommended_days": 2},
    "France": {"appeal": 7, "cost_per_day": 150, "recommended_days": 2},
    "Italy": {"appeal": 7, "cost_per_day": 120, "recommended_days": 2},
    "Spain": {"appeal": 7, "cost_per_day": 110, "recommended_days": 2},
    "Poland":{"appeal": 6, "cost_per_day": 65,  "recommended_days": 2},
    "Czech Republic": {"appeal": 6, "cost_per_day": 80,  "recommended_days": 2},
    "Czechia":{"appeal": 6, "cost_per_day": 80,  "recommended_days": 2},
    "Austria": {"appeal": 7, "cost_per_day": 140, "recommended_days": 2},
    "Netherlands": {"appeal": 7, "cost_per_day": 150, "recommended_days": 2},
    "Sweden":  {"appeal": 7, "cost_per_day": 170, "recommended_days": 2},
    "Norway": {"appeal": 7, "cost_per_day": 200, "recommended_days": 2},
    "Denmark":{"appeal": 7, "cost_per_day": 180, "recommended_days": 2},
    "Finland": {"appeal": 6, "cost_per_day": 160, "recommended_days": 2},
    "Switzerland": {"appeal": 7, "cost_per_day": 220, "recommended_days": 2},
    "Greece": {"appeal": 7, "cost_per_day": 90, "recommended_days": 3},
    "Croatia":  {"appeal": 7, "cost_per_day": 100, "recommended_days": 2},
    "Hungary": {"appeal": 7, "cost_per_day": 80, "recommended_days": 2},
    "Romania": {"appeal": 5, "cost_per_day": 55, "recommended_days": 2},
    "Bulgaria": {"appeal": 5, "cost_per_day": 50, "recommended_days": 2},
    "Portugal": {"appeal": 8, "cost_per_day": 100, "recommended_days": 3},
    "Belgium": {"appeal": 7, "cost_per_day": 130, "recommended_days": 2},
    "Ireland":{"appeal": 7, "cost_per_day": 160,"recommended_days": 2},
    "Slovakia": {"appeal": 6, "cost_per_day": 70, "recommended_days": 2},
    "Slovenia": {"appeal": 7, "cost_per_day": 90, "recommended_days": 2},
}

DEFAULT_FALLBACK = {"appeal": 5, "cost_per_day": 100, "recommended_days": 2}


def get_driver():
    return GraphDatabase.driver(
        os.getenv("NEO4J_URI", "bolt://localhost:7687"),
        auth=(os.getenv("NEO4J_USER", "neo4j"),
              os.getenv("NEO4J_PASSWORD", "graphtraveler123"))
    )


def main():
    driver = get_driver()
    with driver.session() as session:
        result = session.run("MATCH (c:City) RETURN c.name AS name, c.country AS country")
        cities = [(r["name"], r["country"]) for r in result]

    print(f"Znaleziono {len(cities)} miast w bazie")

    updates = []
    matched_exact = 0
    matched_country = 0
    matched_default = 0

    for name, country in cities:
        if name in CITY_DATA:
            data = CITY_DATA[name]
            matched_exact += 1
        elif country in DEFAULTS_BY_COUNTRY:
            data = DEFAULTS_BY_COUNTRY[country]
            matched_country += 1
        else:
            data = DEFAULT_FALLBACK
            matched_default += 1

        updates.append({
            "name":name,
            "appeal": data["appeal"],
            "cost_per_day": data["cost_per_day"],
            "recommended_days": data["recommended_days"]
        })

    #zapis do Neo4j
    with driver.session() as session:
        session.run("""
            UNWIND $rows AS row
            MATCH (c:City {name: row.name})
            SET c.appeal = row.appeal,
                c.cost_per_day = row.cost_per_day,
                c.recommended_days = row.recommended_days
        """, rows=updates)

    driver.close()

    print(f"  Dopasowano dokładnie: {matched_exact}")
    print(f"  Dopasowano wg kraju: {matched_country}")
    print(f"  Fallback domyślny: {matched_default}")
    print(f"  Łącznie zaktualizowano:{len(updates)} miast")

if __name__ == "__main__":
    main()