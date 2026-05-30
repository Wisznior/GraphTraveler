// ── Constraints ──────────────────────────────────────────────────────────────
CREATE CONSTRAINT city_name_unique IF NOT EXISTS
  FOR (c:City) REQUIRE c.name IS UNIQUE;

CREATE CONSTRAINT airport_code_unique IF NOT EXISTS
  FOR (a:Airport) REQUIRE a.code IS UNIQUE;

CREATE CONSTRAINT hotel_name_unique IF NOT EXISTS
  FOR (h:Hotel) REQUIRE h.name IS UNIQUE;

CREATE CONSTRAINT poi_name_unique IF NOT EXISTS
  FOR (p:POI) REQUIRE p.name IS UNIQUE;

// ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX city_country IF NOT EXISTS FOR (c:City) ON (c.country);
CREATE INDEX city_unesco  IF NOT EXISTS FOR (c:City) ON (c.is_unesco);
CREATE INDEX hotel_stars  IF NOT EXISTS FOR (h:Hotel) ON (h.stars);
CREATE INDEX hotel_city   IF NOT EXISTS FOR (h:Hotel) ON (h.city);
CREATE INDEX poi_category IF NOT EXISTS FOR (p:POI)   ON (p.category);
CREATE INDEX poi_city     IF NOT EXISTS FOR (p:POI)   ON (p.city);
CREATE INDEX airport_city IF NOT EXISTS FOR (a:Airport) ON (a.city_name);
