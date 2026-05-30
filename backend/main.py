from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import routes, analytics
from services.neo4j_service import Neo4jService

app = FastAPI(
    title="GraphTraveler API",
    description="Multimodalny Asystent Podróży – Neo4j + FastAPI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router,    prefix="/api/routes",    tags=["Routes"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "GraphTraveler API is running"}


@app.get("/health", tags=["Health"])
def health():
    svc = Neo4jService()
    try:
        svc.verify_connectivity()
        return {"status": "ok", "neo4j": "connected"}
    except Exception as e:
        return {"status": "error", "neo4j": str(e)}
    finally:
        svc.close()
