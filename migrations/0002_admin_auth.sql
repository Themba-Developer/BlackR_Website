CREATE TABLE IF NOT EXISTS admin_login_rate_limits (
  ip_hash TEXT PRIMARY KEY,
  failed_attempts INTEGER NOT NULL,
  window_started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
