import json

def remove_team_field(file_path):
    try:
        # Read the JSON data from the file
        with open(file_path, 'r') as file:
            players_data = json.load(file)

        # Remove the 'team' field from each player
        for player in players_data:
            if 'team' in player:
                del player['team']

        # Write the updated data back to the JSON file
        with open(file_path, 'w') as file:
            json.dump(players_data, file, indent=4)

        print("Successfully removed 'team' field from all players.")
    
    except Exception as e:
        print(f"An error occurred: {e}")

# Replace 'players.json' with the path to your players.json file
file_path = 'players.json'
remove_team_field(file_path)
