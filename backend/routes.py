import logging
import time
import asyncio
from flask import Blueprint, jsonify, request

from backend.utils import (
    calculate_years_remaining_from_creation,
    fetch_data,
    get_amnesty_rfa_extension_data,
    get_league_info,
    get_waiver_data_async,
    get_all_previous_season_league_ids,
    load_local_players_data,
    merge_draft_data,
)
from backend.models import *  # (ok for now; consider explicit imports later)
from backend.extensions import db

api = Blueprint("api", __name__, url_prefix="/api")  # <-- important
logging.basicConfig(level=logging.DEBUG)

@api.route('/api/rosters/<league_id>/<user_id>')
async def get_data_route(league_id, user_id):
    try:
        start_time = time.time()

        league_info = get_league_info(league_id)
        previous_league_ids = await get_all_previous_season_league_ids(user_id, league_id)

        # Fetch data concurrently
        data_urls = [
            f"https://api.sleeper.app/v1/league/{league_id}/rosters",
            f"https://api.sleeper.app/v1/league/{league_id}/users",
            f"https://api.sleeper.app/v1/league/{league_id}/drafts",
            f"https://api.sleeper.app/v1/state/nfl"
        ]
        response, users, current_drafts, current_season = await asyncio.gather(
            *[fetch_data(url) for url in data_urls]
        )

        current_draft_id = current_drafts[0].get('draft_id') if current_drafts else None
        if not current_draft_id:
            return jsonify({"error": "Invalid draft data"}), 400

        current_draft_data = await fetch_data(f"https://api.sleeper.app/v1/draft/{current_draft_id}/picks")

        # Fetch previous draft data
        draft_tasks = [
            fetch_data(f"https://api.sleeper.app/v1/league/{prev_league_id}/drafts")
            for prev_league_id in previous_league_ids
        ]
        previous_drafts = await asyncio.gather(*draft_tasks)

        draft_data_tasks = [
            fetch_data(f"https://api.sleeper.app/v1/draft/{drafts[0]['draft_id']}/picks")
            for drafts in previous_drafts if isinstance(drafts, list) and drafts
        ]
        previous_draft_data = await asyncio.gather(*draft_data_tasks)

        merged_draft_data = merge_draft_data(current_draft_data, previous_draft_data)

        # Fetch waiver data
        waiver_tasks = [
            get_waiver_data_async(league_id, prev_league_id)
            for prev_league_id in previous_league_ids
        ]
        previous_waiver_data = await asyncio.gather(*waiver_tasks)
        current_waiver_data = await get_waiver_data_async(league_id, None)
        waiver_data = [waiver for waiver_list in previous_waiver_data for waiver in waiver_list] + current_waiver_data

        # Fetch amnesty, RFA, and extension data
        amnesty_data = AmnestyTeam.query.filter_by(league_id=league_id).all()
        rfa_data = RfaTeam.query.filter_by(league_id=league_id).all()
        extension_data = ExtensionTeam.query.filter_by(league_id=league_id).all()

        amnesty_dict = {entry.team_id: entry.amnesty_left for entry in amnesty_data}
        rfa_dict = {entry.team_id: entry.rfa_left for entry in rfa_data}
        extension_dict = {entry.team_id: entry.extension_left for entry in extension_data}

        filtered_player_data = [
            {
                'player_id': player_info['metadata']['player_id'],
                'first_name': player_info['metadata']['first_name'],
                'last_name': player_info['metadata']['last_name'],
                'amount': player_info['metadata']['amount'],
                'position': player_info['metadata']['position']
            }
            for player_info in merged_draft_data
        ]

        # Process rosters
        roster_info = []
        league_info_list = {
            "is_auction": league_info['is_auction'],
            "is_keeper": league_info['is_keeper'],
            "money_per_team": league_info['money_per_team'],
            "keepers_allowed": league_info['keepers_allowed'],
            "rfa_allowed": league_info['rfa_allowed'],
            "amnesty_allowed": league_info['amnesty_allowed'],
            "extension_allowed": league_info['extension_allowed'],
            "extension_length": league_info['extension_length'],
            "rfa_length": league_info['rfa_length'],
            "taxi_length": league_info['taxi_length'],
            "rollover_every": league_info['rollover_every'],
            "current_season": int(current_season.get('season'))
        }
        
        for entry in response:
            owner_id = entry['owner_id']
            players_list = entry['players']
            taxi_list = entry['taxi']

            owner_data = next((owner for owner in users if owner['user_id'] == owner_id), {})
            display_name = owner_data.get('display_name', "")
            avatar_id = owner_data.get('avatar')
            is_owner = owner_data.get('is_owner', False)

            players_with_id_and_amount = []
            total_amount = 0

            # Process players
            player_ids = set(players_list)
            waiver_player_ids = set()

            for player in player_ids:
                player_info = next((pi for pi in filtered_player_data if pi['player_id'] == player), None)
                if player_info:
                    contracts = Contract.query.filter_by(league_id=league_id, player_id=player).order_by(Contract.id.desc())
                    for contract in contracts:
                        amnesty_player = AmnestyPlayer.query.filter_by(contract_id=contract.id).first()
                        if not amnesty_player and contract:
                            player_info['contract'] = contract.contract_length - (int(current_season.get('season')) - contract.season)
                            break               
                        player_info['contract'] = 0
                    else:
                        player_info['contract'] = 0
                    total_amount += int(player_info['amount'])
                    players_with_id_and_amount.append(player_info)
                else:
                    waiver_player_ids.add(player)

            # Handle waiver players
            for waiver_entries in waiver_data:
                if isinstance(waiver_entries, list):
                    for waiver_entry in waiver_entries:
                        adds = waiver_entry.get('adds')
                        if adds:
                            missing_players = waiver_player_ids.intersection(adds)
                            for player in missing_players:
                                waiver_player = LocalPlayer.query.filter_by(player_id=player).first()
                                player_with_default = {
                                    'player_id': player,
                                    'first_name': waiver_player.first_name if waiver_player else 'Unknown',
                                    'last_name': waiver_player.last_name if waiver_player else 'Unknown',
                                    'contract': 0,
                                    'position': waiver_player.position if waiver_player else 'Unknown',
                                    'amount': "1"
                                }
                                total_amount += 1
                                players_with_id_and_amount.append(player_with_default)
                                waiver_player_ids.remove(player)
                            if not waiver_player_ids:
                                break

            # Handle taxi players
            if taxi_list:
                for player_info in players_with_id_and_amount:
                    if player_info['player_id'] in taxi_list:
                        player_info['taxi'] = True

            players_with_id_and_amount = get_amnesty_rfa_extension_data(players_with_id_and_amount, league_id, int(owner_id), int(current_season.get('season')))
            roster_info.append({
                'owner_id': owner_id,
                'is_owner': is_owner,
                'display_name': display_name,
                'avatar': avatar_id,
                'roster_id': entry['roster_id'],
                'number of players': len(players_with_id_and_amount),
                'total_amount': total_amount,
                'players': players_with_id_and_amount,
                'amnesty_left': amnesty_dict.get(int(owner_id), 0),
                'rfa_left': rfa_dict.get(int(owner_id), 0),
                'extension_left': extension_dict.get(int(owner_id), 0)
            })

        logging.info(f"Time taken for processing data: {time.time() - start_time} seconds")
        combined = {"league_info": league_info_list, "team_info": roster_info}
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
        team_id = data.get('team_id')
        contract_length = data.get('contract_length')
        current_season = data.get('current_season')
        if not league_id or not player_id or not contract_length:
            return jsonify({'error': 'Missing league_id, player_id, team_id, or contract_length'}), 400

        contract = Contract.query.filter_by(league_id=league_id, player_id=player_id, team_id=team_id).first()

        if request.method == 'POST':
            new_contract = Contract(league_id=league_id, player_id=player_id, team_id=team_id, contract_length=contract_length, season=current_season)
            db.session.add(new_contract)
            db.session.commit()
            return jsonify({'message': 'Contract added successfully'}), 201

        if request.method == 'PUT':
            if not contract:
                return jsonify({'error': 'Contract does not exist'}), 404
            contract.contract_length = contract_length
            contract.season = current_season
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
        season = data.get('current_season')
        if not league_id or not team_id:
            return jsonify({'error': 'Missing league_id or team_id'}), 400

        # Fetch the amnesty record for the player
        amnesty = AmnestyPlayer.query.filter_by(league_id=league_id, player_id=player_id, team_id=team_id).first()
        amnesty_team = AmnestyTeam.query.filter_by(league_id=league_id, team_id=team_id).first()
        contract = Contract.query.filter_by(league_id=league_id, team_id=team_id, player_id=player_id).first()
        if not amnesty_team:
            return jsonify({'error': 'Amnesty data does not exist for team'}), 404

        if request.method == 'POST':
            if amnesty:
                return jsonify({'error': 'Amnesty already exists for player'}), 400
            
            if amnesty_team.amnesty_left <= 0:
                return jsonify({'error': 'No amnesty actions left for the team'}), 400
            
            if not contract: 
                return jsonify({'error': 'No contract data found for the player'}), 404
            # Add new amnesty for the player
            new_amnesty = AmnestyPlayer(league_id=league_id, player_id=player_id, team_id=team_id, contract_id=contract.id, season=season)
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
        season = data.get('current_season')
        if not league_id or not team_id:
            return jsonify({'error': 'Missing league_id or team_id'}), 400

        # Fetch the RFA record for the player
        rfa = RfaPlayer.query.filter_by(league_id=league_id, player_id=player_id).first()
        rfa_team = RfaTeam.query.filter_by(league_id=league_id, team_id=team_id).first()
        contract = Contract.query.filter_by(league_id=league_id, team_id=team_id, player_id=player_id).first()
        
        if not rfa_team:
            return jsonify({'error': 'RFA data does not exist for team'}), 404

        if request.method == 'POST':
            if rfa:
                return jsonify({'error': 'RFA already exists for player'}), 400
            
            if rfa_team.rfa_left <= 0:
                return jsonify({'error': 'No RFA actions left for the team'}), 400
            if not contract: 
                return jsonify({'error': 'No contract data found for the player'}), 404
            # Add new RFA for the player
            new_rfa = RfaPlayer(league_id=league_id, player_id=player_id, team_id=team_id, contract_id=contract.id, contract_length=contract_length, season=season)
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
        season = data.get('current_season')
        if not league_id or not team_id:
            return jsonify({'error': 'Missing league_id or team_id'}), 400

        # Fetch the extension record for the player
        extension = ExtensionPlayer.query.filter_by(league_id=league_id, player_id=player_id).first()
        extension_team = ExtensionTeam.query.filter_by(league_id=league_id, team_id=team_id).first()
        contract = Contract.query.filter_by(league_id=league_id, team_id=team_id, player_id=player_id).first()
        if not extension_team:
            return jsonify({'error': 'Extension data does not exist for team'}), 404

        if request.method == 'POST':
            if extension:
                return jsonify({'error': 'Extension already exists for player'}), 400
            
            if extension_team.extension_left <= 0:
                return jsonify({'error': 'No extension actions left for the team'}), 400
            if not contract: 
                return jsonify({'error': 'No contract data found for the player'}), 404
            # Add new extension for the player
            new_extension = ExtensionPlayer(league_id=league_id, player_id=player_id, team_id=team_id, contract_id= contract.id, contract_length=contract_length, season=season)
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


