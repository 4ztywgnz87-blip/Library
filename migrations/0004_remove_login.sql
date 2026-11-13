-- Snug has no login for now (one reader); remove the login tables
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS login_tokens;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS login_attempts;
