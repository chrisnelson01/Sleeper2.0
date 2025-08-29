from datetime import datetime
import json
import asyncio
import os
import time
from aiohttp import ClientSession
import logging
from backend.models import AmnestyPlayer, ExtensionPlayer, LeagueInfo, RfaPlayer

logging.basicConfig(level=logging.INFO)

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