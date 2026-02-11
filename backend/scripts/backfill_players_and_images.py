#!/usr/bin/env python
import argparse
import base64
import time
from typing import Dict, Any

import requests

from backend.app import create_app
from backend.extensions import db
from backend.models import LocalPlayer, PlayerImage
from backend.sleeper_service import sleeper_service


def _safe_int(value) -> int | None:
    try:
        return int(value)
    except Exception:
        return None


def backfill_players(players_data: Dict[str, Any], dry_run: bool = False, batch_size: int = 500) -> int:
    existing_ids = {pid for (pid,) in db.session.query(LocalPlayer.player_id).all()}
    added = 0
    updated = 0
    pending = 0

    for player_id, data in players_data.items():
        pid = _safe_int(player_id)
        if pid is None or not isinstance(data, dict):
            continue

        first_name = data.get("first_name") or "Unknown"
        last_name = data.get("last_name") or "Unknown"
        position = data.get("position") or "N/A"

        if pid in existing_ids:
            player = LocalPlayer.query.filter_by(player_id=pid).first()
            if player:
                player.first_name = first_name
                player.last_name = last_name
                player.position = position
                db.session.add(player)
                updated += 1
        else:
            db.session.add(LocalPlayer(
                player_id=pid,
                first_name=first_name,
                last_name=last_name,
                position=position
            ))
            existing_ids.add(pid)
            added += 1

        pending += 1
        if pending >= batch_size:
            if not dry_run:
                db.session.commit()
            pending = 0

    if pending and not dry_run:
        db.session.commit()

    return added + updated


def backfill_images(
    player_ids,
    dry_run: bool = False,
    sleep_ms: int = 50,
    limit: int | None = None,
    start: int = 0,
    batch_size: int = 50
) -> int:
    existing_ids = {pid for (pid,) in db.session.query(PlayerImage.player_id).all()}
    stored = 0
    pending = 0
    processed = 0

    sliced = player_ids[start:]
    if limit:
        sliced = sliced[:limit]

    for pid in sliced:
        processed += 1
        if pid in existing_ids:
            continue

        url = f"https://sleepercdn.com/content/nfl/players/{pid}.jpg"
        try:
            resp = requests.get(url, timeout=10)
        except Exception:
            continue

        if resp.status_code != 200 or not resp.content:
            continue

        content_type = (resp.headers.get("Content-Type") or "image/jpeg").split(";")[0].strip()
        encoded = base64.b64encode(resp.content).decode("ascii")

        if not dry_run:
            db.session.add(PlayerImage(
                player_id=int(pid),
                image_base64=encoded,
                content_type=content_type
            ))
        stored += 1
        pending += 1

        if pending >= batch_size:
            if not dry_run:
                db.session.commit()
            pending = 0

        if sleep_ms:
            time.sleep(max(0, sleep_ms) / 1000.0)

    if pending and not dry_run:
        db.session.commit()

    return stored


def main():
    parser = argparse.ArgumentParser(description="Backfill Sleeper players + images into the local database.")
    parser.add_argument("--skip-players", action="store_true", help="Skip backfilling players.")
    parser.add_argument("--skip-images", action="store_true", help="Skip backfilling images.")
    parser.add_argument("--sleep-ms", type=int, default=50, help="Sleep between image requests.")
    parser.add_argument("--limit", type=int, default=None, help="Limit image downloads.")
    parser.add_argument("--start", type=int, default=0, help="Start index for image downloads.")
    parser.add_argument("--dry-run", action="store_true", help="Do not write to the database.")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        players_data = sleeper_service.get_players_nfl() if not args.skip_players or not args.skip_images else {}
        if not isinstance(players_data, dict):
            players_data = {}

        if not args.skip_players:
            total = backfill_players(players_data, dry_run=args.dry_run)
            print(f"Upserted {total} players into local_players.")

        if not args.skip_images:
            player_ids = [int(pid) for pid in players_data.keys() if _safe_int(pid) is not None]
            stored = backfill_images(
                player_ids,
                dry_run=args.dry_run,
                sleep_ms=args.sleep_ms,
                limit=args.limit,
                start=args.start
            )
            print(f"Stored {stored} player images in player_images.")


if __name__ == "__main__":
    main()
