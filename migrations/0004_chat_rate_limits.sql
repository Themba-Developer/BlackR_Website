CREATE TABLE IF NOT EXISTS chat_rate_limits (
  ip_hash TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL,
  window_started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
