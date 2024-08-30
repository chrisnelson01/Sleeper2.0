import sqlite3
import pandas as pd
import os

# Path to the database
db_path = os.path.join(os.getcwd(), 'instance', 'league_data.db')

# League ID
league_id = 1089389353807233024

# Connect to the SQLite database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Clear existing data in the contract table
cursor.execute("DELETE FROM contract")
conn.commit()

# Read the CSV file
df = pd.read_csv('contracts.csv')

# Function to parse and insert player contracts
def insert_contract(player_data, contract_length):
    for player_entry in player_data.dropna():
        # Player entry is in the format: "player_id:Player Name"
        player_id, player_name = player_entry.split(':')
        cursor.execute(
            "INSERT INTO contract (league_id, player_id, contract_length) VALUES (?, ?, ?)",
            (league_id, int(player_id), contract_length)
        )

# Insert 3-year contracts
insert_contract(df['3 year'], 3)

# Insert 2-year contracts
insert_contract(df['2 year'], 2)

# Commit the changes to the database
conn.commit()

# Close the database connection
conn.close()

print("Contracts imported successfully!")
