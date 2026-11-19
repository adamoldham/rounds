CREATE TABLE IF NOT EXISTS staff (
  name TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS stickers (
  uid TEXT PRIMARY KEY,
  location TEXT NOT NULL,
  building TEXT NOT NULL,
  last_ctr INTEGER NOT NULL DEFAULT 0,
  last_seen_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  first_seen TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS taps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  night TEXT NOT NULL,
  round INTEGER NOT NULL,
  name TEXT NOT NULL,
  uid TEXT NOT NULL,
  location TEXT NOT NULL,
  building TEXT NOT NULL,
  ctr INTEGER NOT NULL,
  ip TEXT,
  device_id TEXT,
  ua TEXT,
  UNIQUE (uid, ctr)
);

CREATE INDEX IF NOT EXISTS idx_taps_night ON taps (night, name);
