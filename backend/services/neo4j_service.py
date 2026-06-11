import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()


class Neo4jService:
    def __init__(self):
        uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = os.getenv("NEO4J_USER", "neo4j")
        password = os.getenv("NEO4J_PASSWORD", "graphtraveler123")
        self._driver = GraphDatabase.driver(uri, auth=(user, password))

    def verify_connectivity(self):
        self._driver.verify_connectivity()

    def close(self):
        self._driver.close()

    def query(self, cypher: str, parameters: dict = None) -> list[dict]:
        parameters = parameters or {}
        with self._driver.session() as session:
            result = session.run(cypher, parameters)
            return [record.data() for record in result]

    def run(self, cypher: str, parameters: dict = None) -> None:
        parameters = parameters or {}
        with self._driver.session() as session:
            session.run(cypher, parameters)
