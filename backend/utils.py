from datetime import datetime
import json
import asyncio
import os
import time
from aiohttp import ClientSession
import logging
from models import AmnestyPlayer, ExtensionPlayer, LeagueInfo, RfaPlayer

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
async def get_previous_season_league_id(user_id):
    current_year = time.localtime().tm_year
    previous_season = current_year - 1
    leagues_url = f"https://api.sleeper.app/v1/user/{user_id}/leagues/nfl/{previous_season}"
    leagues = await fetch_data(leagues_url)

    if leagues:
        return leagues[0]['league_id']
    return None

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

def merge_draft_data(current_draft, previous_draft):
    previous_draft_map = {player['player_id']: player for player in previous_draft}
    merged_draft = []
    for player in current_draft:
        if player['player_id'] in previous_draft_map:
            merged_draft.append(previous_draft_map[player['player_id']])
        else:
            merged_draft.append(player)

    merged_draft.extend([player for player_id, player in previous_draft_map.items() if player_id not in {p['player_id'] for p in current_draft}])
    
    return merged_draft

def get_amnesty_rfa_extension_data(players_with_id_and_amount, league_id):
    # Get all Amnesty, RFA, and Extension records for the given league
    amnesty_players = AmnestyPlayer.query.filter_by(league_id=league_id).all()
    rfa_players = RfaPlayer.query.filter_by(league_id=league_id).all()
    extension_players = ExtensionPlayer.query.filter_by(league_id=league_id).all()
    # Convert the query results to dictionaries for easier lookup
    amnesty_dict = {player.player_id: True for player in amnesty_players}
    rfa_dict = {player.player_id: player.contract_length for player in rfa_players}
    extension_dict = {player.player_id: player.contract_length for player in extension_players}
    # Loop through each player and update with amnesty, RFA, or extension data if applicable
    for player in players_with_id_and_amount:
        player_id = int(player['player_id'])

        # Check and update Amnesty data
        if player_id in amnesty_dict:
            player['amnesty'] = True

        # Check and update RFA data
        if player_id in rfa_dict:
            player['rfa_contract_length'] = rfa_dict[player_id]

        # Check and update Extension data
        if player_id in extension_dict:
            player['extension_contract_length'] = extension_dict[player_id]

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

    return years_remaining