from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from services.neo4j_service import Neo4jService

router = APIRouter()

class FlightInfo(BaseModel):
    from_code: str
    to_code: str
    price: float
    departure: str
    arrival: str
    duration_min: int

class HotelOut(BaseModel):
    name: str
    stars: float | None
    lat: float
    lon: float

class POIOut(BaseModel):
    name: str
    category: str
    lat: float
    lon: float

class TripStop(BaseModel):
    day_from: int
    day_to: int
    city: str
    country: str
    airport_code: str
    airport_name: str
    lat: float
    lon: float
    appeal: int
    cost_per_day: float
    recommended_days: int
    flight_in: FlightInfo
    top_hotels: list[HotelOut] = []
    top_pois: list[POIOut] = []

class TripVariant(BaseModel):
    variant: str        # "economy" | "balanced" | "premium"
    label: str
    description: str
    origin_city: str
    origin_code: str
    origin_lat: float
    origin_lon: float
    total_days: int
    budget_total: float
    budget_used: float
    budget_remaining: float
    flight_cost: float
    stay_cost: float
    return_flight: FlightInfo | None
    stops: list[TripStop]
    warnings: list[str]


class TripPlanResponse(BaseModel):
    variants: list[TripVariant]

CYPHER_ORIGIN = """
MATCH (a:Airport {code: $code})
OPTIONAL MATCH (a)-[:SERVES]->(c:City)
RETURN a.code AS code,
       a.name AS name,
       coalesce(c.name, a.city_name) AS city,
       a.lat AS lat,
       a.lon AS lon
"""

CYPHER_REACHABLE = """
MATCH (origin:Airport {code: $src})-[f:FLIGHT_TO]->(dst:Airport)
WHERE f.price <= $max_flight_price
MATCH (dst)-[:SERVES]->(c:City)
WHERE c.appeal IS NOT NULL
  AND c.cost_per_day IS NOT NULL
  AND c.recommended_days IS NOT NULL
WITH dst, f, c
RETURN DISTINCT
    dst.code AS airport_code,
    dst.name AS airport_name,
    dst.lat AS lat,
    dst.lon AS lon,
    c.name AS city,
    c.country AS country,
    c.appeal AS appeal,
    c.cost_per_day AS cost_per_day,
    c.recommended_days AS recommended_days,
    f.price AS flight_price,
    f.departure AS departure,
    f.arrival AS arrival,
    f.duration_min AS duration_min
ORDER BY f.price ASC
"""

# Najtańszy lot między dwoma lotniskami
CYPHER_CHEAPEST_FLIGHT = """
MATCH (a:Airport {code: $src})-[f:FLIGHT_TO]->(b:Airport {code: $dst})
RETURN f.price AS price,
       f.departure AS departure,
       f.arrival AS arrival,
       f.duration_min AS duration_min,
       b.code AS to_code
ORDER BY f.price ASC
LIMIT 1
"""

CYPHER_RETURN_DIRECT = """
MATCH (a:Airport {code: $src})-[f:FLIGHT_TO]->(b:Airport {code: $dst})
RETURN f.price AS price,
       f.departure AS departure,
       f.arrival AS arrival,
       f.duration_min AS duration_min,
       $src AS from_code,
       $dst AS to_code,
       false AS is_connecting
ORDER BY f.price ASC
LIMIT 1
"""

CYPHER_RETURN_CONNECTING = """
MATCH (a:Airport {code: $src})-[f1:FLIGHT_TO]->(hub:Airport)-[f2:FLIGHT_TO]->(b:Airport {code: $dst})
WHERE hub.code <> $src AND hub.code <> $dst
  AND f2.dep_timestamp >= f1.arr_timestamp + 45
RETURN (f1.price + f2.price) AS price,
       f1.departure AS departure,
       f2.arrival AS arrival,
       (f1.duration_min + f2.duration_min + 90) AS duration_min,
       $src AS from_code,
       $dst AS to_code,
       true AS is_connecting
ORDER BY price ASC
LIMIT 1
"""

CYPHER_RETURN_CONNECTING_RELAXED = """
MATCH (a:Airport {code: $src})-[f1:FLIGHT_TO]->(hub:Airport)-[f2:FLIGHT_TO]->(b:Airport {code: $dst})
WHERE hub.code <> $src AND hub.code <> $dst
RETURN (f1.price + f2.price) AS price,
       f1.departure AS departure,
       f2.arrival AS arrival,
       (f1.duration_min + f2.duration_min + 90) AS duration_min,
       $src AS from_code,
       $dst AS to_code,
       true AS is_connecting
ORDER BY price ASC
LIMIT 1
"""

CYPHER_TOP_HOTELS = """
MATCH (c:City {name: $city})-[:HAS_HOTEL]->(h:Hotel)
RETURN h.name AS name, h.stars AS stars, h.lat AS lat, h.lon AS lon
ORDER BY h.stars DESC LIMIT 3
"""

CYPHER_TOP_POIS = """
MATCH (c:City {name: $city})-[:HAS_POI]->(p:POI)
RETURN p.name AS name, p.category AS category, p.lat AS lat, p.lon AS lon
ORDER BY p.sitelinks DESC
LIMIT 3
"""

def find_return_flight(svc: Neo4jService, src: str, dst: str) -> dict | None:
    rows = svc.query(CYPHER_RETURN_DIRECT, {"src": src, "dst": dst})
    if rows:
        return rows[0]
    rows = svc.query(CYPHER_RETURN_CONNECTING, {"src": src, "dst": dst})
    if rows:
        return rows[0]
    rows = svc.query(CYPHER_RETURN_CONNECTING_RELAXED, {"src": src, "dst": dst})
    return rows[0] if rows else None

def fetch_top_hotels_and_pois(svc: Neo4jService, city: str) -> tuple[list[HotelOut], list[POIOut]]:
    hotel_rows = svc.query(CYPHER_TOP_HOTELS, {"city": city})
    poi_rows = svc.query(CYPHER_TOP_POIS, {"city": city})

    hotels = [
        HotelOut(name=r["name"], stars=r.get("stars"), lat=r["lat"], lon=r["lon"])
        for r in hotel_rows
    ]
    pois = [
        POIOut(name=r["name"], category=r["category"], lat=r["lat"], lon=r["lon"])
        for r in poi_rows
    ]
    return hotels, pois

def score_candidate(c: dict, origin_country: str, visited_countries: set, weight: float) -> float:
    total_cost = c["cost_per_day"] * c["recommended_days"] + c["flight_price"]
    if total_cost <= 0:
        return 0.0

    base = c["appeal"] / total_cost

    if c["country"] != origin_country:
        base *= 1.4

    if c["country"] not in visited_countries:
        base *= 1.2

    price_factor = 1.0 - weight
    appeal_factor = weight

    cost_score = 1.0 / (c["flight_price"] + 1) * price_factor * 100
    appeal_score = c["appeal"] * appeal_factor

    return base + cost_score + appeal_score


def run_greedy(
    svc: Neo4jService,
    origin: dict,
    all_candidates: list[dict],
    budget: float,
    days_total: int,
    max_cities: int,
    weight: float,
) -> tuple[list[TripStop], list[str], float, float, float, str]:
    warnings: list[str] = []
    budget_remaining = budget
    days_remaining = days_total
    current_code = origin["code"]
    origin_country = ""

    origin_airport = svc.query(
        "MATCH (a:Airport {code: $c}) RETURN a.country AS country",
        {"c": origin["code"]}
    )
    if origin_airport:
        origin_country = origin_airport[0].get("country", "")

    stops: list[TripStop] = []
    total_flight_cost = 0.0
    total_stay_cost = 0.0
    current_day = 1
    visited_countries: set[str] = set()
    visited_cities: set[str] = {origin.get("city", "")}   #miasto startowe już odwiedzone

    for _ in range(max_cities):
        visited_codes = {s.airport_code for s in stops} | {origin["code"]}

        if current_code == origin["code"]:
            candidates = [
                c for c in all_candidates
                if c["airport_code"] not in visited_codes
                and c["city"] not in visited_cities        #nie wracaj do odwiedzonego miasta
            ]
        else:
            raw = svc.query(CYPHER_REACHABLE, {
                "src": current_code,
                "max_flight_price": max(budget_remaining * 0.4, 50),
            })
            candidates = [
                c for c in raw
                if c["airport_code"] not in visited_codes
                and c["city"] not in visited_cities
            ]

        if not candidates:
            warnings.append(
                f"Brak dostępnych nowych destynacji z {current_code} "
                f"(budżet: {budget_remaining:.0f} EUR, dni: {days_remaining})."
            )
            break

        candidates = [
            c for c in candidates
            if c["flight_price"] + c["cost_per_day"] * min(
                max(c["recommended_days"], 2),
                max(2, days_remaining - 1)
            ) <= budget_remaining
        ]

        if not candidates:
            warnings.append(
                f"Żaden kandydat nie mieści się w pozostałym budżecie "
                f"({budget_remaining:.0f} EUR) przy minimum 2 dniach pobytu."
            )
            break

        best = max( candidates, key=lambda c: score_candidate(c, origin_country, visited_countries, weight) )
        days_here   = min( max(best["recommended_days"], 2), max(2, days_remaining - 1) )
        stay_cost   = best["cost_per_day"] * days_here
        flight_cost = best["flight_price"]
        total_cost  = stay_cost + flight_cost

        if total_cost > budget_remaining:
            break

        top_hotels, top_pois = fetch_top_hotels_and_pois(svc, best["city"])

        if days_remaining - days_here < 2:
            stops.append(TripStop(
                day_from = current_day,
                day_to = current_day + days_here - 1,
                city = best["city"],
                country = best["country"],
                airport_code = best["airport_code"],
                airport_name = best["airport_name"],
                lat = best["lat"],
                lon = best["lon"],
                appeal = best["appeal"],
                cost_per_day = best["cost_per_day"],
                recommended_days = best["recommended_days"],
                flight_in = FlightInfo(
                    from_code = current_code,
                    to_code = best["airport_code"],
                    price = flight_cost,
                    departure = best["departure"],
                    arrival = best["arrival"],
                    duration_min = best["duration_min"],
                ),
                top_hotels = top_hotels,
                top_pois = top_pois,
            ))
            visited_countries.add(best["country"])
            visited_cities.add(best["city"])
            budget_remaining -= total_cost
            total_flight_cost += flight_cost
            total_stay_cost += stay_cost
            current_code = best["airport_code"]
            break  #za mało dni na kolejne miasto

        stops.append(TripStop(
            day_from = current_day,
            day_to = current_day + days_here - 1,
            city = best["city"],
            country = best["country"],
            airport_code = best["airport_code"],
            airport_name = best["airport_name"],
            lat = best["lat"],
            lon = best["lon"],
            appeal = best["appeal"],
            cost_per_day = best["cost_per_day"],
            recommended_days = best["recommended_days"],
            flight_in = FlightInfo(
                from_code = current_code,
                to_code = best["airport_code"],
                price = flight_cost,
                departure = best["departure"],
                arrival = best["arrival"],
                duration_min = best["duration_min"],
            ),
            top_hotels = top_hotels,
            top_pois = top_pois,
        ))

        visited_countries.add(best["country"])
        visited_cities.add(best["city"])
        budget_remaining -= total_cost
        total_flight_cost += flight_cost
        total_stay_cost += stay_cost
        days_remaining -= days_here
        current_day += days_here
        current_code = best["airport_code"]

    return stops, warnings, total_flight_cost, total_stay_cost, budget_remaining, current_code

def build_variant(
    svc: Neo4jService,
    origin: dict,
    candidates: list[dict],
    budget:float,
    days_total: int,
    max_cities: int,
    weight: float,
    variant_id: str,
    label: str,
    description: str,
) -> TripVariant | None:

    stops, warnings, flight_cost, stay_cost, budget_remaining, last_code = run_greedy(
        svc, origin, candidates, budget, days_total, max_cities, weight
    )
    if not stops:
        return None
    return_flight_obj: FlightInfo | None = None
    if last_code != origin["code"]:
        rf = find_return_flight(svc, last_code, origin["code"])
        if rf:
            price = rf["price"]
            if price <= budget_remaining:
                return_flight_obj = FlightInfo(
                    from_code = last_code,
                    to_code =origin["code"],
                    price=price,
                    departure =rf["departure"],
                    arrival= rf["arrival"],
                    duration_min=rf["duration_min"],
                )
                flight_cost += price
                budget_remaining -= price
            else:
                warnings.append(
                    f"Brak budżetu na lot powrotny z {last_code} → {origin['code']} "
                    f"(najtańszy: {price:.0f} EUR, dostępne: {budget_remaining:.0f} EUR)."
                )
        else:
            warnings.append( f"Nie znaleziono lotu powrotnego z {last_code} → {origin['code']}." )

    budget_used = budget - budget_remaining

    return TripVariant(
        variant=variant_id,
        label= label,
        description= description,
        origin_city = origin["city"],
        origin_code =origin["code"],
        origin_lat = origin["lat"],
        origin_lon = origin["lon"],
        total_days = days_total,
        budget_total = budget,
        budget_used= round(budget_used, 2),
        budget_remaining=round(budget_remaining, 2),
        flight_cost=round(flight_cost, 2),
        stay_cost = round(stay_cost, 2),
        return_flight= return_flight_obj,
        stops = stops,
        warnings = warnings,
    )

@router.get( "/plan", response_model=TripPlanResponse, summary="Generuj warianty planu podróży (algorytm zachłanny)" )
def plan_trip(
    src: str = Query(...,  description="Kod IATA lotniska startowego, np. WAW"),
    budget: float = Query(1500, description="Całkowity budżet w EUR"),
    days: int = Query(10,   description="Łączna liczba dni"),
    max_cities: int   = Query(4,    description="Maksymalna liczba miast (1–6)"),
    max_flight_price: float = Query(300,  description="Maks. cena pojedynczego biletu (EUR)"),
):
    max_cities = max(1, min(6, max_cities))
    days = max(2, min(30, days))

    if budget < 100:
        raise HTTPException(status_code=422, detail="Budżet musi wynosić co najmniej 100 EUR.")

    svc = Neo4jService()
    try:
        origin_rows = svc.query(CYPHER_ORIGIN, {"code": src.upper()})
        if not origin_rows:
            raise HTTPException(status_code=404, detail=f"Lotnisko {src.upper()} nie istnieje w bazie.")
        origin = origin_rows[0]

        if not origin.get("lat") or not origin.get("lon"):
            raise HTTPException( status_code=404, detail=f"Lotnisko {src.upper()} nie ma współrzędnych w bazie." )

        all_candidates = svc.query(CYPHER_REACHABLE, {
            "src":src.upper(),
            "max_flight_price": max_flight_price,
        })

        if not all_candidates:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Brak dostępnych destynacji z {src.upper()} "
                    f"przy limicie biletu {max_flight_price} EUR. "
                    "Sprawdź czy uruchomiono seed_cities.py i czy istnieją relacje SERVES."
                )
            )

        variants_config = [
            (0.0, "economy", "Ekonomiczny", "Maksymalizuje liczbę miast przy minimalnych kosztach lotów."),
            (0.5, "balanced", "Zrównoważony", "Balansuje między ceną a atrakcyjnością turystyczną."),
            (1.0, "premium", "Premium", "Wybiera miasta z najwyższą atrakcyjnością niezależnie od ceny."),
        ]

        variants: list[TripVariant] = []
        for weight, vid, label, desc in variants_config:
            v = build_variant(
                svc = svc,
                origin= origin,
                candidates= all_candidates,
                budget= budget,
                days_total =  days,
                max_cities= max_cities,
                weight= weight,
                variant_id= vid,
                label = label,
                description = desc,
            )
            if v:
                variants.append(v)

        if not variants:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Nie udało się wygenerować żadnego wariantu planu. "
                    "Spróbuj zwiększyć budżet, liczbę dni lub limit ceny biletu."
                )
            )

        return TripPlanResponse(variants=variants)

    finally:
        svc.close()