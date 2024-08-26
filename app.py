import logging
import time
import json
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import requests
import asyncio
from aiohttp import ClientSession

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure SQLite Database URI
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///league_data.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy ORM
db = SQLAlchemy(app)

# Define the Contract model
class Contract(db.Model):
    __tablename__ = 'contract'
    league_id = db.Column(db.Integer, primary_key=True, nullable=False)
    player_id = db.Column(db.Integer, primary_key=True, nullable=False)
    contract_length = db.Column(db.Integer, nullable=False)

# Define the Rules model
class Rule(db.Model):
    __tablename__ = 'rules'
    rule_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    league_id = db.Column(db.Integer, nullable=False)
    rule_text = db.Column(db.Text, nullable=False)

# Fetch data from external API
async def fetch_data(url):
    try:
        async with ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    print(f"Error fetching data from {url}: Status code {response.status}")
                    return []
    except Exception as e:
        print(f"Exception fetching data from {url}: {e}")
        return []

# Fetch previous season's league ID for the user
async def get_previous_season_league_id(user_id):
    current_year = time.localtime().tm_year
    previous_season = current_year - 1

    leagues_url = f"https://api.sleeper.app/v1/user/{user_id}/leagues/nfl/{previous_season}"
    leagues = await fetch_data(leagues_url)

    if leagues:
        return leagues[0]['league_id']
    return None

# Fetch waiver data asynchronously
async def get_waiver_data_async(league_id):
    return await asyncio.gather(
        *[fetch_data(f"https://api.sleeper.app/v1/league/{league_id}/transactions/{round_num}") for round_num in range(0, 17 + 1)]
    )

# Merge current and previous draft data
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

# Get contract data from the database
def get_contract_data(league_id, player_id):
    contract = Contract.query.filter_by(league_id=league_id, player_id=player_id).first()
    if contract:
        return contract.contract_length
    return 1  # Default to 1-year contract if no data found

# Get all roster data
async def get_data_async(league_id, user_id):
    try:
        start_time = time.time()

        # Fetch the previous season's league ID
        previous_league_id = await get_previous_season_league_id(user_id)

        if not previous_league_id:
            return jsonify({"error": "No previous league found for this user in the previous season"}), 404

        # Fetch rosters, users, and drafts from both current and previous leagues
        response, users, current_drafts, previous_drafts = await asyncio.gather(
            fetch_data(f"https://api.sleeper.app/v1/league/{league_id}/rosters"),
            fetch_data(f"https://api.sleeper.app/v1/league/{league_id}/users"),
            fetch_data(f"https://api.sleeper.app/v1/league/{league_id}/drafts"),
            fetch_data(f"https://api.sleeper.app/v1/league/{previous_league_id}/drafts")
        )

        if not previous_drafts or not current_drafts:
            return jsonify({"error": "No drafts found for one of the leagues"}), 404

        # Fetch draft data for both current and previous leagues
        current_draft_id = current_drafts[0]['draft_id']
        previous_draft_id = previous_drafts[0]['draft_id']

        current_draft_data, previous_draft_data = await asyncio.gather(
            fetch_data(f"https://api.sleeper.app/v1/draft/{current_draft_id}/picks"),
            fetch_data(f"https://api.sleeper.app/v1/draft/{previous_draft_id}/picks")
        )

        # Merge the current and previous draft data
        merged_draft_data = merge_draft_data(current_draft_data, previous_draft_data)

        logging.info(f"Time taken for API calls: {time.time() - start_time} seconds")
        start_time = time.time()

        # Fetch waiver data
        waiver_data = await get_waiver_data_async(league_id)

        # Process player data and rosters
        filtered_player_data = [{'player_id': player_info['metadata']['player_id'],
                                 'first_name': player_info['metadata']['first_name'],
                                 'last_name': player_info['metadata']['last_name'],
                                 'amount': player_info['metadata']['amount']}
                                for player_info in merged_draft_data]

        rosters = response
        owners = users
        filtered_rosters = []

        for entry in rosters:
            players_list = entry['players']
            owner_id = entry['owner_id']
            roster_id = entry['roster_id']

            # Get user details
            owner_data = next((owner for owner in owners if owner['user_id'] == owner_id), None)
            display_name = owner_data['display_name'] if owner_data else ""
            avatar_id = owner_data['avatar'] if owner_data and 'avatar' in owner_data else None

            players_with_id_and_amount = []
            total_amount = 0

            for player in players_list:
                player_info = next(
                    (draft_pick for draft_pick in filtered_player_data if draft_pick['player_id'] == player), None)

                if player_info:
                    # Get the contract length from the database
                    contract_length = get_contract_data(league_id, player)

                    # Assign the contract length from the database
                    player_info['contract'] = str(contract_length)

                    # Add player amount to total
                    total_amount += int(player_info['amount'])
                    players_with_id_and_amount.append(player_info)
                    continue

                # Handle waiver data
                for waiver_entries in waiver_data:
                    for waiver_entry in waiver_entries:
                        adds = waiver_entry.get('adds')
                        if adds is not None and player in adds:
                            player_with_default = {
                                'player_id': player,
                                'first_name': 'Unknown',
                                'last_name': 'Unknown',
                                'amount': "1",
                                'contract': '1'
                            }
                            total_amount += 1
                            players_with_id_and_amount.append(player_with_default)
                            break

            filtered_rosters.append({
                'owner_id': owner_id,
                'display_name': display_name,
                'avatar': avatar_id,
                'roster_id': roster_id,
                'number of players': len(players_with_id_and_amount),
                'total_amount': total_amount,
                'players': players_with_id_and_amount
            })

        logging.info(f"Time taken for processing data: {time.time() - start_time} seconds")

        return jsonify(filtered_rosters)

    except Exception as e:
        logging.error("Error:", e)
        return jsonify({"error": str(e)}), 500


# Fetch rules from the database for a league
@app.route('/api/rules/<league_id>')
def get_rules(league_id):
    rules = Rule.query.filter_by(league_id=league_id).all()
    if not rules:
        return jsonify({"error": "No rules found for this league"}), 404
    
    return jsonify([{"rule_id": rule.rule_id, "rule_text": rule.rule_text} for rule in rules])


# Define the API endpoint for roster data
@app.route('/api/rosters/<league_id>/<user_id>')
def get_data_route(league_id, user_id):
    return asyncio.run(get_data_async(league_id, user_id))

# Add or Update Contract Endpoint
@app.route('/api/contracts', methods=['POST', 'PUT'])
def add_or_update_contract():
    try:
        data = request.get_json()
        print(data)
        # Get league_id, player_id, and contract_length from the request body
        league_id = data.get('league_id')
        player_id = data.get('player_id')
        contract_length = data.get('contract_length')

        if not league_id or not player_id or not contract_length:
            return jsonify({'error': 'Missing league_id, player_id or contract_length'}), 400

        # Check if contract exists
        contract = Contract.query.filter_by(league_id=league_id, player_id=player_id).first()

        if request.method == 'POST':
            if contract:
                return jsonify({'error': 'Contract already exists for this player and league'}), 400
            # Create a new contract
            new_contract = Contract(league_id=league_id, player_id=player_id, contract_length=contract_length)
            db.session.add(new_contract)
            db.session.commit()
            return jsonify({'message': 'Contract added successfully'}), 201

        if request.method == 'PUT':
            if not contract:
                return jsonify({'error': 'Contract does not exist'}), 404
            # Update the existing contract
            contract.contract_length = contract_length
            db.session.commit()
            return jsonify({'message': 'Contract updated successfully'}), 200

    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({'error': 'An error occurred while processing the contract'}), 500

# Fetch contracts for a league or a specific player within that league
@app.route('/api/contracts/<int:league_id>', methods=['GET'])
def get_contracts(league_id):
    player_id = request.args.get('player_id')

    if player_id:
        # Fetch a specific player's contract within the league
        contract = Contract.query.filter_by(league_id=league_id, player_id=player_id).first()
        if contract:
            return jsonify({
                'league_id': contract.league_id,
                'player_id': contract.player_id,
                'contract_length': contract.contract_length
            }), 200
        else:
            return jsonify({'error': 'Contract not found for the specified player'}), 404
    else:
        # Fetch all contracts for the league
        contracts = Contract.query.filter_by(league_id=league_id).all()
        if contracts:
            return jsonify([
                {
                    'league_id': contract.league_id,
                    'player_id': contract.player_id,
                    'contract_length': contract.contract_length
                } for contract in contracts
            ]), 200
        else:
            return jsonify({'error': 'No contracts found for this league'}), 404
        
if __name__ == '__main__':
    app.run(debug=True)
