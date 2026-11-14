-- Every book Snug has analysed once (tropes, heat, pace, …), reused forever
CREATE TABLE book_profiles (
  key TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
