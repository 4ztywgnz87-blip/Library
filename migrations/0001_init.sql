-- Synced records (books, profile, ...). Data is stored as JSON.
CREATE TABLE records (
  owner TEXT NOT NULL,           -- email of the reader: everyone has their own library
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL,   -- client edit time (last write wins)
  server_ts INTEGER NOT NULL,    -- when the server stored it (for pulling changes)
  deleted INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (owner, kind, id)
);
CREATE INDEX records_owner_ts ON records (owner, server_ts);

CREATE TABLE login_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- Counts AI calls per day to protect the prepaid credit
CREATE TABLE ai_usage (
  day TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);
