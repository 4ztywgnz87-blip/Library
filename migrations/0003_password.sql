-- Library password (stored as a salted PBKDF2 hash) and login attempt throttling
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE login_attempts (
  ip TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX login_attempts_ip ON login_attempts (ip, ts);
