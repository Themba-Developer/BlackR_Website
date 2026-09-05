CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('school', 'parent')),
  reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewing', 'approved', 'rejected')),
  data_json TEXT NOT NULL CHECK (length(data_json) <= 100000),
  search_text TEXT NOT NULL CHECK (length(search_text) <= 2000),
  submitted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  admin_notes TEXT CHECK (admin_notes IS NULL OR length(admin_notes) <= 5000),
  reviewed_by TEXT
);

CREATE INDEX IF NOT EXISTS submissions_type_submitted_idx
  ON submissions (type, submitted_at DESC);
CREATE INDEX IF NOT EXISTS submissions_type_status_idx
  ON submissions (type, status);

CREATE TABLE IF NOT EXISTS submission_review_events (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('new', 'reviewing', 'approved', 'rejected')),
  admin_notes TEXT CHECK (admin_notes IS NULL OR length(admin_notes) <= 5000),
  reviewed_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS review_events_submission_idx
  ON submission_review_events (submission_id, created_at DESC);

CREATE TABLE IF NOT EXISTS submission_rate_limits (
  ip_hash TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL,
  window_started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
