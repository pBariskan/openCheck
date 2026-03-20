import sqlite3
import os
from datetime import datetime

# Place the DB file next to server.py, in the server/ directory
DB_PATH = os.path.join(os.path.dirname(__file__), "grammarly_data.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Allows dict-like row access
    return conn


def init_db():
    """Create tables on first startup if they don't exist."""
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS profiles (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT NOT NULL UNIQUE,
                default_mode TEXT NOT NULL DEFAULT 'grammar',
                created_at  TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS stats (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id          INTEGER NOT NULL,
                words_written       INTEGER NOT NULL DEFAULT 0,
                corrections_made    INTEGER NOT NULL DEFAULT 0,
                mode                TEXT NOT NULL DEFAULT 'grammar',
                created_at          TEXT NOT NULL,
                FOREIGN KEY (profile_id) REFERENCES profiles(id)
            )
        """)
        conn.commit()


# ─────────────── Profile CRUD ───────────────

def create_profile(name: str, default_mode: str = "grammar") -> dict:
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO profiles (name, default_mode, created_at) VALUES (?, ?, ?)",
            (name.strip(), default_mode, datetime.utcnow().isoformat())
        )
        conn.commit()
        profile_id = cursor.lastrowid
    return get_profile(profile_id)


def get_profile(profile_id: int) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM profiles WHERE id = ?", (profile_id,)
        ).fetchone()
    return dict(row) if row else None


def list_profiles() -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM profiles ORDER BY created_at ASC"
        ).fetchall()
    return [dict(r) for r in rows]


def update_profile_mode(profile_id: int, default_mode: str):
    with get_connection() as conn:
        conn.execute(
            "UPDATE profiles SET default_mode = ? WHERE id = ?",
            (default_mode, profile_id)
        )
        conn.commit()


def delete_profile(profile_id: int):
    with get_connection() as conn:
        conn.execute("DELETE FROM stats WHERE profile_id = ?", (profile_id,))
        conn.execute("DELETE FROM profiles WHERE id = ?", (profile_id,))
        conn.commit()


# ─────────────── Stats ───────────────

def record_stat(profile_id: int, words_written: int, corrections_made: int, mode: str):
    """Called after each improvement to log a stat entry."""
    with get_connection() as conn:
        conn.execute(
            """INSERT INTO stats (profile_id, words_written, corrections_made, mode, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (profile_id, words_written, corrections_made, mode, datetime.utcnow().isoformat())
        )
        conn.commit()


def get_stats_for_profile(profile_id: int) -> dict:
    """
    Returns aggregated lifetime stats for a profile, plus a daily breakdown
    for the last 7 days so the frontend can render a sparkline.
    """
    with get_connection() as conn:
        # Lifetime totals
        totals = conn.execute("""
            SELECT
                COUNT(*)                    AS sessions,
                COALESCE(SUM(words_written), 0)     AS total_words,
                COALESCE(SUM(corrections_made), 0)  AS total_corrections
            FROM stats
            WHERE profile_id = ?
        """, (profile_id,)).fetchone()

        # Last 7 day breakdown (grouping by date prefix of created_at)
        daily = conn.execute("""
            SELECT
                SUBSTR(created_at, 1, 10) AS day,
                SUM(words_written)         AS words,
                SUM(corrections_made)      AS corrections
            FROM stats
            WHERE profile_id = ?
            GROUP BY day
            ORDER BY day DESC
            LIMIT 7
        """, (profile_id,)).fetchall()

    total_words = totals["total_words"]
    total_corrections = totals["total_corrections"]

    # Improvement rate: what percentage of words were touched by a correction
    improvement_rate = 0.0
    if total_words > 0:
        improvement_rate = round(min((total_corrections / total_words) * 100, 100), 1)

    return {
        "profile_id": profile_id,
        "sessions": totals["sessions"],
        "total_words": total_words,
        "total_corrections": total_corrections,
        "improvement_rate": improvement_rate,
        "daily": [dict(d) for d in reversed(daily)],  # oldest-first for charts
    }
