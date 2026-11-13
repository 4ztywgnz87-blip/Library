-- 6-digit login codes (for the iPhone home-screen app, where mail links open in Safari)
ALTER TABLE login_tokens ADD COLUMN code_hash TEXT;
ALTER TABLE login_tokens ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE login_tokens ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;
CREATE INDEX login_tokens_email ON login_tokens (email, expires_at);
