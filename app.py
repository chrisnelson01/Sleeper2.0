import json
from flask import Flask, jsonify
from flask_cors import CORS
import requests
import csv

app = Flask(__name__)
CORS(app)

# Read data from the CSV file
csv_file = "contracts.csv"
three_year_contracts = []
two_year_contracts = []

with open(csv_file, mode="r") as csvfile:
    reader = csv.reader(csvfile)
    next(reader)  # Skip the header row

    for row in reader:
        # Check if both columns have values and are not empty
        if len(row) == 2 and all(cell.strip() != "" for cell in row):
            # Extract only the player_id
            three_year_contracts.append(row[0].split(":")[0])
            two_year_contracts.append(row[1].split(":")[0])
            
with open("players.json", 'r') as json_file:
    other_players = json.load(json_file)
@app.route('/api/rosters')
def get_data():
    try:
        response = requests.get(
            "https://api.sleeper.app/v1/league/991955407021158400/rosters")
        users = requests.get(
            "https://api.sleeper.app/v1/league/991955407021158400/users")
        draft = requests.get(
            "https://api.sleeper.app/v1/draft/991955407893565440/picks")
        waiver_data = []

        for round_num in range(0, 17 + 1):
            url = f"https://api.sleeper.app/v1/league/991955407021158400/transactions/{round_num}"
            waiver = requests.get(url)
            waiver_data2 = waiver.json()
            waiver_data.extend(waiver_data2)

        # Parse the JSON responses directly
        player_data = draft.json()

        rosters = response.json()
        owners = users.json()

        # Initialize a dictionary to store the total amount for each owner
        owner_totals = {}

        # Fetch additional player data from another JSON file or API
        filtered_rosters = []
        filtered_player_data = []
        for player_info in player_data:
            filtered_player_data.append(
                {'player_id': player_info['metadata']['player_id'],
                'first_name': player_info['metadata']['first_name'],
                'last_name': player_info['metadata']['last_name'],
                'amount': player_info['metadata']['amount']})

        # Update the filtered_rosters list based on contract information
        for entry in rosters:
            players_list = entry['players']
            owner_id = entry['owner_id']
            roster_id = entry['roster_id']
            display_name = ""
            for owner in owners:
                if owner['user_id'] == owner_id:
                    display_name = owner['display_name']
                    break

            # Initialize a list to store player information including 'id' and 'amount'
            players_with_id_and_amount = []

            for player in players_list:
                # Check if the player exists in filtered_player_data
                player_info = next(
                    (draft_pick for draft_pick in filtered_player_data if draft_pick['player_id'] == player), None)

                if player_info:
                    players_with_id_and_amount.append(player_info)
                    continue

                for waiver_entry in waiver_data:
                    adds = waiver_entry.get('adds')
                    if adds is not None:
                        first_adds_value = next(iter(adds.keys()), None)
                        if first_adds_value == player:
                            for waiver_player in other_players:
                                if waiver_player['player_id'] == player:
                                    players_with_id_and_amount.append(
                                        {'player_id': player, 'first_name': waiver_player['first_name'], 'last_name': waiver_player['last_name'], 'amount': "1"})
                                    break
                            break

            # Calculate the total amount for the owner
            total_amount = sum(
                int(player_info.get('amount', 0)) for player_info in players_with_id_and_amount)

            # Update the owner_totals dictionary
            owner_totals[owner_id] = owner_totals.get(owner_id, 0) + total_amount
            amount_remaining = 250 - total_amount
            
            # Update player contracts in filtered_rosters
            for player_info in players_with_id_and_amount:
                player_id = player_info['player_id']
                if player_id in three_year_contracts:
                    player_info['contract'] = '3'
                elif player_id in two_year_contracts:
                    player_info['contract'] = '2'
                else:
                    player_info['contract'] = '1'

            filtered_rosters.append(
                {'owner_id': owner_id, 'display_name': display_name, 'roster_id': roster_id, 'number of players': len(players_with_id_and_amount), 'total_amount': total_amount, 'players': players_with_id_and_amount})
        
        return jsonify(filtered_rosters)
        
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
