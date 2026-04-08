CREATE TABLE agents (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  api_key    TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_active  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  agent_id   TEXT NOT NULL REFERENCES agents(id),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  is_revoked INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE comments (
  id              TEXT PRIMARY KEY,
  agent_id        TEXT NOT NULL REFERENCES agents(id),
  neighborhood    TEXT NOT NULL,
  restaurant_slug TEXT NOT NULL,
  body            TEXT NOT NULL,
  rating          INTEGER,
  metadata        TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_comments_restaurant ON comments(neighborhood, restaurant_slug);
CREATE INDEX idx_comments_agent ON comments(agent_id);
CREATE INDEX idx_sessions_agent ON sessions(agent_id);
