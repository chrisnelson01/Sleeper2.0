from models import AmnestyTeam, RfaTeam, ExtensionTeam
from extensions import db  # Assuming this is where your SQLAlchemy instance is initialized
from app import app

# Replace with actual league_id and owner_ids
league_id = 1089389353807233024  # Example league_id
owner_ids = [991954993001340928, 466763580436377600, 608782139755937792, 872658787947966464, 992110875253248000, 992122944367165440, 967570062817153024, 991909398618361856, 992462193385914368, 992480493587288064]  # Example owner_ids (team_ids)

# Amnesty, RFA, and Extension initial values
amnesty_left = 1
rfa_left = 1
extension_left = 1

def insert_initial_team_data():
    try:
        for owner_id in owner_ids:
            # Insert data into amnesty_team
            amnesty_team = AmnestyTeam(
                league_id=league_id,
                team_id=owner_id,
                amnesty_left=amnesty_left
            )
            db.session.add(amnesty_team)

            # Insert data into rfa_teams
            rfa_team = RfaTeam(
                league_id=league_id,
                team_id=owner_id,
                rfa_left=rfa_left
            )
            db.session.add(rfa_team)

            # Insert data into extension_team
            extension_team = ExtensionTeam(
                league_id=league_id,
                team_id=owner_id,
                extension_left=extension_left
            )
            db.session.add(extension_team)

        # Commit the transaction to save the changes
        db.session.commit()
        print("Data inserted successfully!")

    except Exception as e:
        print(f"Error inserting data: {e}")
        db.session.rollback()  # Rollback in case of any errors

# Run within application context
if __name__ == '__main__':
    with app.app_context():
        insert_initial_team_data()
