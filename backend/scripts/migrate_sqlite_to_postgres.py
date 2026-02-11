import os
import sqlite3
from pathlib import Path

from sqlalchemy import create_engine, text


def main():
    sqlite_path = os.getenv("SQLITE_PATH")
    postgres_url = os.getenv("DATABASE_URL")

    if not sqlite_path:
        default_path = Path(__file__).resolve().parents[1] / "instance" / "league_data.db"
        sqlite_path = str(default_path)

    if not postgres_url:
        raise SystemExit("DATABASE_URL is required for Postgres destination")

    if postgres_url.startswith("postgres://"):
        postgres_url = postgres_url.replace("postgres://", "postgresql://", 1)

    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    pg_engine = create_engine(postgres_url)

    with sqlite_conn:
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]

    # Order matters due to FK references.
    preferred = [
        "league_chain",
        "league_info",
        "local_players",
        "contract",
        "amnesty_player",
        "rfa_players",
        "extension_players",
        "amnesty_team",
        "rfa_teams",
        "extension_team",
        "commissioner_action_log",
        "player_images",
        "sleeper_api_cache",
        "sleeper_league",
        "sleeper_rosters",
        "sleeper_users",
        "sleeper_drafts",
        "sleeper_draft_picks",
        "sleeper_transactions",
    ]
    tables_sorted = [t for t in preferred if t in tables] + [
        t for t in tables if t not in preferred
    ]

    with pg_engine.begin() as pg_conn:
        for table in tables_sorted:
            rows = sqlite_conn.execute(f"SELECT * FROM {table}").fetchall()
            if not rows:
                continue

            columns = rows[0].keys()
            col_list = ", ".join(columns)
            placeholders = ", ".join([f":{c}" for c in columns])

            pg_conn.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE"))
            pg_conn.execute(
                text(f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})"),
                [dict(row) for row in rows],
            )

            print(f"Copied {len(rows)} rows into {table}")

    print("Migration complete.")


if __name__ == "__main__":
    main()
