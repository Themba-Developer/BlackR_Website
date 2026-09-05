CREATE TABLE IF NOT EXISTS admin_credentials (
  email TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  password_set_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_password_setup_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_password_setup_tokens_expiry_idx
  ON admin_password_setup_tokens (expires_at, used_at);
