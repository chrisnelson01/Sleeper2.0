import logging
import time
import base64
from datetime import datetime
import requests
from flask import Blueprint, jsonify, request, Response
from flask_cors import cross_origin
from typing import Dict, List, Tuple

from .sleeper_service import sleeper_service
from .roster_service import RosterService
from .utils import (
    get_rosters_response,
    get_all_contracts_in_chain,
    get_all_amnestied_players_in_chain,
    get_league_info,
    get_league_chain_ids,
)
from .models import (
    Contract, LocalPlayer, AmnestyPlayer, RfaPlayer, 
    ExtensionPlayer, AmnestyTeam, RfaTeam, ExtensionTeam, PlayerImage, LeagueInfo
)
from .extensions import db

api = Blueprint("api", __name__, url_prefix="/api/v1")
logger = logging.getLogger(__name__)

@api.errorhandler(Exception)
def handle_error(error):
    """Global error handler"""
    logger.error(f"API Error: {str(error)}")
    return jsonify({
        "status": "error",
        "message": str(error),
        "data": None
    }), 500

@api.route('/rosters/<league_id>/<user_id>', methods=['GET'])
@cross_origin()
def get_rosters_data(league_id: str, user_id: str):
    """Get complete roster and league data - optimized for speed"""
    try:
        # Basic validation
        if not league_id or not user_id:
            return jsonify({"status": "error", "message": "Both league_id and user_id are required", "data": None}), 400

        # Delegate orchestration to utils.get_rosters_response
        response_data = get_rosters_response(league_id, user_id)

        if not isinstance(response_data, dict):
            response_data = {}

        return jsonify({"status": "success", "data": response_data}), 200
    except Exception as e:
        logger.exception(f"Unhandled error in get_rosters_data: {str(e)}")
        return jsonify({"status": "error", "message": str(e), "data": None}), 500





@api.route('/rosters/league/<league_id>', methods=['GET'])
@cross_origin()
def get_all_league_rosters(league_id: str):
    """Return processed rosters for an entire league (all teams)."""
    try:
        response_data = get_rosters_response(league_id, '')
        current_season = response_data.get('current_season') if isinstance(response_data, dict) else None
        return jsonify({
            "status": "success",
            "data": {
                "team_info": response_data.get('team_info', []) if isinstance(response_data, dict) else [],
                "league_info": response_data.get('league_info', {}) if isinstance(response_data, dict) else {},
                "current_season": current_season
            }
        }), 200
    except Exception as e:
        logger.error(f"Error in get_all_league_rosters: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": None
        }), 500


@api.route('/rosters/league/<league_id>/user/<user_id>', methods=['GET'])
@cross_origin()
def get_selected_roster(league_id: str, user_id: str):
    """Return only the processed roster for the selected user in a league."""
    try:
        response_data = get_rosters_response(league_id, user_id)
        current_season = response_data.get('current_season') if isinstance(response_data, dict) else None
        team = None
        for t in response_data.get('team_info', []):
            if t.get('owner_id') == user_id:
                team = t
                break

        return jsonify({
            "status": "success",
            "data": {
                "team": team,
                "league_info": response_data.get('league_info', {}),
                "current_season": current_season
            }
        }), 200
    except Exception as e:
        logger.error(f"Error in get_selected_roster: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": None
        }), 500

@api.route('/contracts/<league_id>', methods=['GET'])
@cross_origin()
def get_contracts(league_id: str):
    """Get league contracts"""
    contracts = Contract.query.filter_by(league_id=int(league_id)).all()
    data = [{
        'league_id': c.league_id,
        'player_id': c.player_id,
        'team_id': c.team_id,
        'contract_length': c.contract_length,
        'season': c.season
    } for c in contracts]
    
    return jsonify({
        "status": "success",
        "data": data
    }), 200

@api.route('/contracts', methods=['POST'])
@cross_origin()
def add_contract():
    """Add a new contract for a player if no active contract exists."""
    try:
        payload = request.get_json() or {}
        league_id = payload.get('league_id')
        player_id = payload.get('player_id')
        contract_length = payload.get('contract_length')
        contract_amount_payload = payload.get('contract_amount')

        if not league_id or not player_id or not contract_length:
            return jsonify({
                "status": "error",
                "message": "league_id, player_id, and contract_length are required",
                "data": None
            }), 400

        league_id = int(league_id)
        player_id = int(player_id)
        contract_length = int(contract_length)

        nfl_state = sleeper_service.get_current_nfl_state() or {}
        current_season = int(nfl_state.get('league_season', 2026))

        # Ensure no active contract exists in the league chain
        all_contracts = get_all_contracts_in_chain(league_id, current_season)
        amnestied = get_all_amnestied_players_in_chain(league_id)
        amnestied_contract_ids = {a['contract_id'] for a in amnestied}

        for contract in all_contracts:
            if int(contract['player_id']) != player_id:
                continue
            contract_id = contract['id']
            if contract_id in amnestied_contract_ids:
                continue
            if contract.get('is_expired'):
                continue
            return jsonify({
                "status": "error",
                "message": "Active contract already exists for this player",
                "data": None
            }), 409

        league_chain_ids = get_league_chain_ids(league_id)
        current_league_id = league_chain_ids[0] if league_chain_ids else league_id

        rosters = sleeper_service.get_rosters(current_league_id) or []
        team_id = None
        for roster in rosters:
            if str(player_id) in [str(pid) for pid in roster.get('players', [])]:
                team_id = roster.get('roster_id')
                break

        # Compute current salary from draft/transaction cost map
        drafts = sleeper_service.get_drafts(current_league_id)
        draft_picks_data = {}
        if drafts and isinstance(drafts, list):
            for draft in drafts:
                draft_id = draft.get('draft_id')
                if draft_id:
                    draft_picks_data[draft_id] = sleeper_service.get_draft_picks(draft_id)

        transactions = []
        for round_num in range(18):
            tx = sleeper_service.get_transactions(current_league_id, round_num) or []
            transactions.extend(tx)

        contract_amount = 0
        if contract_amount_payload not in (None, ""):
            try:
                contract_amount = int(contract_amount_payload)
            except Exception:
                contract_amount = 0
        if contract_amount <= 0:
            try:
                from .roster_service import RosterService
                cache_key = f"{current_league_id}:{','.join([str(x) for x in league_chain_ids])}"
                cost_map = RosterService.build_cost_map(
                    draft_picks_data,
                    transactions,
                    cache_key=cache_key
                )
                contract_amount = int(cost_map.get(str(player_id), 0))
            except Exception as e:
                logger.warning(f"Failed to build cost map for contract amount: {str(e)}")

        new_contract = Contract(
            league_id=league_id,
            player_id=player_id,
            team_id=team_id,
            contract_amount=contract_amount,
            contract_length=contract_length,
            season=current_season
        )
        db.session.add(new_contract)
        db.session.commit()

        return jsonify({
            "status": "success",
            "data": {
                "id": new_contract.id,
                "league_id": new_contract.league_id,
                "player_id": new_contract.player_id,
                "team_id": new_contract.team_id,
                "contract_amount": new_contract.contract_amount,
                "contract_length": new_contract.contract_length,
                "season": new_contract.season
            }
        }), 201
    except Exception as e:
        logger.error(f"Error adding contract: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": None
        }), 500

@api.route('/activity/<league_id>', methods=['GET'])
@cross_origin()
def get_league_activity(league_id: str):
    """Return a combined activity feed for a league."""
    try:
        offset = int(request.args.get('offset', 0))
        limit = int(request.args.get('limit', 20))
        rounds = int(request.args.get('rounds', 18))

        # Resolve team names for transactions
        rosters = sleeper_service.get_rosters(league_id) or []
        users = sleeper_service.get_users(league_id) or []
        users_map = {u.get('user_id'): u for u in users if isinstance(u, dict)}
        roster_owner_map = {
            r.get('roster_id'): r.get('owner_id')
            for r in rosters
            if isinstance(r, dict)
        }
        team_name_map = {}
        owner_name_map = {}
        for roster_id, owner_id in roster_owner_map.items():
            user = users_map.get(owner_id) or {}
            display_name = user.get('display_name') or user.get('username')
            if display_name:
                team_name_map[str(roster_id)] = display_name
                owner_name_map[str(owner_id)] = display_name

        # Build player name lookups (local db + Sleeper)
        try:
            from .roster_service import RosterService
            players_map = RosterService.build_players_map(str(league_id))
        except Exception:
            players_map = {}

        transactions = []
        for round_num in range(rounds):
            tx = sleeper_service.get_transactions(league_id, round_num) or []
            transactions.extend(tx)

        # Local contract-related events (no timestamps available, use season as proxy)
        contracts = Contract.query.filter_by(league_id=int(league_id)).all()
        amnesties = AmnestyPlayer.query.filter_by(league_id=int(league_id)).all()
        rfas = RfaPlayer.query.filter_by(league_id=int(league_id)).all()
        extensions = ExtensionPlayer.query.filter_by(league_id=int(league_id)).all()
        contracts_by_id = {c.id: c for c in contracts}

        local_player_ids = set()
        for c in contracts:
            local_player_ids.add(str(c.player_id))
        for a in amnesties:
            local_player_ids.add(str(a.player_id))
        for r in rfas:
            local_player_ids.add(str(r.player_id))
        for e in extensions:
            local_player_ids.add(str(e.player_id))

        players_db = LocalPlayer.query.filter(LocalPlayer.player_id.in_(list(local_player_ids))).all() if local_player_ids else []
        local_players_map = {str(p.player_id): p for p in players_db}

        def _player_name(pid: str) -> str:
            player = local_players_map.get(str(pid))
            if player:
                first = player.first_name or ""
                last = player.last_name or ""
                return f"{first} {last}".strip()
            sleeper_player = players_map.get(str(pid))
            if sleeper_player:
                first = sleeper_player.first_name or ""
                last = sleeper_player.last_name or ""
                return f"{first} {last}".strip()
            return f"Player {pid}"

        def _player_position(pid: str) -> str:
            player = local_players_map.get(str(pid))
            if player and player.position:
                return player.position
            sleeper_player = players_map.get(str(pid))
            if sleeper_player and sleeper_player.position:
                return sleeper_player.position
            return "N/A"

        def _extract_player_ids(raw) -> List[str]:
            if isinstance(raw, dict):
                return [str(pid) for pid in raw.keys()]
            if isinstance(raw, list):
                return [str(pid) for pid in raw]
            return []

        def _player_details(raw) -> List[Dict]:
            details = []
            for pid in _extract_player_ids(raw):
                details.append({
                    "player_id": pid,
                    "name": _player_name(pid),
                    "position": _player_position(pid)
                })
            return details

        def _created_ts(created_at, season: int):
            if isinstance(created_at, datetime):
                return int(created_at.timestamp() * 1000)
            try:
                return int(season) * 1000000
            except Exception:
                return 0

        local_events = []
        for c in contracts:
            local_events.append({
                "type": "contract",
                "player_id": c.player_id,
                "team_id": c.team_id,
                "contract_id": c.id,
                "contract_amount": c.contract_amount,
                "contract_length": c.contract_length,
                "season": c.season,
                "created": _created_ts(c.created_at, c.season),
                "label": f"Contract added: {_player_name(c.player_id)} ({c.contract_length}y)"
            })
        for a in amnesties:
            contract = contracts_by_id.get(a.contract_id)
            local_events.append({
                "type": "amnesty",
                "player_id": a.player_id,
                "team_id": a.team_id,
                "contract_id": a.contract_id,
                "contract_amount": getattr(contract, "contract_amount", None),
                "contract_length": getattr(contract, "contract_length", None),
                "season": a.season,
                "created": _created_ts(a.created_at, a.season),
                "label": f"Amnesty used: {_player_name(a.player_id)}"
            })
        for r in rfas:
            contract = contracts_by_id.get(r.contract_id)
            local_events.append({
                "type": "rfa",
                "player_id": r.player_id,
                "team_id": r.team_id,
                "contract_id": r.contract_id,
                "contract_amount": getattr(contract, "contract_amount", None),
                "contract_length": r.contract_length,
                "season": r.season,
                "created": _created_ts(r.created_at, r.season),
                "label": f"RFA tagged: {_player_name(r.player_id)} ({r.contract_length}y)"
            })
        for e in extensions:
            contract = contracts_by_id.get(e.contract_id)
            local_events.append({
                "type": "extension",
                "player_id": e.player_id,
                "team_id": e.team_id,
                "contract_id": e.contract_id,
                "contract_amount": getattr(contract, "contract_amount", None),
                "contract_length": e.contract_length,
                "season": e.season,
                "created": _created_ts(e.created_at, e.season),
                "label": f"Extension added: {_player_name(e.player_id)} ({e.contract_length}y)"
            })

        def _tx_sort_key(tx):
            return tx.get('created') or tx.get('status_updated') or 0

        combined = []
        # Enrich transactions with player and team info
        for tx in transactions:
            if not isinstance(tx, dict):
                continue
            roster_id = tx.get('roster_id') or tx.get('team_id')
            roster_ids = tx.get('roster_ids') if isinstance(tx.get('roster_ids'), list) else []
            creator_id = tx.get('creator') or tx.get('creator_id')

            tx_team_name = None
            if roster_id is not None:
                tx_team_name = team_name_map.get(str(roster_id))
            if not tx_team_name and roster_ids:
                tx_team_name = team_name_map.get(str(roster_ids[0]))
            if not tx_team_name and creator_id:
                tx_team_name = owner_name_map.get(str(creator_id))

            resolved_team_id = roster_id if roster_id is not None else (roster_ids[0] if roster_ids else None)
            combined.append({
                "source": "transaction",
                **tx,
                "team_id": resolved_team_id,
                "team_name": tx_team_name,
                "adds_detail": _player_details(tx.get('adds')),
                "drops_detail": _player_details(tx.get('drops')),
            })
        combined.extend([{"source": "local", **evt} for evt in local_events])

        # Attach team name to local events if possible
        for evt in combined:
            if evt.get("source") == "local":
                team_id = evt.get("team_id")
                if team_id is not None and not evt.get("team_name"):
                    evt["team_name"] = team_name_map.get(str(team_id))

        combined_sorted = sorted(combined, key=_tx_sort_key, reverse=True)
        sliced = combined_sorted[offset:offset + limit]

        return jsonify({
            "status": "success",
            "data": {
                "items": sliced,
                "total": len(combined_sorted)
            }
        }), 200
    except Exception as e:
        logger.error(f"Error in get_league_activity: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": None
        }), 500

@api.route('/amnesty', methods=['POST'])
@cross_origin()
def add_amnesty():
    """Use an amnesty on a player if available and contract exists."""
    try:
        payload = request.get_json() or {}
        league_id = payload.get("league_id")
        player_id = payload.get("player_id")
        team_id = payload.get("team_id")

        if not league_id or not player_id or not team_id:
            return jsonify({
                "status": "error",
                "message": "league_id, player_id, and team_id are required",
                "data": None
            }), 400

        league_id = int(league_id)
        player_id = int(player_id)
        team_id = int(team_id)

        nfl_state = sleeper_service.get_current_nfl_state() or {}
        current_season = int(nfl_state.get("league_season", 2026))

        # Ensure team has amnesties remaining based on rollover window
        league_chain_ids = get_league_chain_ids(league_id)
        base_league_id = league_chain_ids[-1] if league_chain_ids else league_id

        league_info = get_league_info(base_league_id) or {}
        amnesty_allowed = int(league_info.get("amnesty_allowed") or 0)
        rollover_every = int(league_info.get("rollover_every") or 1)
        window_start = current_season - (max(1, rollover_every) - 1)

        used_count = (
            db.session.query(AmnestyPlayer)
            .filter(AmnestyPlayer.league_id.in_(league_chain_ids or [league_id]))
            .filter(AmnestyPlayer.team_id == team_id)
            .filter(AmnestyPlayer.season >= window_start)
            .count()
        )
        if amnesty_allowed > 0 and used_count >= amnesty_allowed:
            return jsonify({
                "status": "error",
                "message": "No amnesties remaining",
                "data": None
            }), 409

        # Find latest contract for player in chain
        contracts = (
            Contract.query.filter(Contract.player_id == player_id)
            .filter(Contract.league_id.in_(league_chain_ids or [league_id]))
            .order_by(Contract.id.desc())
            .all()
        )
        contract_id = None
        for c in contracts:
            already_amnestied = AmnestyPlayer.query.filter_by(contract_id=c.id).first()
            if already_amnestied:
                continue
            contract_id = c.id
            break

        if not contract_id:
            return jsonify({
                "status": "error",
                "message": "No active contract found for player",
                "data": None
            }), 404

        amnesty = AmnestyPlayer(
            league_id=league_id,
            player_id=player_id,
            team_id=team_id,
            contract_id=contract_id,
            season=current_season,
        )
        db.session.add(amnesty)
        db.session.commit()

        try:
            from .roster_service import RosterService
            RosterService._response_cache.clear()
            RosterService._response_cache_ts.clear()
        except Exception:
            pass

        return jsonify({
            "status": "success",
            "data": {
                "league_id": league_id,
                "player_id": player_id,
                "team_id": team_id,
                "contract_id": contract_id,
                "season": current_season,
            }
        }), 201
    except Exception as e:
        logger.error(f"Error adding amnesty: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": None
        }), 500

@api.route('/rfa', methods=['POST'])
@cross_origin()
def add_rfa():
    """Tag a player as restricted free agent if available and contract exists."""
    try:
        payload = request.get_json() or {}
        league_id = payload.get("league_id")
        player_id = payload.get("player_id")
        team_id = payload.get("team_id")

        if not league_id or not player_id or not team_id:
            return jsonify({
                "status": "error",
                "message": "league_id, player_id, and team_id are required",
                "data": None
            }), 400

        league_id = int(league_id)
        player_id = int(player_id)
        team_id = int(team_id)

        nfl_state = sleeper_service.get_current_nfl_state() or {}
        current_season = int(nfl_state.get("league_season", 2026))

        league_chain_ids = get_league_chain_ids(league_id)
        base_league_id = league_chain_ids[-1] if league_chain_ids else league_id

        league_info = get_league_info(base_league_id) or {}
        rfa_allowed = int(league_info.get("rfa_allowed") or 0)
        rollover_every = int(league_info.get("rollover_every") or 1)
        window_start = current_season - (max(1, rollover_every) - 1)

        used_count = (
            db.session.query(RfaPlayer)
            .filter(RfaPlayer.league_id.in_(league_chain_ids or [league_id]))
            .filter(RfaPlayer.team_id == team_id)
            .filter(RfaPlayer.season >= window_start)
            .count()
        )
        if rfa_allowed > 0 and used_count >= rfa_allowed:
            return jsonify({
                "status": "error",
                "message": "No RFAs remaining",
                "data": None
            }), 409

        contracts = (
            Contract.query.filter(Contract.player_id == player_id)
            .filter(Contract.league_id.in_(league_chain_ids or [league_id]))
            .order_by(Contract.id.desc())
            .all()
        )
        contract_id = None
        for c in contracts:
            already_rfa = RfaPlayer.query.filter_by(contract_id=c.id).first()
            if already_rfa:
                continue
            contract_id = c.id
            break

        if not contract_id:
            return jsonify({
                "status": "error",
                "message": "No active contract found for player",
                "data": None
            }), 404

        contract_length = int(league_info.get("rfa_length") or 1)
        rfa = RfaPlayer(
            league_id=league_id,
            player_id=player_id,
            team_id=team_id,
            contract_id=contract_id,
            contract_length=contract_length,
            season=current_season,
        )
        db.session.add(rfa)
        db.session.commit()

        try:
            from .roster_service import RosterService
            RosterService._response_cache.clear()
            RosterService._response_cache_ts.clear()
        except Exception:
            pass

        return jsonify({
            "status": "success",
            "data": {
                "league_id": league_id,
                "player_id": player_id,
                "team_id": team_id,
                "contract_id": contract_id,
                "contract_length": contract_length,
                "season": current_season,
            }
        }), 201
    except Exception as e:
        logger.error(f"Error adding RFA: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": None
        }), 500

@api.route('/extension', methods=['POST'])
@cross_origin()
def add_extension():
    """Extend a player's contract if available and contract exists."""
    try:
        payload = request.get_json() or {}
        league_id = payload.get("league_id")
        player_id = payload.get("player_id")
        team_id = payload.get("team_id")

        if not league_id or not player_id or not team_id:
            return jsonify({
                "status": "error",
                "message": "league_id, player_id, and team_id are required",
                "data": None
            }), 400

        league_id = int(league_id)
        player_id = int(player_id)
        team_id = int(team_id)

        nfl_state = sleeper_service.get_current_nfl_state() or {}
        current_season = int(nfl_state.get("league_season", 2026))

        league_chain_ids = get_league_chain_ids(league_id)
        base_league_id = league_chain_ids[-1] if league_chain_ids else league_id

        league_info = get_league_info(base_league_id) or {}
        extension_allowed = int(league_info.get("extension_allowed") or 0)
        rollover_every = int(league_info.get("rollover_every") or 1)
        window_start = current_season - (max(1, rollover_every) - 1)

        used_count = (
            db.session.query(ExtensionPlayer)
            .filter(ExtensionPlayer.league_id.in_(league_chain_ids or [league_id]))
            .filter(ExtensionPlayer.team_id == team_id)
            .filter(ExtensionPlayer.season >= window_start)
            .count()
        )
        if extension_allowed > 0 and used_count >= extension_allowed:
            return jsonify({
                "status": "error",
                "message": "No extensions remaining",
                "data": None
            }), 409

        contracts = (
            Contract.query.filter(Contract.player_id == player_id)
            .filter(Contract.league_id.in_(league_chain_ids or [league_id]))
            .order_by(Contract.id.desc())
            .all()
        )
        contract_id = None
        for c in contracts:
            already_extended = ExtensionPlayer.query.filter_by(contract_id=c.id).first()
            if already_extended:
                continue
            contract_id = c.id
            break

        if not contract_id:
            return jsonify({
                "status": "error",
                "message": "No active contract found for player",
                "data": None
            }), 404

        contract_length = int(league_info.get("extension_length") or 1)
        extension = ExtensionPlayer(
            league_id=league_id,
            player_id=player_id,
            team_id=team_id,
            contract_id=contract_id,
            contract_length=contract_length,
            season=current_season,
        )
        db.session.add(extension)
        db.session.commit()

        try:
            from .roster_service import RosterService
            RosterService._response_cache.clear()
            RosterService._response_cache_ts.clear()
        except Exception:
            pass

        return jsonify({
            "status": "success",
            "data": {
                "league_id": league_id,
                "player_id": player_id,
                "team_id": team_id,
                "contract_id": contract_id,
                "contract_length": contract_length,
                "season": current_season,
            }
        }), 201
    except Exception as e:
        logger.error(f"Error adding extension: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": None
        }), 500

@api.route('/player-image/<player_id>', methods=['GET'])
@cross_origin()
def get_player_image(player_id: str):
    """Serve cached player headshot images, with Sleeper CDN fallback."""
    try:
        if not player_id:
            return jsonify({"status": "error", "message": "player_id is required", "data": None}), 400

        try:
            player_id_int = int(player_id)
        except Exception:
            return jsonify({"status": "error", "message": "player_id must be numeric", "data": None}), 400

        cached = PlayerImage.query.filter_by(player_id=player_id_int).first()
        if cached and cached.image_base64:
            try:
                image_bytes = base64.b64decode(cached.image_base64)
                return Response(image_bytes, mimetype=cached.content_type or "image/jpeg")
            except Exception as e:
                logger.warning(f"Failed to decode cached image for {player_id}: {e}")

        # Fallback to Sleeper CDN, then store in DB
        cdn_url = f"https://sleepercdn.com/content/nfl/players/{player_id}.jpg"
        resp = requests.get(cdn_url, timeout=10)
        if resp.status_code != 200 or not resp.content:
            return jsonify({"status": "error", "message": "Image not found", "data": None}), 404

        content_type = (resp.headers.get("Content-Type") or "image/jpeg").split(";")[0].strip()
        encoded = base64.b64encode(resp.content).decode("ascii")

        try:
            if cached:
                cached.image_base64 = encoded
                cached.content_type = content_type
                cached.updated_at = db.func.now()
                db.session.add(cached)
            else:
                db.session.add(PlayerImage(
                    player_id=player_id_int,
                    image_base64=encoded,
                    content_type=content_type
                ))
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.warning(f"Failed to store image for {player_id}: {e}")

        return Response(resp.content, mimetype=content_type)
    except Exception as e:
        logger.error(f"Error fetching player image {player_id}: {str(e)}", exc_info=True)
        return jsonify({"status": "error", "message": str(e), "data": None}), 500

@api.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok"}), 200

@api.route('/league/<league_id>', methods=['PUT'])
@cross_origin()
def update_league_info(league_id: str):
    """Update editable league settings."""
    try:
        payload = request.get_json() or {}
        allowed_fields = {
            "money_per_team",
            "keepers_allowed",
            "rfa_allowed",
            "amnesty_allowed",
            "extension_allowed",
            "extension_length",
            "max_contract_length",
            "rfa_length",
            "taxi_length",
            "rollover_every",
            "is_auction",
            "is_keeper",
        }

        # Normalize to original league id in the chain to avoid duplicates
        base_league_id = int(league_id)
        try:
            chain_ids = get_league_chain_ids(base_league_id)
            if chain_ids:
                base_league_id = int(chain_ids[-1])
        except Exception:
            base_league_id = int(league_id)

        league_info = LeagueInfo.query.filter_by(league_id=base_league_id).first()
        if not league_info:
            league_info = LeagueInfo(
                league_id=base_league_id,
                is_auction=0,
                is_keeper=0,
                keepers_allowed=0,
                rfa_allowed=0,
                amnesty_allowed=0,
                extension_allowed=0,
                max_contract_length=0,
                taxi_length=0,
                rollover_every=0,
                creation_date="",
            )
            db.session.add(league_info)

        for key, value in payload.items():
            if key not in allowed_fields:
                continue
            try:
                if key in {"rfa_allowed", "amnesty_allowed", "extension_allowed", "is_auction", "is_keeper"}:
                    setattr(league_info, key, 1 if str(value).lower() in {"1", "true", "yes", "y"} else 0)
                else:
                    setattr(league_info, key, int(value))
            except Exception:
                setattr(league_info, key, value)

        db.session.commit()

        try:
            from .roster_service import RosterService
            RosterService._response_cache.clear()
            RosterService._response_cache_ts.clear()
        except Exception:
            pass

        return jsonify({
            "status": "success",
            "data": get_league_info(base_league_id)
        }), 200
    except Exception as e:
        logger.error(f"Error updating league info: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": None
        }), 500

@api.route('/all-contracts/<league_id>', methods=['GET'])
@cross_origin()
def get_all_contracts(league_id: str):
    """
    Get all contracts (current and historical) for a league across all seasons.
    Identifies which contracts are still active based on season and amnesty status.
    """
    try:
        logger.info(f"Fetching all contracts (current + historical) for league {league_id}")
        
        # Step 1: Get current season
        nfl_state = sleeper_service.get_current_nfl_state()
        current_season = int(nfl_state.get('league_season', 2026))
        logger.info(f"Current NFL season: {current_season}")
        
        # Step 2: Get all contracts across the entire league chain (historical + current)
        all_contracts = get_all_contracts_in_chain(int(league_id), current_season)
        logger.info(f"Found {len(all_contracts)} total contracts across league chain")
        
        # Step 3: Get amnestied + RFA players to mark contracts as invalid/include
        amnestied = get_all_amnestied_players_in_chain(int(league_id))
        amnestied_contract_ids = {a['contract_id'] for a in amnestied}
        logger.info(f"Found {len(amnestied_contract_ids)} amnestied contracts")

        league_chain_ids = get_league_chain_ids(int(league_id))
        if not league_chain_ids:
            league_chain_ids = [int(league_id)]
        rfas = RfaPlayer.query.filter(RfaPlayer.league_id.in_(league_chain_ids)).all()
        logger.info(f"Found {len(rfas)} RFA records")

        extensions = ExtensionPlayer.query.filter(ExtensionPlayer.league_id.in_(league_chain_ids)).all()
        logger.info(f"Found {len(extensions)} extension records")
        
        # Step 4: Fetch current rosters from Sleeper API (use current league in chain)
        current_league_id = league_chain_ids[0] if league_chain_ids else int(league_id)
        rosters = sleeper_service.get_rosters(current_league_id)
        users = sleeper_service.get_users(current_league_id)
        current_roster_players = set()
        users_map = {u.get('user_id'): u for u in users if isinstance(u, dict)}
        roster_owner_map = {
            r.get('roster_id'): r.get('owner_id')
            for r in rosters
            if isinstance(r, dict)
        }
        team_name_map = {}
        for roster_id, owner_id in roster_owner_map.items():
            user = users_map.get(owner_id) or {}
            display_name = user.get('display_name') or user.get('username')
            if display_name:
                team_name_map[str(roster_id)] = display_name
        
        if rosters:
            for roster in rosters:
                current_roster_players.update(roster.get('players', []))
        
        logger.info(f"Current roster has {len(current_roster_players)} players")
        
        # Step 5: Get player info from local_players table + Sleeper API fallback
        player_ids = set(str(c['player_id']) for c in all_contracts)
        players_db = LocalPlayer.query.filter(LocalPlayer.player_id.in_(list(player_ids))).all()
        players_db_map = {str(p.player_id): p for p in players_db}

        try:
            from .roster_service import RosterService
            sleeper_players_map = RosterService.build_players_map(str(league_id), player_ids=list(player_ids))
        except Exception:
            sleeper_players_map = {}
        logger.info(f"Found {len(players_db_map)} players in local database")
        
        # Step 6: Get draft + transaction data for current amounts
        drafts = sleeper_service.get_drafts(current_league_id)
        draft_picks_data = {}
        if drafts and isinstance(drafts, list):
            for draft in drafts:
                draft_id = draft.get('draft_id')
                if draft_id:
                    draft_picks_data[draft_id] = sleeper_service.get_draft_picks(draft_id)

        transactions = []
        for round_num in range(18):
            tx = sleeper_service.get_transactions(current_league_id, round_num) or []
            transactions.extend(tx)

        player_cost_map = {}
        try:
            from .roster_service import RosterService
            player_cost_map = RosterService.build_cost_map(
                draft_picks_data,
                transactions,
                cache_key=f"{league_id}-{current_season}"
            )
        except Exception as e:
            logger.warning(f"Failed to build cost map: {str(e)}")

        logger.info(f"Found current amounts for {len(player_cost_map)} players")
        
        # Step 7: Build response with contract status
        data = []
        contract_ids = [c['id'] for c in all_contracts]
        contracts_db = Contract.query.filter(Contract.id.in_(contract_ids)).all() if contract_ids else []
        contracts_db_map = {c.id: c for c in contracts_db}
        extension_years_map = {}
        for ext in extensions:
            if ext.contract_id is None:
                continue
            extension_years_map[ext.contract_id] = extension_years_map.get(ext.contract_id, 0) + int(ext.contract_length or 0)
        
        active_count = 0
        expired_count = 0
        amnestied_count = 0
        contract_amount_updates = 0
        
        for contract in all_contracts:
            player_id = str(contract['player_id'])
            contract_id = contract['id']
            
            # Get player info
            player = players_db_map.get(player_id)
            if player:
                first_name = player.first_name or 'Unknown'
                last_name = player.last_name or 'Unknown'
                position = player.position or 'N/A'
            else:
                sleeper_player = sleeper_players_map.get(player_id)
                if sleeper_player:
                    first_name = sleeper_player.first_name or 'Unknown'
                    last_name = sleeper_player.last_name or 'Unknown'
                    position = sleeper_player.position or 'N/A'
                else:
                    try:
                        sleeper_player = RosterService._fetch_player_from_sleeper(player_id)
                    except Exception:
                        sleeper_player = None
                    if sleeper_player:
                        first_name = sleeper_player.first_name or 'Unknown'
                        last_name = sleeper_player.last_name or 'Unknown'
                        position = sleeper_player.position or 'N/A'
                    else:
                        first_name = 'Unknown'
                        last_name = f'(ID: {player_id})'
                        position = 'N/A'
            
            # Determine contract status
            if contract_id in amnestied_contract_ids:
                status = 'AMNESTIED'
                is_active = False
                amnestied_count += 1
            elif contract['is_expired']:
                status = 'EXPIRED'
                is_active = False
                expired_count += 1
            else:
                status = 'ACTIVE'
                is_active = True
                active_count += 1
            
            # Check if player is currently on roster
            on_current_roster = player_id in current_roster_players
            
            # Get current amount (from draft data)
            amount = player_cost_map.get(str(player_id), 0)

            # Backfill contract_amount if missing
            contract_db = contracts_db_map.get(contract_id)
            if contract_db and contract_db.contract_amount is None and amount:
                contract_db.contract_amount = int(amount)
                contract_amount_updates += 1
            
            extended_years = extension_years_map.get(contract_id, 0)
            adjusted_end_season = contract['contract_end_season']
            if adjusted_end_season is not None and extended_years:
                adjusted_end_season = int(adjusted_end_season) + int(extended_years)

            data.append({
                'id': contract_id,
                'league_id': contract['league_id'],
                'player_id': player_id,
                'first_name': first_name,
                'last_name': last_name,
                'position': position,
                'team_id': contract['team_id'],
                'team_name': team_name_map.get(str(contract['team_id'])) if contract.get('team_id') is not None else None,
                'contract_length': contract['contract_length'],
                'contract_start_season': contract['contract_start_season'],
                'contract_end_season': adjusted_end_season,
                'extension_years': extended_years,
                'is_extended': True if extended_years else False,
                'amount': amount,
                'contract_amount': getattr(contracts_db_map.get(contract_id), "contract_amount", None),
                'status': status,
                'is_active': is_active,
                'on_current_roster': on_current_roster,
                'years_remaining': max(0, (adjusted_end_season or 0) - current_season + 1) if not contract['is_expired'] else 0
            })

        if contract_amount_updates:
            try:
                db.session.commit()
                logger.info(f"Backfilled contract_amount for {contract_amount_updates} contracts")
            except Exception:
                db.session.rollback()

        # Append RFA records as 1-year contracts
        for rfa in rfas:
            pid = str(rfa.player_id)
            # Reuse name lookup
            player = players_db_map.get(pid)
            if player:
                first_name = player.first_name or 'Unknown'
                last_name = player.last_name or 'Unknown'
                position = player.position or 'N/A'
            else:
                local_player = local_players_map.get(pid)
                if local_player:
                    first_name = local_player.get('first_name') or 'Unknown'
                    last_name = local_player.get('last_name') or 'Unknown'
                    position = local_player.get('position') or 'N/A'
                else:
                    sleeper_player = sleeper_players_map.get(pid)
                    if sleeper_player:
                        first_name = sleeper_player.first_name or 'Unknown'
                        last_name = sleeper_player.last_name or 'Unknown'
                        position = sleeper_player.position or 'N/A'
                    else:
                        first_name = 'Unknown'
                        last_name = f'(ID: {pid})'
                        position = 'N/A'

            data.append({
                'id': f"rfa-{rfa.player_id}-{rfa.season}",
                'league_id': rfa.league_id,
                'player_id': pid,
                'first_name': first_name,
                'last_name': last_name,
                'position': position,
                'team_id': rfa.team_id,
                'team_name': team_name_map.get(str(rfa.team_id)) if rfa.team_id is not None else None,
                'contract_length': 1,
                'contract_start_season': rfa.season,
                'contract_end_season': rfa.season,
                'extension_years': 0,
                'is_extended': False,
                'amount': 0,
                'status': 'RFA',
                'is_active': True,
                'on_current_roster': pid in current_roster_players,
                'years_remaining': 1
            })
        
        logger.info(f"Contract summary: {active_count} active, {expired_count} expired, {amnestied_count} amnestied")
        logger.info(f"Returning {len(data)} total contracts")
        
        return jsonify({
            "status": "success",
            "data": data,
            "summary": {
                "total": len(data),
                "active": active_count,
                "expired": expired_count,
                "amnestied": amnestied_count,
                "current_season": current_season
            }
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching all contracts: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": None
        }), 500

@api.route('/debug/rosters/<league_id>/<username>', methods=['GET'])
@cross_origin()
def debug_rosters(league_id: str, username: str):
    """Debug endpoint to compare Sleeper API data with our processed rosters"""
    try:
        logger.info(f"=== DEBUG ROSTERS START for {username} ===")
        
        # Get user ID from username
        user_data = sleeper_service.fetch(f"{sleeper_service.BASE_URL}/user/{username}")
        if not user_data or not user_data.get('user_id'):
            return jsonify({
                "status": "error",
                "message": f"User {username} not found",
                "data": None
            }), 404
        
        user_id = user_data.get('user_id')
        logger.info(f"Found user_id: {user_id}")
        
        # Get raw Sleeper data
        rosters = sleeper_service.get_rosters(league_id)
        users = sleeper_service.get_users(league_id)
        drafts = sleeper_service.get_drafts(league_id)
        
        # Get our user's roster from raw data
        raw_user_roster = None
        for roster in rosters:
            if roster.get('owner_id') == user_id:
                raw_user_roster = roster
                break
        
        # Get players from local DB (fallback per-player from Sleeper if missing)
        all_players_response = {}
        try:
            players_db = LocalPlayer.query.all()
            all_players_response = {
                str(p.player_id): {
                    "first_name": p.first_name,
                    "last_name": p.last_name,
                    "position": p.position
                }
                for p in players_db
            }
        except Exception:
            all_players_response = {}
        
        logger.info(f"Raw roster owner_id: {raw_user_roster.get('owner_id') if raw_user_roster else 'NOT FOUND'}")
        logger.info(f"Raw roster player count: {len(raw_user_roster.get('players', [])) if raw_user_roster else 0}")
        logger.info(f"Raw roster players: {raw_user_roster.get('players', [])[:5] if raw_user_roster else 'NONE'}...")
        logger.info(f"All players response type: {type(all_players_response)}")
        logger.info(f"All players is dict: {isinstance(all_players_response, dict)}")
        
        # Get draft picks
        draft_picks_data = {}
        if drafts and isinstance(drafts, list):
            for draft in drafts:
                draft_id = draft.get('draft_id')
                if draft_id:
                    draft_picks_data[draft_id] = sleeper_service.get_draft_picks(draft_id)
        
        # Build comparison data
        comparison = {
            "username": username,
            "user_id": user_id,
            "sleeper_roster_player_count": len(raw_user_roster.get('players', [])) if raw_user_roster else 0,
            "sleeper_roster_players_sample": raw_user_roster.get('players', [])[:5] if raw_user_roster else [],
            "all_players_type": str(type(all_players_response)),
            "all_players_dict_count": len(all_players_response) if isinstance(all_players_response, dict) else 0,
            "all_players_dict_sample": {k: {"first_name": v.get("first_name"), "last_name": v.get("last_name"), "position": v.get("position")} for k, v in list(all_players_response.items())[:5]} if isinstance(all_players_response, dict) else {},
            "draft_picks_count": sum(len(picks) for picks in draft_picks_data.values()),
            "player_lookups": []
        }
        
        # Now test player lookup
        if raw_user_roster:
            test_players = raw_user_roster.get('players', [])[:10]
            for player_id in test_players:
                player_id_str = str(player_id)
                player_data = all_players_response.get(player_id_str) if isinstance(all_players_response, dict) else None
                if not player_data:
                    try:
                        from .roster_service import RosterService
                        sleeper_player = RosterService._fetch_player_from_sleeper(player_id_str)
                        if sleeper_player:
                            player_data = {
                                "first_name": sleeper_player.first_name,
                                "last_name": sleeper_player.last_name,
                                "position": sleeper_player.position
                            }
                    except Exception:
                        player_data = None
                comparison["player_lookups"].append({
                    "player_id": player_id_str,
                    "found_in_all_players": player_data is not None,
                    "player_data": {
                        "first_name": player_data.get("first_name") if player_data else None,
                        "last_name": player_data.get("last_name") if player_data else None,
                        "position": player_data.get("position") if player_data else None
                    } if player_data else None
                })
        
        return jsonify({
            "status": "success",
            "data": comparison
        }), 200
    
    except Exception as e:
        logger.error(f"Debug error: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": None
        }), 500

@api.route('/debug/full-flow/<league_id>/<username>', methods=['GET'])
@cross_origin()
def debug_full_flow(league_id: str, username: str):
    """Debug full data flow from Sleeper to processed rosters"""
    try:
        logger.info(f"=== DEBUG FULL FLOW START for {username} ===")
        
        # Get user ID from username
        user_data = sleeper_service.fetch(f"{sleeper_service.BASE_URL}/user/{username}")
        if not user_data or not user_data.get('user_id'):
            return jsonify({
                "status": "error",
                "message": f"User {username} not found",
                "data": None
            }), 404
        
        user_id = user_data.get('user_id')
        
        # Get raw Sleeper data
        rosters = sleeper_service.get_rosters(league_id)
        users = sleeper_service.get_users(league_id)
        
        # Find the user's roster
        user_roster_raw = None
        for roster in rosters:
            if roster.get('owner_id') == user_id:
                user_roster_raw = roster
                break
        
        # Get all players from local DB
        all_players_response = {}
        try:
            players_db = LocalPlayer.query.all()
            all_players_response = {
                str(p.player_id): {
                    "first_name": p.first_name,
                    "last_name": p.last_name,
                    "position": p.position
                }
                for p in players_db
            }
        except Exception:
            all_players_response = {}
        
        # Process through _process_rosters
        drafts = sleeper_service.get_drafts(league_id)
        draft_picks_data = {}
        if drafts and isinstance(drafts, list):
            for draft in drafts:
                draft_id = draft.get('draft_id')
                if draft_id:
                    draft_picks_data[draft_id] = sleeper_service.get_draft_picks(draft_id)
        
        nfl_state = sleeper_service.get_current_nfl_state()
        current_season = int(nfl_state.get('league_season', 2026))
        
        transaction_data = sleeper_service.get_transactions(league_id, 0)
        
        response_data = RosterService.get_rosters_response(
            league_id=league_id,
            user_id=user_id,
            rosters=rosters,
            users=users,
            draft_picks=draft_picks_data,
            current_season=current_season,
            transactions=transaction_data
        )
        processed_rosters = response_data['team_info']
        
        # Find processed user roster
        user_roster_processed = None
        for roster in processed_rosters:
            if roster.get('owner_id') == user_id:
                user_roster_processed = roster
                break
        
        debug_data = {
            "username": username,
            "user_id": user_id,
            "raw_sleeper": {
                "roster_found": user_roster_raw is not None,
                "player_count": len(user_roster_raw.get('players', [])) if user_roster_raw else 0,
                "players_sample": user_roster_raw.get('players', [])[:5] if user_roster_raw else [],
                "owner_id": user_roster_raw.get('owner_id') if user_roster_raw else None
            },
            "processed": {
                "roster_found": user_roster_processed is not None,
                "player_count": len(user_roster_processed.get('players', [])) if user_roster_processed else 0,
                "players_sample": [
                    {
                        "player_id": p.get('player_id'),
                        "first_name": p.get('first_name'),
                        "last_name": p.get('last_name'),
                        "position": p.get('position'),
                        "amount": p.get('amount')
                    }
                    for p in (user_roster_processed.get('players', [])[:5] if user_roster_processed else [])
                ],
                "owner_id": user_roster_processed.get('owner_id') if user_roster_processed else None
            }
        }
        
        return jsonify({
            "status": "success",
            "data": debug_data
        }), 200
    
    except Exception as e:
        logger.error(f"Debug full flow error: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": None
        }), 500

@api.route('/debug/compare/<league_id>/<username>', methods=['GET'])
@cross_origin()
def debug_compare(league_id: str, username: str):
    """Compare raw Sleeper roster data with processed data"""
    try:
        # Get user ID from username
        user_data = sleeper_service.fetch(f"{sleeper_service.BASE_URL}/user/{username}")
        user_id = user_data.get('user_id')
        
        # Get raw rosters from Sleeper
        rosters = sleeper_service.get_rosters(league_id)
        users = sleeper_service.get_users(league_id)
        
        # Find user roster in raw data
        raw_user_roster = None
        for roster in rosters:
            if roster.get('owner_id') == user_id:
                raw_user_roster = roster
                break
        
        # Get processed data
        drafts = sleeper_service.get_drafts(league_id)
        draft_picks_data = {}
        if drafts and isinstance(drafts, list):
            for draft in drafts:
                draft_id = draft.get('draft_id')
                if draft_id:
                    draft_picks_data[draft_id] = sleeper_service.get_draft_picks(draft_id)
        
        nfl_state = sleeper_service.get_current_nfl_state()
        current_season = int(nfl_state.get('league_season', 2026))
        transaction_data = sleeper_service.get_transactions(league_id, 0)
        
        response_data = RosterService.get_rosters_response(
            league_id=league_id,
            user_id=user_id,
            rosters=rosters,
            users=users,
            draft_picks=draft_picks_data,
            current_season=current_season,
            transactions=transaction_data
        )
        processed_rosters = response_data['team_info']
        
        # What the API returns
        api_response = {
            "team_info": processed_rosters,
            "league_info": {},
            "current_season": current_season
        }
        
        # What the frontend receives after handleResponse
        frontend_receives = api_response  # (because handleResponse returns data.data)
        
        # What MyTeamScreen looks for
        my_team_screen_search = {
            "looking_for_owner_id": user_id,
            "available_owner_ids": [t.get('owner_id') for t in processed_rosters],
            "will_find_team": any(t.get('owner_id') == user_id for t in processed_rosters)
        }
        
        return jsonify({
            "status": "success",
            "data": {
                "username": username,
                "user_id": user_id,
                "raw_sleeper_owner_id": raw_user_roster.get('owner_id') if raw_user_roster else None,
                "raw_sleeper_player_count": len(raw_user_roster.get('players', [])) if raw_user_roster else 0,
                "processed_rosters_count": len(processed_rosters),
                "my_team_screen": my_team_screen_search,
                "first_processed_roster": {
                    "owner_id": processed_rosters[0].get('owner_id') if processed_rosters else None,
                    "display_name": processed_rosters[0].get('display_name') if processed_rosters else None,
                    "player_count": len(processed_rosters[0].get('players', [])) if processed_rosters else 0,
                    "players_first_3": [
                        f"{p.get('first_name')} {p.get('last_name')}"
                        for p in (processed_rosters[0].get('players', [])[:3] if processed_rosters else [])
                    ]
                }
            }
        }), 200
    
    except Exception as e:
        logger.error(f"Debug compare error: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": None
        }), 500


