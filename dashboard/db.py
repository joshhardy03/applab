"""SQLite (WAL). Phase 1 keeps only the app list; phase 2 adds daily stats."""
import sqlite3

STATUSES = ("idea", "building", "preview", "testing", "live", "dropped")

SCHEMA = """
CREATE TABLE IF NOT EXISTS apps (
    slug       TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'idea',
    idea       TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


def connect(path):
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript(SCHEMA)
    return conn
