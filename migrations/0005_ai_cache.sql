-- Remembers AI answers, so asking the same thing twice only costs once
CREATE TABLE ai_cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
