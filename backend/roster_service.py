"""
Roster service - handles all roster data processing and enrichment.
Separates business logic from API routes.
"""

import logging
import time
from datetime import datetime
from typing import Dict, List, Tuple
from sqlalchemy import func
from .sleeper_service import sleeper_service
from .data_schemas import (
    PlayerData, RosterPlayer, TeamRoster, RostersResponse,
    validate_sleeper_roster, validate_sleeper_user, validate_draft_pick
)
from .utils import get_contract_value, get_league_info, get_all_contracts_in_chain
from .models import LeagueChain, RfaPlayer, AmnestyPlayer, ExtensionPlayer, RfaTeam, AmnestyTeam, ExtensionTeam, LocalPlayer
from .extensions import db
import json

logger = logging.getLogger(__name__)


class RosterService:
    """Service for processing and enriching roster data"""

    _players_map_cache: Dict[str, PlayerData] = {}
    _players_map_cache_ts: float = 0.0
    _players_map_cache_ttl: int = 60 * 60 * 24  # 24 hours
    _cost_map_cache: Dict[str, Dict[str, int]] = {}
    _cost_map_cache_ts: Dict[str, float] = {}
    _cost_map_cache_ttl: int = 60 * 10  # 10 minutes
    _response_cache: Dict[Tuple[str, str], Dict] = {}
    _response_cache_ts: Dict[Tuple[str, str], float] = {}
    _response_cache_ttl: int = 30  # 30 seconds
    
    @staticmethod
    def build_players_map(league_id: str, player_ids: List[str] | None = None) -> Dict[str, PlayerData]:
        """
        Build a map of players from the local database.
        Maps player_id (string) -> PlayerData
        """
        now = time.time()
        if player_ids is None:
            if (
                RosterService._players_map_cache
                and (now - RosterService._players_map_cache_ts) < RosterService._players_map_cache_ttl
            ):
                logger.info("Using cached players map")
                return RosterService._players_map_cache

        logger.info(f"Building players map from local DB for league {league_id}")

        query = LocalPlayer.query
        if player_ids:
            try:
                ids = [int(pid) for pid in player_ids]
            except Exception:
                ids = []
            if ids:
                query = query.filter(LocalPlayer.player_id.in_(ids))
        players = query.all()

        players_map: Dict[str, PlayerData] = {}
        for p in players:
            players_map[str(p.player_id)] = PlayerData(
                player_id=str(p.player_id),
                first_name=p.first_name or "Unknown",
                last_name=p.last_name or "Unknown",
                position=p.position or "N/A",
            )

        logger.info(f"Built players map with {len(players_map)} players from local DB")
        if player_ids is None:
            RosterService._players_map_cache = players_map
            RosterService._players_map_cache_ts = now
        return players_map
    
    @staticmethod
    def build_cost_map(draft_picks_data: Dict, transactions: List[Dict], cache_key: str = "") -> Dict[str, int]:
        """
        Build player cost map from draft picks.
        Maps player_id (string) -> amount
        """
        now = time.time()
        if cache_key:
            cached = RosterService._cost_map_cache.get(cache_key)
            cached_ts = RosterService._cost_map_cache_ts.get(cache_key, 0.0)
            if cached is not None and (now - cached_ts) < RosterService._cost_map_cache_ttl:
                logger.info("Using cached cost map")
                return cached

        cost_map = {}
        
        for draft_id, picks in draft_picks_data.items():
            if not isinstance(picks, list):
                logger.warning(f"Draft {draft_id}: picks is not a list")
                continue
            
            for pick in picks:
                validated_pick = validate_draft_pick(pick)
                if not validated_pick.get('player_id'):
                    continue
                
                player_id = str(validated_pick['player_id'])
                metadata = validated_pick.get('metadata', {})
                amount = int(metadata.get('amount', 0))
                
                # Only keep first cost found for each player
                if amount and player_id not in cost_map:
                    cost_map[player_id] = amount
        
        # Fall back to transactions (waiver/FAAB/auction adds) for players
        # not already priced by draft picks.
        if isinstance(transactions, list) and transactions:
            def _tx_sort_key(tx):
                ts = tx.get('created') or tx.get('status_updated') or tx.get('status') or 0
                try:
                    return int(ts)
                except Exception:
                    return 0

            def _extract_tx_amount(settings: Dict) -> int:
                if not isinstance(settings, dict):
                    return 0
                for key in ('waiver_bid', 'faab_bid', 'bid', 'price', 'amount'):
                    val = settings.get(key)
                    if val is None:
                        continue
                    try:
                        val_int = int(val)
                    except Exception:
                        continue
                    if val_int > 0:
                        return val_int
                return 0

            for tx in sorted(transactions, key=_tx_sort_key, reverse=True):
                if not isinstance(tx, dict):
                    continue
                amount = _extract_tx_amount(tx.get('settings', {}))
                if not amount:
                    continue
                adds = tx.get('adds')
                if isinstance(adds, dict):
                    player_ids = list(adds.keys())
                elif isinstance(adds, list):
                    player_ids = adds
                else:
                    player_ids = []

                for pid in player_ids:
                    pid_str = str(pid)
                    if pid_str not in cost_map:
                        cost_map[pid_str] = amount

        logger.info(f"Built cost map for {len(cost_map)} players")
        if cache_key:
            RosterService._cost_map_cache[cache_key] = cost_map
            RosterService._cost_map_cache_ts[cache_key] = now
        return cost_map
    
    @staticmethod
    def process_rosters(
        rosters: List[Dict],
        users: List[Dict],
        user_id: str,
        draft_picks: Dict,
        league_id: str,
        current_season: int,
        transactions: List[Dict],
        commissioner_id: str | None = None,
        cost_map_cache_key: str = ""
    ) -> List[Dict]:
        """
        Process roster data efficiently.
        
        Returns list of team rosters with player-level details.
        """
        logger.info(f"Processing rosters for league {league_id}, user {user_id}")
        
        # Validate inputs
        if not isinstance(rosters, list):
            logger.error("Rosters is not a list")
            return []
        
        if not isinstance(users, list):
            logger.error("Users is not a list")
            users = []

        # Step 1: Build single source of truth for player data (local DB)
        roster_player_ids: List[str] = []
        for r in rosters:
            if isinstance(r, dict):
                roster_player_ids.extend([str(pid) for pid in r.get('players', [])])
        players_map = RosterService.build_players_map(league_id, player_ids=roster_player_ids)
        cost_map = RosterService.build_cost_map(draft_picks, transactions, cache_key=cost_map_cache_key)
        
        # Step 2: Create lookup dicts
        users_map = {u.get('user_id'): u for u in users if u.get('user_id')}
        logger.info(f"Users map: {len(users_map)} users")
        
        if not users_map:
            logger.warning("No users found in input")
        
        # Step 3: Process each roster
        processed_rosters = []
        
        for roster_idx, raw_roster in enumerate(rosters):
            logger.info(f"Processing roster {roster_idx}/{len(rosters)}")
            
            # Validate roster
            roster = validate_sleeper_roster(raw_roster)
            owner_id = roster.get('owner_id')
            
            if not owner_id:
                logger.warning(f"Roster {roster_idx} has no owner_id")
                continue
            
            user_info = users_map.get(owner_id, {})
            
            # Process players - each player gets their own immutable object
            players_data = []
            total_amount = 0
            
            for player_id in roster.get('players', []):
                player_id_str = str(player_id)
                
                # Lookup in map - SINGLE source of truth
                player = players_map.get(player_id_str)
                
                if not player:
                    # Fallback to Sleeper API for missing player, then cache locally
                    player = RosterService._fetch_player_from_sleeper(player_id_str)
                    if player:
                        players_map[player_id_str] = player
                    else:
                        player = PlayerData.placeholder(player_id_str)
                        logger.warning(f"Player {player_id_str} not found in local DB or Sleeper API, using placeholder")
                
                # Get contract info for this player
                contract_years = get_contract_value(
                    int(player_id),
                    int(league_id),
                    current_season
                )
                
                # Get amount from cost map
                amount = cost_map.get(player_id_str, 0)
                
                # Create immutable roster player
                roster_player = RosterPlayer.from_player_data(
                    player,
                    amount=amount,
                    contract_years=contract_years
                )
                
                players_data.append(roster_player)
                total_amount += amount
                
                logger.debug(f"  Player {player_id_str}: {player.first_name} {player.last_name}")
            
            # Log roster summary
            logger.info(f"Roster {roster_idx}: {len(players_data)} players, total_amount={total_amount}")

            contracts_count = sum(1 for p in players_data if getattr(p, "contract_years", 0) > 0)
            
            # Create team roster
            is_league_owner = False
            if isinstance(user_info, dict) and user_info.get("is_owner") is True:
                is_league_owner = True
            elif commissioner_id:
                is_league_owner = str(owner_id) == str(commissioner_id)

            team = TeamRoster(
                owner_id=owner_id,
                roster_id=roster.get('roster_id'),
                display_name=user_info.get('display_name', 'Unknown'),
                avatar=user_info.get('avatar'),
                is_owner=is_league_owner,
                players=players_data,
                total_amount=total_amount,
                taxi=roster.get('taxi', []),
                contracts=contracts_count
            )
            
            processed_rosters.append(team)
        
        logger.info(f"Processed {len(processed_rosters)} rosters")
        return [r.to_dict() for r in processed_rosters]

    @staticmethod
    def _fetch_player_from_sleeper(player_id: str) -> PlayerData | None:
        """Fetch a single player from Sleeper /players/nfl as fallback and upsert into local DB."""
        try:
            players = sleeper_service.get_players_nfl()
            if not isinstance(players, dict):
                return None
            data = players.get(str(player_id))
            if not isinstance(data, dict):
                return None
            if not data.get('first_name') or not data.get('last_name'):
                return None

            player = PlayerData.from_sleeper_response(player_id, data)

            try:
                existing = LocalPlayer.query.filter_by(player_id=int(player_id)).first()
                if existing:
                    existing.first_name = player.first_name
                    existing.last_name = player.last_name
                    existing.position = player.position
                    db.session.add(existing)
                else:
                    db.session.add(LocalPlayer(
                        player_id=int(player_id),
                        first_name=player.first_name,
                        last_name=player.last_name,
                        position=player.position
                    ))
                db.session.commit()
            except Exception:
                db.session.rollback()

            return player
        except Exception:
            return None
    
    @staticmethod
    def get_rosters_response(
        league_id: str,
        user_id: str,
        rosters: List[Dict],
        users: List[Dict],
        draft_picks: Dict,
        current_season: int,
        transactions: List[Dict]
    ) -> Dict:
        """
        Get complete rosters response with all enrichment.
        """
        # Short-term response cache for identical requests (user + league)
        cache_key = (str(league_id), str(user_id))
        now = time.time()
        cached_resp = RosterService._response_cache.get(cache_key)
        cached_ts = RosterService._response_cache_ts.get(cache_key, 0.0)
        if cached_resp is not None and (now - cached_ts) < RosterService._response_cache_ttl:
            logger.info("Using cached rosters response")
            return cached_resp

        # Resolve the league chain (ensure we are using the current league id)
        starting_league_id = str(league_id)
        try:
            league_data = sleeper_service.get_league_data(str(league_id)) or {}
        except Exception:
            league_data = {}

            # Attempt to find the user's current league for this season using user leagues
            try:
                user_leagues = sleeper_service.get_user_leagues(user_id, str(current_season))
                # Prefer a league whose previous_league_id points to the provided id
                candidate = None
                for l in user_leagues:
                    if str(l.get('previous_league_id')) == str(league_id):
                        candidate = l
                        break
                if not candidate and user_leagues:
                    # Fallback to the most recent league for the user
                    candidate = user_leagues[0]
                if candidate and candidate.get('league_id'):
                    starting_league_id = str(candidate.get('league_id'))
            except Exception:
                # ignore and fall back to provided league_id
                starting_league_id = str(league_id)

        try:
            league_chain = sleeper_service.get_league_chain(starting_league_id)
        except Exception:
            league_chain = [starting_league_id]

        # league_chain is ordered [current_id, ..., original_id]
        current_league_id = league_chain[0] if league_chain else starting_league_id
        original_league_id = league_chain[-1] if league_chain else starting_league_id

        # Upsert league_chain in database so downstream callers can read it
        try:
            existing = LeagueChain.query.filter_by(original_league_id=int(original_league_id)).first()
            payload = json.dumps([int(lid) for lid in league_chain])
            if existing:
                existing.current_league_id = int(current_league_id)
                existing.league_ids = payload
                existing.last_updated = db.func.now()
                db.session.add(existing)
            else:
                new_chain = LeagueChain(
                    original_league_id=int(original_league_id),
                    current_league_id=int(current_league_id),
                    league_ids=payload
                )
                db.session.add(new_chain)
            db.session.commit()
        except Exception:
            db.session.rollback()

        # If rosters/users/draft_picks/transactions were not provided (None),
        # fetch them for the resolved current league id so we operate on
        # the authoritative, active league data.
        if not isinstance(rosters, list):
            try:
                rosters = sleeper_service.get_rosters(current_league_id)
            except Exception:
                rosters = []

        if not isinstance(users, list):
            try:
                users = sleeper_service.get_users(current_league_id)
            except Exception:
                users = []

        # Build draft picks if not provided
        if not draft_picks or not isinstance(draft_picks, dict):
            draft_picks = {}
            try:
                # Collect drafts across the entire league chain (current -> original)
                draft_sources = []
                for idx, lid in enumerate(league_chain):
                    drafts = sleeper_service.get_drafts(lid)
                    if not drafts or not isinstance(drafts, list):
                        continue

                    # Higher rank for newer leagues in the chain
                    league_rank = (len(league_chain) - idx)
                    for draft in drafts:
                        draft_sources.append((draft, league_rank))

                def _draft_sort_key(item):
                    draft, league_rank = item
                    # Prefer explicit timestamps when available; fall back to season
                    ts = (
                        draft.get('start_time')
                        or draft.get('created')
                        or draft.get('last_updated')
                        or draft.get('season')
                        or 0
                    )
                    try:
                        ts_val = int(ts)
                    except Exception:
                        ts_val = 0
                    return (ts_val, league_rank)

                # Newest drafts first so they take precedence in build_cost_map
                for draft, _ in sorted(draft_sources, key=_draft_sort_key, reverse=True):
                    draft_id = draft.get('draft_id')
                    if draft_id and draft_id not in draft_picks:
                        draft_picks[draft_id] = sleeper_service.get_draft_picks(draft_id)
            except Exception:
                draft_picks = {}

        # Transactions
        if not isinstance(transactions, list) or len(transactions) == 0:
            try:
                transactions = []
                for round_num in range(0, 18):
                    transactions.extend(sleeper_service.get_transactions(current_league_id, round_num) or [])
            except Exception:
                transactions = []

        # Process rosters (now using authoritative rosters/users for current league)
        cost_map_cache_key = f"{current_league_id}:{','.join(league_chain)}"
        commissioner_id = None
        try:
            league_data_current = sleeper_service.get_league_data(str(current_league_id)) or {}
            commissioner_id = league_data_current.get("commissioner_id") or league_data_current.get("owner_id")
        except Exception:
            commissioner_id = None
        team_info = RosterService.process_rosters(
            rosters,
            users,
            user_id,
            draft_picks,
            current_league_id,
            current_season,
            transactions,
            commissioner_id=commissioner_id,
            cost_map_cache_key=cost_map_cache_key
        )

        # Get league info for the current league (fallback to original league if missing)
        league_info = get_league_info(int(current_league_id))
        chain_fallback = {}
        try:
            for lid in league_chain:
                info = get_league_info(int(lid)) or {}
                if info:
                    chain_fallback = info
                    break
        except Exception:
            chain_fallback = {}

        if not league_info:
            league_info = chain_fallback
        elif isinstance(league_info, dict) and chain_fallback:
            if league_info.get("money_per_team") in (None, 0):
                league_info["money_per_team"] = chain_fallback.get("money_per_team")
            for key in (
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
                "creation_date",
            ):
                if league_info.get(key) in (None, 0, "", False):
                    if key in chain_fallback:
                        league_info[key] = chain_fallback.get(key)

        if not league_info:
            league_info = {}

        # Resolve commissioner/owner display name
        commissioner_name = None
        if isinstance(users, list):
            for u in users:
                if isinstance(u, dict) and u.get("is_owner") is True:
                    commissioner_name = u.get("display_name") or u.get("username")
                    if commissioner_name:
                        break
        if not commissioner_name and commissioner_id:
            for u in users:
                if isinstance(u, dict) and str(u.get("user_id")) == str(commissioner_id):
                    commissioner_name = u.get("display_name") or u.get("username")
                    break
        if isinstance(league_info, dict):
            league_info["commissioner"] = commissioner_name
            if not league_info.get("creation_date"):
                try:
                    created_ts = league_data_current.get("created") or league_data_current.get("created_at")
                    if created_ts:
                        if int(created_ts) > 1e12:
                            created_ts = int(created_ts) / 1000
                        league_info["creation_date"] = datetime.utcfromtimestamp(int(created_ts)).date().isoformat()
                except Exception:
                    pass

        # Calculate rollover-based allowances for RFA/Amnesty/Extensions
        try:
            league_chain_ids = [int(lid) for lid in league_chain]
            rollover_every = int(league_info.get("rollover_every") or 0) if isinstance(league_info, dict) else 0
            period = max(1, rollover_every)
            window_start = int(current_season) - (period - 1)

            rfa_allowed = int(league_info.get("rfa_allowed") or 0) if isinstance(league_info, dict) else 0
            amnesty_allowed = int(league_info.get("amnesty_allowed") or 0) if isinstance(league_info, dict) else 0
            extension_allowed = int(league_info.get("extension_allowed") or 0) if isinstance(league_info, dict) else 0

            owner_to_roster = {
                str(r.get("owner_id")): r.get("roster_id")
                for r in rosters
                if isinstance(r, dict) and r.get("owner_id") is not None
            }
            team_ids = [rid for rid in owner_to_roster.values() if rid is not None]

            active_contract_counts = {}
            try:
                all_contracts = get_all_contracts_in_chain(int(original_league_id), int(current_season))
                for contract in all_contracts:
                    if not contract.get("is_active"):
                        continue
                    team_id = contract.get("team_id")
                    if team_id is None:
                        continue
                    active_contract_counts[team_id] = active_contract_counts.get(team_id, 0) + 1
            except Exception:
                active_contract_counts = {}

            rfa_used = {}
            amnesty_used = {}
            extension_used = {}
            if league_chain_ids and team_ids:
                rfa_used = dict(
                    db.session.query(RfaPlayer.team_id, func.count(RfaPlayer.player_id))
                    .filter(RfaPlayer.league_id.in_(league_chain_ids))
                    .filter(RfaPlayer.team_id.in_(team_ids))
                    .filter(RfaPlayer.season >= window_start)
                    .group_by(RfaPlayer.team_id)
                    .all()
                )
                amnesty_used = dict(
                    db.session.query(AmnestyPlayer.team_id, func.count(AmnestyPlayer.player_id))
                    .filter(AmnestyPlayer.league_id.in_(league_chain_ids))
                    .filter(AmnestyPlayer.team_id.in_(team_ids))
                    .filter(AmnestyPlayer.season >= window_start)
                    .group_by(AmnestyPlayer.team_id)
                    .all()
                )
                extension_used = dict(
                    db.session.query(ExtensionPlayer.team_id, func.count(ExtensionPlayer.player_id))
                    .filter(ExtensionPlayer.league_id.in_(league_chain_ids))
                    .filter(ExtensionPlayer.team_id.in_(team_ids))
                    .filter(ExtensionPlayer.season >= window_start)
                    .group_by(ExtensionPlayer.team_id)
                    .all()
                )

            for team in team_info:
                roster_id = owner_to_roster.get(str(team.get("owner_id")))
                if roster_id is None:
                    continue
                rfa_left = max(rfa_allowed - int(rfa_used.get(roster_id, 0)), 0)
                amnesty_left = max(amnesty_allowed - int(amnesty_used.get(roster_id, 0)), 0)
                extension_left = max(extension_allowed - int(extension_used.get(roster_id, 0)), 0)
                team["rfa_left"] = rfa_left
                team["amnesty_left"] = amnesty_left
                team["extension_left"] = extension_left
                team["contracts"] = int(active_contract_counts.get(roster_id, 0))

                base_league_id = int(original_league_id)
                rfa_team = RfaTeam.query.filter_by(league_id=base_league_id, team_id=roster_id).first()
                if not rfa_team:
                    rfa_team = RfaTeam(league_id=base_league_id, team_id=roster_id, rfa_left=rfa_left)
                    db.session.add(rfa_team)
                else:
                    rfa_team.rfa_left = rfa_left

                amnesty_team = AmnestyTeam.query.filter_by(league_id=base_league_id, team_id=roster_id).first()
                if not amnesty_team:
                    amnesty_team = AmnestyTeam(league_id=base_league_id, team_id=roster_id, amnesty_left=amnesty_left)
                    db.session.add(amnesty_team)
                else:
                    amnesty_team.amnesty_left = amnesty_left

                extension_team = ExtensionTeam.query.filter_by(league_id=base_league_id, team_id=roster_id).first()
                if not extension_team:
                    extension_team = ExtensionTeam(league_id=base_league_id, team_id=roster_id, extension_left=extension_left)
                    db.session.add(extension_team)
                else:
                    extension_team.extension_left = extension_left

            db.session.commit()
        except Exception:
            db.session.rollback()

        response = {
            'team_info': team_info,
            'league_info': league_info,
            'current_season': current_season,
            'resolved_league_id': str(current_league_id),
            'original_league_id': str(original_league_id),
            'league_chain': [str(x) for x in league_chain]
        }
        RosterService._response_cache[cache_key] = response
        RosterService._response_cache_ts[cache_key] = now
        return response
