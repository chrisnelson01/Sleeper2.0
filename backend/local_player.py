from backend.extensions import db
import json
import sqlalchemy as sa
from sqlalchemy import create_engine, Column, Integer, String, exists
from sqlalchemy.orm import sessionmaker, declarative_base

# Replace with your actual database URL
DATABASE_URL = "sqlite:///instance/league_data.db"  # For SQLite; replace with your actual database URL

# Define your SQLAlchemy models
Base = declarative_base()

class LocalPlayer(Base):
    __tablename__ = 'local_players'
    
    player_id = Column(Integer, primary_key=True)
    first_name = Column(String)
    last_name = Column(String)
    position = Column(String)

# Create an engine and a session
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

# Create the table (if it doesn't already exist)
Base.metadata.create_all(engine)

def import_json_to_db(json_data):
    """Import JSON data into the database, skipping entries with missing or invalid parameters."""
    for item in json_data:
        # Validate required fields
        if not all(key in item for key in ['player_id', 'first_name', 'last_name', 'position']):
            print(f"Skipping entry due to missing parameters: {item}")
            continue
        
        # Convert player_id to an integer and check if it's valid
        try:
            player_id = int(item['player_id'])
        except ValueError:
            print(f"Invalid player_id, skipping entry: {item}")
            continue
        
        # Check if the player already exists to avoid duplicate entries
        exists_query = sa.select(sa.exists().where(LocalPlayer.player_id == player_id))
        exists_result = session.execute(exists_query).scalar()
        
        if exists_result:
            print(f"Skipping entry; already exists: {item}")
            continue
        
        # Create a new Player instance
        player = LocalPlayer(
            player_id=player_id,
            first_name=item['first_name'],
            last_name=item['last_name'],
            position=item['position']
        )
        
        # Add and commit to the database
        session.add(player)
    
    try:
        session.commit()
        print("Data imported successfully.")
    except Exception as e:
        session.rollback()
        print(f"Error during commit: {e}")

def main():
    # Replace this path with the path to your JSON file
    json_file_path = 'players.json'
    
    # Load the JSON data
    try:
        with open(json_file_path, 'r') as file:
            json_data = json.load(file)
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        return
    
    # Import JSON data into the database
    import_json_to_db(json_data)

if __name__ == "__main__":
    main()
