# GraphTraveler



## Stack technologiczny

| Warstwa | Technologia |
|---|---|
| Baza danych | Neo4j |
| Backend | FastAPI (Python 3.11) |
| Frontend | React |
| Konteneryzacja | Docker Compose |

## Uruchomienie

```bash
# 1. Sklonuj repo
git clone <repo-url>

# 2. Skopiuj plik środowiskowy
cp .env.example .env

# 3. Uruchom wszystkie serwisy
docker compose up --build

# 4. Zaimportuj dane
docker compose exec api python scripts/import_airports.py
```

## Adresy

| Serwis | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| Neo4j Browser | http://localhost:7474 |

## Funkcjonalności


## Struktura projektu

```
graphtraveler/
├── docker-compose.yml
├── .env.example
├── neo4j/
│   ├── init/            # skrypty Cypher uruchamiane przy starcie Neo4j
│   └── queries/         # zapytania Cypher dla każdej funkcjonalności
├── backend/
│   ├── main.py          # FastAPI app
│   ├── routers/         # endpointy REST
│   ├── services/        # warstwa Neo4j (sesje, zapytania)
│   └── scripts/         # ETL: import danych
└── frontend/
    └── src/
        ├── components/  # MapView
        ├── pages/       # widoki aplikacji
        └── api/         # klienci HTTP
```
