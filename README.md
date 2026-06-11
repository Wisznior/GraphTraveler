# GraphTraveler — Multimodalny Asystent Podróży

Aplikacja webowa SPA do planowania podróży z wykorzystaniem grafowej bazy danych **Neo4j**.
Projekt zaliczeniowy — Grafowe Bazy Danych.

## Stack technologiczny

| Warstwa        | Technologia                          |
|----------------|--------------------------------------|
| Baza danych    | Neo4j 5 + APOC + Graph Data Science  |
| Backend        | FastAPI (Python 3.11)                |
| Driver Neo4j   | neo4j (oficjalny Python driver)      |
| Frontend       | React 18 + Vite                      |
| Mapa           | React-Leaflet + OpenStreetMap        |
| Konteneryzacja | Docker Compose                       |

## Funkcjonalności

### 1. Połączenia lotnicze
- Wyszukiwanie lotów bezpośrednich i z przesiadką między lotniskami europejskimi
- 651 lotnisk, ~25 000 połączeń z realistycznym modelem cenowym

### 2. Analiza sieci (GDS)
- **Betweenness Centrality** — ranking hubów lotniczych z filtrami regionalnymi
- **Dijkstra Shortest Path** — optymalna trasa wg ceny / dystansu / czasu

### 3. Trip Planner
- Algorytm zachłanny (Greedy Orienteering) — maksymalizuje atrakcyjność przy ograniczeniu budżetu i czasu
- 3 warianty: Ekonomiczny / Zrównoważony / Premium

## Uruchomienie

### Wymagania
- Docker Desktop (z WSL2 na Windows)
- 4 GB RAM dostępne dla Dockera (Neo4j + GDS)

### Pierwsze uruchomienie

```bash
# 1. Sklonuj repozytorium
git clone https://github.com/Wisznior/GraphTraveler && cd graphtraveler

# 2. Skopiuj plik środowiskowy
cp .env.example .env

# 3. Uruchom kontenery (pierwsze uruchomienie ~3-5 min — Neo4j pobiera pluginy GDS)
docker compose up --build

# 4. Import danych lotniczych (w nowym terminalu, po starcie wszystkich kontenerów)
docker compose exec api python scripts/import_airports.py

# 5. Seed danych miast (appeal, koszty pobytu)
docker compose exec api python scripts/seed_citties.py

# 6. Utwórz relacje Airport→City (wymagane dla Trip Plannera)
docker compose exec neo4j cypher-shell \
  -u neo4j -p graphtraveler123 \
  "MATCH (a:Airport), (c:City) WHERE a.city_name = c.name MERGE (a)-[:SERVES]->(c)"
```

### Kolejne uruchomienia (dane są zachowane w wolumenie)

```bash
docker compose up
```

### Czyszczenie danych (reset)

```bash
docker compose down -v   # usuwa wolumen Neo4j — dane zostaną utracone
docker compose up --build
# powtórz kroki 4-6
```

## Adresy

| Serwis       | URL                          |
|--------------|------------------------------|
| Frontend     | http://localhost:3000        |
| API          | http://localhost:8000        |
| Swagger UI   | http://localhost:8000/docs   |
| Neo4j Browser| http://localhost:7474        |

## Struktura projektu
```
graphtraveler/
├── docker-compose.yml
├── .env.example
├── neo4j/
│   └── init/
│       └── 01_constraints.cypher    # indeksy i ograniczenia
├── backend/
│   ├── main.py                      # FastAPI app
│   ├── requirements.txt
│   ├── routers/
│   │   ├── routes.py                # /api/routes — lotniska, loty
│   │   ├── analytics.py             # /api/analytics — GDS (Betweenness, Dijkstra)
│   │   └── trips.py                 # /api/trips — Trip Planner
│   ├── services/
│   │   └── neo4j_service.py         # Neo4j driver wrapper
│   └── scripts/
│       ├── import_airports.py       # ETL: OpenFlights → Neo4j
│       └── seed_citties.py          # Seed: appeal i koszty miast
└── frontend/
└── src/
├── components/
│   └── MapView.jsx           # React-Leaflet
├── pages/
│   ├── FlightsPage.jsx       # Połączenia lotnicze
│   ├── AnalyticsPage.jsx     # Analiza sieci
│   └── TripPlannerPage.jsx   # Trip Planner
└── api/
└── client.js            # fetch wrappers
```

## Model danych (Graf Neo4j)

### Węzły
| Label   | Właściwości kluczowe                                      |
|---------|-----------------------------------------------------------|
| Airport | code (IATA), name, city_name, country, lat, lon           |
| City    | name, country, lat, lon, appeal, cost_per_day, recommended_days |

### Relacje
| Relacja    | Skąd → Dokąd      | Właściwości                              |
|------------|-------------------|------------------------------------------|
| FLIGHT_TO  | Airport → Airport | price, dist_km, duration_min, departure, arrival |
| SERVES     | Airport → City    | (brak)                                   |