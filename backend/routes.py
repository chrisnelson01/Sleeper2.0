import datetime
import logging
import time
import asyncio
from flask import Blueprint, jsonify, request
from utils import calculate_years_remaining_from_creation, fetch_data, get_amnesty_rfa_extension_data, get_league_info, get_waiver_data_async, get_all_previous_season_league_ids, load_local_players_data, merge_draft_data
from models import *
from extensions import db  # Assuming 'db' is from an 'extensions' module where SQLAlchemy is initialized

api = Blueprint('api', __name__)

logging.basicConfig(level=logging.INFO)

@api.route('/api/rosters/<league_id>/<user_id>')
async def get_data_route(league_id, user_id):
    try:
        start_time = time.time()

        # Fetch all previous season league ids starting from 2023
        previous_league_ids = await get_all_previous_season_league_ids(user_id)
        
        league_info = get_league_info(league_id)
        
        # Fetch relevant data concurrently
        response, users, current_drafts = await asyncio.gather(
            fetch_data(f"https://api.sleeper.app/v1/league/{league_id}/rosters"),
            fetch_data(f"https://api.sleeper.app/v1/league/{league_id}/users"),
            fetch_data(f"https://api.sleeper.app/v1/league/{league_id}/drafts")
        )

        # Fetch previous draft data if available
        previous_draft_data = []
        for year, league_ids in previous_league_ids.items():
            for prev_league_id in league_ids:
                previous_drafts = await fetch_data(f"https://api.sleeper.app/v1/league/{prev_league_id}/drafts")
                if previous_drafts:
                    previous_draft_id = previous_drafts[0]['draft_id']
                    draft_data = await fetch_data(f"https://api.sleeper.app/v1/draft/{previous_draft_id}/picks")
                    previous_draft_data.extend(draft_data)
        
        # Fetch current draft data
        current_draft_id = current_drafts[0]['draft_id']
        current_draft_data = await fetch_data(f"https://api.sleeper.app/v1/draft/{current_draft_id}/picks")
        
        # Merge current draft data with previous seasons' draft data
        merged_draft_data = merge_draft_data(current_draft_data, previous_draft_data)

        # Fetch and merge waiver data for all previous seasons
        waiver_data = []
        for year, league_ids in previous_league_ids.items():
            for prev_league_id in league_ids:
                prev_waiver_data = await get_waiver_data_async(league_id, prev_league_id)
                waiver_data.extend(prev_waiver_data)
        
        # Fetch current season waiver data
        current_waiver_data = await get_waiver_data_async(league_id, None)
        
        # Merge current waiver data with previous seasons' waiver data
        waiver_data.extend(current_waiver_data)
        local_player_data = load_local_players_data()

        # Ensure local_player_data is a dictionary (convert if necessary)
        if isinstance(local_player_data, list):
            local_player_data = {str(player['player_id']): player for player in local_player_data}

        # Initialize filtered_rosters list to hold the processed data
        league_info_list = {}
        roster_info = []
        if league_info:
            league_info_list = {
                                     "is_auction" : league_info['is_auction'],
                                     "is_keeper" : league_info['is_keeper'],
                                     "is_auction" : league_info['is_auction'],
                                     "money_per_team" : league_info['money_per_team'],
                                     "keepers_allowed" : league_info['keepers_allowed'],
                                     "rfa_allowed" : league_info['rfa_allowed'],
                                     "amnesty_allowed" : league_info['amnesty_allowed'],
                                     "extension_allowed" : league_info['extension_allowed'],
                                     "extension_length" : league_info['extension_length'],
                                     "rfa_length" : league_info['rfa_length'],
                                     "taxi_length" : league_info['taxi_length'],
                                     "rollover_every" : league_info['rollover_every']
                                     }
        # Fetch amnesty, RFA, and extension limits using SQLAlchemy ORM
        amnesty_data = AmnestyTeam.query.filter_by(league_id=league_id).all()
        rfa_data = RfaTeam.query.filter_by(league_id=league_id).all()
        extension_data = ExtensionTeam.query.filter_by(league_id=league_id).all()

        # Convert lists to dictionaries for easier lookup
        amnesty_dict = {entry.team_id: entry.amnesty_left for entry in amnesty_data}
        rfa_dict = {entry.team_id: entry.rfa_left for entry in rfa_data}
        extension_dict = {entry.team_id: entry.extension_left for entry in extension_data}
        
        # Process player data and rosters
        filtered_player_data = [{'player_id': player_info['metadata']['player_id'],
                                 'first_name': player_info['metadata']['first_name'],
                                 'last_name': player_info['metadata']['last_name'],
                                 'amount': player_info['metadata']['amount']}
                                for player_info in merged_draft_data]

        for entry in response:
            players_list = entry['players']
            owner_id = entry['owner_id']
            roster_id = entry['roster_id']
            taxi_list = entry['taxi']
            # Get user details
            owner_data = next((owner for owner in users if owner['user_id'] == owner_id), None)
            display_name = owner_data['display_name'] if owner_data else ""
            avatar_id = owner_data['avatar'] if owner_data and 'avatar' in owner_data else None
            is_owner = True if owner_data['is_owner'] else False

            players_with_id_and_amount = []
            total_amount = 0

            for player in players_list:
                player_info = next(
                    (draft_pick for draft_pick in filtered_player_data if draft_pick['player_id'] == player), None)

                if player_info:
                    # Get the contract length from the database or use 1-year default if no contract found
                    contract_length = Contract.query.filter_by(league_id=league_id, player_id=player).first()
                    player_info['contract'] = calculate_years_remaining_from_creation(contract_length.timestamp,contract_length.contract_length) if contract_length else 0

                    # Add player amount to total
                    total_amount += int(player_info['amount'])
                    players_with_id_and_amount.append(player_info)
                    continue

                # Handle waiver data
                for waiver_entries in waiver_data:
                    if isinstance(waiver_entries, list):
                        for waiver_entry in waiver_entries:
                            adds = waiver_entry.get('adds')
                            if adds and player in adds:
                                # Check if the player exists in local_player_data
                                waiver_player = local_player_data.get(str(player), {})
                                player_with_default = {
                                    'player_id': player,
                                    'first_name': waiver_player.get('first_name', 'Unknown'),
                                    'last_name': waiver_player.get('last_name', 'Unknown'),
                                    'amount': '1',
                                    'contract': 0
                                }
                                total_amount += 1
                                players_with_id_and_amount.append(player_with_default)
                                break
            if taxi_list:
                for player_info in players_with_id_and_amount:
                    if player_info['player_id'] in taxi_list:
                        player_info['contract'] = calculate_years_remaining_from_creation(league_info['creation_date'], league_info_list['taxi_length'])
                        player_info['taxi'] = True

            players_with_id_and_amount = get_amnesty_rfa_extension_data(players_with_id_and_amount, league_id)
            # Add amnesty, RFA, and extension counts to the roster data
            roster_info.append({
                'owner_id': owner_id,
                'is_owner' : is_owner,
                'display_name': display_name,
                'avatar': avatar_id,
                'roster_id': roster_id,
                'number of players': len(players_with_id_and_amount),
                'total_amount': total_amount,
                'players': players_with_id_and_amount,
                'amnesty_left': amnesty_dict.get(int(owner_id), 0),   # Amnesty count
                'rfa_left': rfa_dict.get(int(owner_id), 0),         # RFA count
                'extension_left': extension_dict.get(int(owner_id), 0)  # Extension count
            })
        logging.info(f"Time taken for processing data: {time.time() - start_time} seconds")
        combined = {"league_info": league_info_list,
                         "team_info": roster_info}
        return jsonify(combined)

    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({"error": str(e)}), 500



# Add or Update Contract Endpoint
@api.route('/api/contracts', methods=['POST', 'PUT'])
def add_or_update_contract():
    try:
        data = request.get_json()
        league_id = data.get('league_id')
        player_id = data.get('player_id')
        contract_length = data.get('contract_length')

        if not league_id or not player_id or not contract_length:
            return jsonify({'error': 'Missing league_id, player_id, or contract_length'}), 400

        contract = Contract.query.filter_by(league_id=league_id, player_id=player_id).first()

        if request.method == 'POST':
            if contract:
                return jsonify({'error': 'Contract already exists'}), 400
            new_contract = Contract(league_id=league_id, player_id=player_id, contract_length=contract_length)
            db.session.add(new_contract)
            db.session.commit()
            return jsonify({'message': 'Contract added successfully'}), 201

        if request.method == 'PUT':
            if not contract:
                return jsonify({'error': 'Contract does not exist'}), 404
            contract.contract_length = contract_length
            contract.timestamp = datetime.date.today().strftime('%Y-%m-%d')
            logging.info(contract.timestamp)
            db.session.commit()
            return jsonify({'message': 'Contract updated successfully'}), 200

    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({'error': 'An error occurred while processing the contract'}), 500


# Fetch contracts for a league or a specific player
@api.route('/api/contracts/<int:league_id>', methods=['GET'])
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
            return jsonify({
                'league_id': league_id,
                'player_id': player_id,
                'contract_length': 1  # Default to 1-year contract if not found
            }), 200
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
            return jsonify([]), 200  # Return an empty list if no contracts found

# Fetch rules for a league
@api.route('/api/rules/<int:league_id>', methods=['GET'])
def get_rules(league_id):
    try:
        rules = Rule.query.filter_by(league_id=league_id).all()
        if not rules:
            return jsonify([]), 200  # Return an empty list if no rules are found

        # Return the list of rules
        return jsonify([
            {
                'rule_id': rule.rule_id,
                'league_id': rule.league_id,
                'rule_text': rule.rule_text
            } for rule in rules
        ]), 200

    except Exception as e:
        logging.error(f"Error fetching rules: {e}")
        return jsonify({'error': 'An error occurred while fetching the rules'}), 500
    
@api.route('/api/rules/<int:league_id>', methods=['PUT'])
def update_rules(league_id):
    try:
        updated_rules = request.get_json()
        if not updated_rules:
            return jsonify({'error': 'No data provided'}), 400

        for updated_rule in updated_rules:
            rule = Rule.query.filter_by(league_id=league_id, rule_id=updated_rule['rule_id']).first()
            if rule:
                rule.rule_text = updated_rule['rule_text']
            else:
                return jsonify({'error': f"Rule ID {updated_rule['rule_id']} not found"}), 404

        db.session.commit()
        return jsonify({'message': 'Rules updated successfully'}), 200

    except Exception as e:
        logging.error(f"Error updating rules: {e}")
        return jsonify({'error': 'An error occurred while updating the rules'}), 500
    
@api.route('/api/amnesty', methods=['POST', 'PUT', 'DELETE'])
def add_or_update_amnesty():
    try:
        data = request.get_json()
        league_id = data.get('league_id')
        player_id = data.get('player_id')
        team_id = data.get('team_id')

        if not league_id or not team_id:
            return jsonify({'error': 'Missing league_id or team_id'}), 400

        # Fetch the amnesty record for the player
        amnesty = AmnestyPlayer.query.filter_by(league_id=league_id, player_id=player_id).first()
        amnesty_team = AmnestyTeam.query.filter_by(league_id=league_id, team_id=team_id).first()

        if not amnesty_team:
            return jsonify({'error': 'Amnesty data does not exist for team'}), 404

        if request.method == 'POST':
            if amnesty:
                return jsonify({'error': 'Amnesty already exists for player'}), 400
            
            if amnesty_team.amnesty_left <= 0:
                return jsonify({'error': 'No amnesty actions left for the team'}), 400
            
            # Add new amnesty for the player
            new_amnesty = AmnestyPlayer(league_id=league_id, player_id=player_id)
            db.session.add(new_amnesty)
            
            # Decrease the team's amnesty_left by 1
            amnesty_team.amnesty_left -= 1
            db.session.commit()

            return jsonify({'message': 'Amnesty added successfully for player. Amnesty left for team decreased by 1.'}), 201

        elif request.method == 'PUT':
            if not amnesty:
                return jsonify({'error': 'Amnesty does not exist for player'}), 404
            
            # No specific update to do for player amnesty
            db.session.commit()
            return jsonify({'message': 'Amnesty updated successfully for player'}), 200

        elif request.method == 'DELETE':
            if not amnesty:
                return jsonify({'error': 'Amnesty does not exist for player'}), 404

            # Remove amnesty for the player
            db.session.delete(amnesty)

            # Increase the team's amnesty_left by 1
            amnesty_team.amnesty_left += 1
            db.session.commit()

            return jsonify({'message': 'Amnesty removed successfully for player. Amnesty left for team increased by 1.'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/rfa', methods=['POST', 'PUT', 'DELETE'])
def add_or_update_rfa():
    try:
        data = request.get_json()
        league_id = data.get('league_id')
        player_id = data.get('player_id')
        team_id = data.get('team_id')
        contract_length = data.get('contract_length')
        if not league_id or not team_id:
            return jsonify({'error': 'Missing league_id or team_id'}), 400

        # Fetch the RFA record for the player
        rfa = RfaPlayer.query.filter_by(league_id=league_id, player_id=player_id).first()
        rfa_team = RfaTeam.query.filter_by(league_id=league_id, team_id=team_id).first()
        
        if not rfa_team:
            return jsonify({'error': 'RFA data does not exist for team'}), 404

        if request.method == 'POST':
            if rfa:
                return jsonify({'error': 'RFA already exists for player'}), 400
            
            if rfa_team.rfa_left <= 0:
                return jsonify({'error': 'No RFA actions left for the team'}), 400
            
            # Add new RFA for the player
            new_rfa = RfaPlayer(league_id=league_id, player_id=player_id, contract_length=contract_length)
            db.session.add(new_rfa)
            
            # Decrease the team's rfa_left by 1
            rfa_team.rfa_left -= 1
            db.session.commit()

            return jsonify({'message': 'RFA added successfully for player. RFA left for team decreased by 1.'}), 201

        elif request.method == 'PUT':
            if not rfa:
                return jsonify({'error': 'RFA does not exist for player'}), 404
            
            # No specific update to do for player RFA
            db.session.commit()
            return jsonify({'message': 'RFA updated successfully for player'}), 200

        elif request.method == 'DELETE':
            if not rfa:
                return jsonify({'error': 'RFA does not exist for player'}), 404

            # Remove RFA for the player
            db.session.delete(rfa)

            # Increase the team's rfa_left by 1
            rfa_team.rfa_left += 1
            db.session.commit()

            return jsonify({'message': 'RFA removed successfully for player. RFA left for team increased by 1.'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/api/extension', methods=['POST', 'PUT', 'DELETE'])
def add_or_update_extension():
    try:
        data = request.get_json()
        league_id = data.get('league_id')
        player_id = data.get('player_id')
        team_id = data.get('team_id')
        contract_length = data.get('contract_length')
        if not league_id or not team_id:
            return jsonify({'error': 'Missing league_id or team_id'}), 400

        # Fetch the extension record for the player
        extension = ExtensionPlayer.query.filter_by(league_id=league_id, player_id=player_id).first()
        extension_team = ExtensionTeam.query.filter_by(league_id=league_id, team_id=team_id).first()

        if not extension_team:
            return jsonify({'error': 'Extension data does not exist for team'}), 404

        if request.method == 'POST':
            if extension:
                return jsonify({'error': 'Extension already exists for player'}), 400
            
            if extension_team.extension_left <= 0:
                return jsonify({'error': 'No extension actions left for the team'}), 400
            
            # Add new extension for the player
            new_extension = ExtensionPlayer(league_id=league_id, player_id=player_id, contract_length=contract_length)
            db.session.add(new_extension)
            
            # Decrease the team's extension_left by 1
            extension_team.extension_left -= 1
            db.session.commit()

            return jsonify({'message': 'Extension added successfully for player. Extension left for team decreased by 1.'}), 201

        elif request.method == 'PUT':
            if not extension:
                return jsonify({'error': 'Extension does not exist for player'}), 404
            
            # No specific update to do for player extension
            db.session.commit()
            return jsonify({'message': 'Extension updated successfully for player'}), 200

        elif request.method == 'DELETE':
            if not extension:
                return jsonify({'error': 'Extension does not exist for player'}), 404

            # Remove extension for the player
            db.session.delete(extension)

            # Increase the team's extension_left by 1
            extension_team.extension_left += 1
            db.session.commit()

            return jsonify({'message': 'Extension removed successfully for player. Extension left for team increased by 1.'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


