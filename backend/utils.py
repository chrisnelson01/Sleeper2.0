from datetime import datetime
import json
import asyncio
import os
import logging
from typing import List, Dict, Set, Tuple

from aiohttp import ClientSession
from .models import (
    AmnestyPlayer, ExtensionPlayer, RfaPlayer,
    Contract, LocalPlayer, LeagueInfo
)
from .extensions import db
from sqlalchemy import text
from .sleeper_service import sleeper_service

logger = logging.getLogger(__name__)

async def fetch_data(url):
    try:
        async with ClientSession(trust_env=True) as session:
            async with session.get(url) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    print(f"Error fetching data from {url}: Status code {response.status}")
                    return []
    except Exception as e:
        print(f"Exception fetching data from {url}: {e}")
        return []

def load_local_players_data():
    try:
        # Get the directory of the current script (utils.py)
        base_dir = os.path.dirname(__file__)
        # Construct the path to the players.json file in the same directory
        file_path = os.path.join(base_dir, 'players.json')
        
        # Open and load the players.json file
        with open(file_path, 'r') as file:
            return json.load(file)
    except Exception as e:
        logging.error(f"Error loading local players.json from {file_path}: {e}")
        return {}
    
async def get_previous_league_id(user_id, league_id):
    league_url = f"https://api.sleeper.app/v1/league/{league_id}"
    league_data = await fetch_data(league_url)
    
    # Check if league_data is a dictionary
    if isinstance(league_data, dict):
        # Extract the previous_league_id if it exists
        previous_league_id = league_data.get('previous_league_id')
    else:
        # Unexpected format; handle accordingly
        return []

    # Base case: If previous_league_id is null or does not exist, return an empty list
    if not previous_league_id:
        return []
    else: 
        previous_league_id = int(previous_league_id)
    # Recursive case: Get previous leagues recursively
    return [previous_league_id] + await get_previous_league_id(user_id, previous_league_id)

async def get_all_previous_season_league_ids(user_id, current_league_id):
    # Get all previous league IDs recursively starting from the current_league_id
    previous_league_ids = await get_previous_league_id(user_id, current_league_id)
    return previous_league_ids

async def get_waiver_data_async(league_id, previous_league_id=None):
    current_league_waivers = await asyncio.gather(
        *[fetch_data(f"https://api.sleeper.app/v1/league/{league_id}/transactions/{round_num}") for round_num in range(0, 17 + 1)]
    )
    
    previous_league_waivers = []
    if previous_league_id:
        previous_league_waivers = await asyncio.gather(
            *[fetch_data(f"https://api.sleeper.app/v1/league/{previous_league_id}/transactions/{round_num}") for round_num in range(0, 17 + 1)]
        )
    
    return current_league_waivers + previous_league_waivers

def flatten_list(nested_list):
    """Flatten a list of lists."""
    return [item for sublist in nested_list for item in sublist]

def merge_draft_data(current_draft, previous_draft):
    # Create a dictionary for quick lookup of previous draft players by player_id
    previous_draft = flatten_list(previous_draft)
    previous_draft_map = {player['player_id']: player for player in previous_draft}
    # Initialize the merged draft list
    merged_draft = []

    # Iterate through current draft and add players to merged_draft, overriding previous draft data if necessary
    for player in current_draft:
        merged_draft.append(player)  # Current draft overrides previous draft

        # Remove the player from previous_draft_map to avoid duplicate entry later
        if player['player_id'] in previous_draft_map:
            del previous_draft_map[player['player_id']]
    
    # Add remaining players from previous draft that are not in the current draft
    merged_draft.extend(previous_draft_map.values())
    
    return merged_draft


def get_amnesty_rfa_extension_data(players_with_id_and_amount, league_id, team_id, current_season):
    # Get all Amnesty, RFA, and Extension records for the given league
    amnesty_players = AmnestyPlayer.query.filter_by(league_id=league_id, team_id=team_id, season=current_season).all()
    rfa_players = RfaPlayer.query.filter_by(league_id=league_id, team_id=team_id).all()
    extension_players = ExtensionPlayer.query.filter_by(league_id=league_id, team_id=team_id).all()

    # Convert the query results to dictionaries for easier lookup
    amnesty_dict = {player.player_id: True for player in amnesty_players}
    rfa_dict = {player.player_id: (player.contract_length, player.season) for player in rfa_players}
    extension_dict = {player.player_id: (player.contract_length, player.season) for player in extension_players}

    # Loop through each player and update with amnesty, RFA, or extension data if applicable
    for player in players_with_id_and_amount:
        player_id = int(player['player_id'])

        # Check and update Amnesty data
        if player_id in amnesty_dict:
            player['amnesty'] = True

        # Check and update RFA data
        if player_id in rfa_dict:
            contract_length, season = rfa_dict[player_id]
            player['rfa_contract_length'] = contract_length - (current_season - season)

        # Check and update Extension data
        if player_id in extension_dict:
            contract_length, season = extension_dict[player_id]
            player['extension_contract_length'] = contract_length - (current_season - season)

    return players_with_id_and_amount

def get_league_info(league_id):
    league_info = LeagueInfo.query.filter_by(league_id=league_id).first()
    if league_info:
        return {
            "league_id": league_info.league_id,
            "is_auction": bool(league_info.is_auction),
            "is_keeper": bool(league_info.is_keeper),
            "money_per_team": league_info.money_per_team,
            "keepers_allowed": league_info.keepers_allowed,
            "rfa_allowed": league_info.rfa_allowed,
            "amnesty_allowed": league_info.amnesty_allowed,
            "extension_allowed": league_info.extension_allowed,
            "extension_length": league_info.extension_length,
            "rfa_length": league_info.rfa_length,
            "taxi_length": league_info.taxi_length,
            "rollover_every": league_info.rollover_every,
            "creation_date" : league_info.creation_date
        }
    else:
        return {}

def get_rosters_response(league_id: str, user_id: str):
    """High-level helper that gathers all necessary data and returns
    a processed rosters response ready for the API routes.

    This function centralizes the orchestration: resolves the league
    chain, current season, fetches rosters/users/drafts/draft_picks and
    delegates to the roster processing logic.
    """
    try:
        logger.info(f"utils.get_rosters_response: resolving league chain for {league_id}")

        # Resolve league chain via Sleeper service (returns newest->oldest)
        try:
            league_chain = sleeper_service.get_league_chain(str(league_id)) or [str(league_id)]
        except Exception:
            league_chain = [str(league_id)]

        current_league_id = str(league_chain[0]) if league_chain else str(league_id)

        # Current season
        try:
            nfl_state = sleeper_service.get_current_nfl_state() or {}
            current_season = int(nfl_state.get('league_season', nfl_state.get('season', 2026)))
        except Exception:
            current_season = 2026

        # Fetch authoritative league data
        rosters = sleeper_service.get_rosters(current_league_id) or []
        users = sleeper_service.get_users(current_league_id) or []
        # Draft picks and transactions are resolved inside RosterService
        draft_picks = None
        transactions = None

        # Delegate to the roster processing implementation in RosterService.
        # Import locally to avoid circular import at module import time.
        from .roster_service import RosterService

        response = RosterService.get_rosters_response(
            league_id=current_league_id,
            user_id=user_id or '',
            rosters=rosters,
            users=users,
            draft_picks=draft_picks,
            current_season=current_season,
            transactions=transactions
        )

        # Ensure returned structure is a dict
        if isinstance(response, tuple) and len(response) > 0 and isinstance(response[0], dict):
            response = response[0]

        # Attach resolved metadata for frontend convenience
        if isinstance(response, dict):
            response.setdefault('resolved_league_id', str(current_league_id))
            response.setdefault('league_chain', [str(x) for x in league_chain])
            response.setdefault('current_season', current_season)

        return response

    except Exception as e:
        logger.exception(f"Error in utils.get_rosters_response: {e}")
        raise

def calculate_years_remaining_from_creation(date, years):
    # Convert the input date string to a datetime object
    creation_date = datetime.strptime(date, "%Y-%m-%d")
    today = datetime.today()

    # Calculate the number of full years passed since the creation date
    years_passed = today.year - creation_date.year

    # Adjust if the anniversary hasn't passed yet this year
    if (today.month, today.day) < (creation_date.month, creation_date.day):
        years_passed -= 1

    # Calculate the years remaining to reach the target number of years
    years_remaining = years - years_passed

    return max(years_remaining, 0)  # Ensure that the remaining years are not negative

async def get_all_season_drafts(league_ids: List[str]) -> Dict[str, List[Dict]]:
    """Get draft data for all seasons in parallel"""
    
    draft_tasks = {
        league_id: sleeper_service.get_drafts(league_id)
        for league_id in league_ids
    }
    
    results = {}
    for league_id, task in draft_tasks.items():
        drafts = await task
        results[league_id] = drafts
    
    return results

async def get_all_draft_picks(draft_ids: List[str]) -> Dict[str, List[Dict]]:
    """Get pick data for multiple drafts in parallel"""
    
    pick_tasks = {
        draft_id: sleeper_service.get_draft_picks(draft_id)
        for draft_id in draft_ids
    }
    
    results = {}
    for draft_id, task in pick_tasks.items():
        picks = await task
        results[draft_id] = picks
    
    return results

async def get_all_season_transactions(league_ids: List[str], rounds: int = 18) -> Dict[str, List[Dict]]:
    """Get all transactions for multiple leagues in parallel"""
    
    tasks = {}
    for league_id in league_ids:
        for round_num in range(rounds):
            key = f"{league_id}_{round_num}"
            tasks[key] = sleeper_service.get_transactions(league_id, round_num)
    
    results = {}
    for key, task in tasks.items():
        data = await task
        league_id = key.rsplit('_', 1)[0]
        if league_id not in results:
            results[league_id] = []
        results[league_id].extend(data)
    
    return results

def merge_draft_data(drafts_by_league: Dict[str, List[Dict]]) -> Dict[str, Dict]:
    """Merge draft data from all seasons, current year takes precedence"""
    
    player_map = {}
    
    # Process in reverse (oldest to newest)
    for league_id, draft_list in drafts_by_league.items():
        if not draft_list:
            continue
        
        picks = draft_list.get('picks', []) if isinstance(draft_list, dict) else []
        
        for pick in picks:
            if not isinstance(pick, dict):
                continue
            
            player_id = str(pick.get('player_id', ''))
            if player_id and player_id not in player_map:
                player_map[player_id] = {
                    'player_id': player_id,
                    'first_name': pick.get('metadata', {}).get('first_name', ''),
                    'last_name': pick.get('metadata', {}).get('last_name', ''),
                    'position': pick.get('metadata', {}).get('position', ''),
                    'amount': pick.get('metadata', {}).get('amount', 0),
                    'season': pick.get('season', 0)
                }
    
    return player_map

def get_contract_value(player_id: int, league_id: int, current_season: int) -> int:
    """Get remaining contract value for a player"""

    # Ensure contract_amount column exists for older DBs
    try:
        result = db.session.execute(text("PRAGMA table_info(contract)"))
        columns = [row[1] for row in result.fetchall()]
        if "contract_amount" not in columns:
            db.session.execute(text("ALTER TABLE contract ADD COLUMN contract_amount INTEGER"))
            db.session.commit()
    except Exception as e:
        logger.warning(f"Could not ensure contract_amount column: {e}")
    
    contracts = Contract.query.filter_by(
        league_id=league_id,
        player_id=player_id
    ).order_by(Contract.id.desc()).all()
    
    for contract in contracts:
        amnesty = AmnestyPlayer.query.filter_by(contract_id=contract.id).first()
        if not amnesty:
            remaining = contract.contract_length - (current_season - contract.season)
            return max(0, remaining)
    
    return 0

def get_league_info(league_id: int) -> Dict:
    """Get cached league configuration"""
    
    league_info = LeagueInfo.query.filter_by(league_id=league_id).first()
    if not league_info:
        return {}
    
    return {
        'league_id': league_info.league_id,
        'is_auction': bool(league_info.is_auction),
        'is_keeper': bool(league_info.is_keeper),
        'money_per_team': league_info.money_per_team,
        'keepers_allowed': league_info.keepers_allowed,
        'rfa_allowed': league_info.rfa_allowed,
        'amnesty_allowed': league_info.amnesty_allowed,
        'extension_allowed': league_info.extension_allowed,
        'extension_length': league_info.extension_length,
        'max_contract_length': league_info.max_contract_length,
        'rfa_length': league_info.rfa_length,
        'taxi_length': league_info.taxi_length,
        'rollover_every': league_info.rollover_every,
        'creation_date': league_info.creation_date
    }

def calculate_years_remaining(creation_date: str, target_years: int) -> int:
    """Calculate remaining years from creation date"""
    
    try:
        created = datetime.strptime(creation_date, "%Y-%m-%d")
        today = datetime.today()
        years_passed = today.year - created.year
        
        if (today.month, today.day) < (created.month, created.day):
            years_passed -= 1
        
        return max(0, target_years - years_passed)
    except Exception as e:
        logger.error(f"Error calculating years: {e}")
        return target_years


# ============================================================================
# League Chain Functions - Query contracts across all seasons in a league chain
# ============================================================================

def get_league_chain_ids(league_id: int) -> List[int]:
    """
    Get all league IDs in the chain for a given league (current or historical)
    
    Args:
        league_id: Any league ID in the chain (current or historical)
        
    Returns:
        List of league IDs in order from newest to oldest [current...original]
    """
    from .models import LeagueChain
    import json
    
    try:
        # Try to find by current_league_id or original_league_id
        chain = LeagueChain.query.filter(
            (LeagueChain.current_league_id == league_id) |
            (LeagueChain.original_league_id == league_id)
        ).first()
        
        if chain:
            league_ids = json.loads(chain.league_ids)
            logger.info(f"Found league chain for {league_id}: {league_ids}")
            return league_ids
        # If not found in league_chain table, resolve via Sleeper API and persist
        try:
            league_ids = sleeper_service.get_league_chain(str(league_id)) or [str(league_id)]
            league_ids_int = [int(lid) for lid in league_ids]
            if league_ids_int:
                original_league_id = league_ids_int[-1]
                current_league_id = league_ids_int[0]
                payload = json.dumps(league_ids_int)
                existing = LeagueChain.query.filter_by(original_league_id=original_league_id).first()
                if existing:
                    existing.current_league_id = current_league_id
                    existing.league_ids = payload
                    existing.last_updated = db.func.now()
                    db.session.add(existing)
                else:
                    db.session.add(LeagueChain(
                        original_league_id=original_league_id,
                        current_league_id=current_league_id,
                        league_ids=payload
                    ))
                db.session.commit()
                logger.info(f"Resolved and stored league chain for {league_id}: {league_ids_int}")
                return league_ids_int
        except Exception as e:
            logger.warning(f"Failed to resolve league chain via Sleeper for {league_id}: {e}")

        # Fallback to single league
        logger.warning(f"No league chain found for league {league_id}, using single league")
        return [league_id]
    except Exception as e:
        logger.error(f"Error getting league chain: {e}")
        return [league_id]


def get_all_contracts_in_chain(league_id: int, current_season: int = None) -> List[Dict]:
    """
    Get all contracts across all leagues in the chain
    
    Args:
        league_id: Any league ID in the chain
        current_season: Current NFL season for validity checking
        
    Returns:
        List of contract dicts with contract info
    """
    from .models import Contract, AmnestyPlayer
    import json
    
    if not current_season:
        current_season = int(sleeper_service.get_current_nfl_state().get('season', 2026))
    
    # Get all league IDs in the chain
    league_ids = get_league_chain_ids(league_id)
    logger.info(f"Querying contracts across {len(league_ids)} leagues: {league_ids}")
    
    # Query contracts from all leagues in the chain
    contracts = Contract.query.filter(Contract.league_id.in_(league_ids)).all()
    
    result = []
    for contract in contracts:
        # Check if amnestied
        amnesty_records = AmnestyPlayer.query.filter_by(
            contract_id=contract.id
        ).all()
        
        # Calculate if active
        contract_end_season = contract.season + contract.contract_length - 1
        is_expired = current_season > contract_end_season
        is_amnestied = bool(amnesty_records)
        is_active = not is_expired and not is_amnestied
        
        result.append({
            'id': contract.id,
            'league_id': contract.league_id,
            'player_id': contract.player_id,
            'team_id': contract.team_id,
            'contract_length': contract.contract_length,
            'contract_start_season': contract.season,
            'contract_end_season': contract_end_season,
            'is_active': is_active,
            'is_expired': is_expired,
            'is_amnestied': is_amnestied
        })
    
    logger.info(f"Found {len(result)} total contracts across all leagues in chain")
    return result


def get_all_amnestied_players_in_chain(league_id: int) -> List[Dict]:
    """
    Get all amnestied players across all leagues in the chain
    
    Args:
        league_id: Any league ID in the chain
        
    Returns:
        List of amnestied player records
    """
    from .models import AmnestyPlayer
    
    # Get all league IDs in the chain
    league_ids = get_league_chain_ids(league_id)
    logger.info(f"Querying amnestied players across {len(league_ids)} leagues")
    
    # Query amnesty records from all leagues in the chain
    amnesty_players = AmnestyPlayer.query.filter(
        AmnestyPlayer.league_id.in_(league_ids)
    ).all()
    
    result = []
    for amnesty in amnesty_players:
        result.append({
            'league_id': amnesty.league_id,
            'player_id': amnesty.player_id,
            'team_id': amnesty.team_id,
            'contract_id': amnesty.contract_id,
            'season': amnesty.season
        })
    
    logger.info(f"Found {len(result)} amnestied players across all leagues")
    return result


def get_all_rfa_players_in_chain(league_id: int) -> List[Dict]:
    """
    Get all RFA players across all leagues in the chain
    
    Args:
        league_id: Any league ID in the chain
        
    Returns:
        List of RFA player records
    """
    from .models import RfaPlayer
    
    # Get all league IDs in the chain
    league_ids = get_league_chain_ids(league_id)
    logger.info(f"Querying RFA players across {len(league_ids)} leagues")
    
    # Query RFA records from all leagues in the chain
    rfa_players = RfaPlayer.query.filter(
        RfaPlayer.league_id.in_(league_ids)
    ).all()
    
    result = []
    for rfa in rfa_players:
        result.append({
            'league_id': rfa.league_id,
            'player_id': rfa.player_id,
            'team_id': rfa.team_id,
            'contract_id': rfa.contract_id,
            'contract_length': rfa.contract_length,
            'season': rfa.season
        })
    
    logger.info(f"Found {len(result)} RFA players across all leagues")
    return result


def get_all_extensions_in_chain(league_id: int) -> List[Dict]:
    """
    Get all contract extensions across all leagues in the chain
    
    Args:
        league_id: Any league ID in the chain
        
    Returns:
        List of extension records
    """
    from .models import ExtensionPlayer
    
    # Get all league IDs in the chain
    league_ids = get_league_chain_ids(league_id)
    logger.info(f"Querying extensions across {len(league_ids)} leagues")
    
    # Query extension records from all leagues in the chain
    extensions = ExtensionPlayer.query.filter(
        ExtensionPlayer.league_id.in_(league_ids)
    ).all()
    
    result = []
    for ext in extensions:
        result.append({
            'league_id': ext.league_id,
            'player_id': ext.player_id,
            'team_id': ext.team_id,
            'contract_id': ext.contract_id,
            'contract_length': ext.contract_length,
            'season': ext.season
        })
    
    logger.info(f"Found {len(result)} extensions across all leagues")
    return result


def get_player_contract_history(player_id: int, league_id: int) -> List[Dict]:
    """
    Get complete contract history for a player across all leagues in the chain
    
    Args:
        player_id: Sleeper player ID
        league_id: Any league ID in the chain
        
    Returns:
        List of all contract-related records (contracts, amnesties, RFAs, extensions)
    """
    from .models import Contract, AmnestyPlayer, RfaPlayer, ExtensionPlayer
    
    # Get all league IDs in the chain
    league_ids = get_league_chain_ids(league_id)
    logger.info(f"Querying contract history for player {player_id} across {len(league_ids)} leagues")
    
    # Query all related records
    contracts = Contract.query.filter(
        Contract.player_id == player_id,
        Contract.league_id.in_(league_ids)
    ).all()
    
    amnesties = AmnestyPlayer.query.filter(
        AmnestyPlayer.player_id == player_id,
        AmnestyPlayer.league_id.in_(league_ids)
    ).all()
    
    rfas = RfaPlayer.query.filter(
        RfaPlayer.player_id == player_id,
        RfaPlayer.league_id.in_(league_ids)
    ).all()
    
    extensions = ExtensionPlayer.query.filter(
        ExtensionPlayer.player_id == player_id,
        ExtensionPlayer.league_id.in_(league_ids)
    ).all()
    
    result = {
        'player_id': player_id,
        'contracts': [{
            'id': c.id,
            'league_id': c.league_id,
            'team_id': c.team_id,
            'contract_length': c.contract_length,
            'season': c.season
        } for c in contracts],
        'amnesties': [{
            'league_id': a.league_id,
            'team_id': a.team_id,
            'contract_id': a.contract_id,
            'season': a.season
        } for a in amnesties],
        'rfas': [{
            'league_id': r.league_id,
            'team_id': r.team_id,
            'contract_id': r.contract_id,
            'contract_length': r.contract_length,
            'season': r.season
        } for r in rfas],
        'extensions': [{
            'league_id': e.league_id,
            'team_id': e.team_id,
            'contract_id': e.contract_id,
            'contract_length': e.contract_length,
            'season': e.season
        } for e in extensions]
    }
    
    logger.info(f"Player {player_id} contract history: {len(contracts)} contracts, {len(amnesties)} amnesties, {len(rfas)} RFAs, {len(extensions)} extensions")
    return result
