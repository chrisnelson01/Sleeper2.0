from extensions import db
from sqlalchemy import func # Import db from extensions.py
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

class Contract(db.Model):
    __tablename__ = 'contract'
    
    league_id = db.Column(db.Integer, primary_key=True, nullable=False)
    player_id = db.Column(db.Integer, primary_key=True, nullable=False)
    team_id = db.Column(db.Integer)
    contract_length = db.Column(db.Integer, nullable=False)
    season = db.Column(db.Integer, nullable=False, default=db.func.strftime('%Y', 'now'))
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # Define relationship to RfaPlayer
    rfa_players = relationship('RfaPlayer', back_populates='contract')
    # Define relationship to AmnestyPlayer
    amnesty_players = relationship('AmnestyPlayer', back_populates='contract')
    # Define relationship to ExtensionPlayer
    extension_players = relationship('ExtensionPlayer', back_populates='contract')

# Rule Model
class Rule(db.Model):
    __tablename__ = 'rules'
    rule_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    league_id = db.Column(db.Integer, nullable=False)
    rule_text = db.Column(db.Text, nullable=False)

class AmnestyPlayer(db.Model):
    __tablename__ = 'amnesty_player'
    
    league_id = db.Column(db.Integer, primary_key=True, nullable=False)
    player_id = db.Column(db.Integer, primary_key=True, nullable=False)
    team_id = db.Column(db.Integer, nullable=False)
    contract_id = db.Column(db.Integer, ForeignKey('contract.id'))
    season = db.Column(db.Integer, nullable=False, default=db.func.strftime('%Y', 'now'))

    # Define relationship to Contract
    contract = relationship('Contract', back_populates='amnesty_players')

# Amnesty Team Model
class AmnestyTeam(db.Model):
    __tablename__ = 'amnesty_team'
    league_id = db.Column(db.Integer, primary_key=True, nullable=False)
    team_id = db.Column(db.Integer, primary_key=True, nullable=False)
    amnesty_left = db.Column(db.Integer, nullable=True)

# RFA Player Model
class RfaPlayer(db.Model):
    __tablename__ = 'rfa_players'
    
    league_id = db.Column(db.Integer, primary_key=True, nullable=False)
    player_id = db.Column(db.Integer, primary_key=True, nullable=False)
    team_id = db.Column(db.Integer, nullable=False)
    contract_length = db.Column(db.Integer, nullable=False)
    contract_id = db.Column(db.Integer, ForeignKey('contract.id'))
    season = db.Column(db.Integer, nullable=False, default=db.func.strftime('%Y', 'now'))

    # Define relationship to Contract
    contract = relationship('Contract', back_populates='rfa_players')

# RFA Team Model
class RfaTeam(db.Model):
    __tablename__ = 'rfa_teams'
    league_id = db.Column(db.Integer, primary_key=True, nullable=False)
    team_id = db.Column(db.Integer, primary_key=True, nullable=False)
    rfa_left = db.Column(db.Integer, nullable=False)

# Extension Player Model
class ExtensionPlayer(db.Model):
    __tablename__ = 'extension_players'
    
    league_id = db.Column(db.Integer, primary_key=True, nullable=False)
    player_id = db.Column(db.Integer, primary_key=True, nullable=False)
    team_id = db.Column(db.Integer, nullable=False)
    contract_length = db.Column(db.Integer, nullable=False)
    contract_id = db.Column(db.Integer, ForeignKey('contract.id'))
    season = db.Column(db.Integer, nullable=False, default=db.func.strftime('%Y', 'now'))

    # Define relationship to Contract
    contract = relationship('Contract', back_populates='extension_players')

# Extension Team Model
class ExtensionTeam(db.Model):
    __tablename__ = 'extension_team'
    league_id = db.Column(db.Integer, primary_key=True, nullable=False)
    team_id = db.Column(db.Integer, primary_key=True, nullable=False)
    extension_left = db.Column(db.Integer, nullable=False)

class LeagueInfo(db.Model):
    __tablename__ = 'league_info'
    league_id = db.Column(db.Integer, primary_key=True, nullable=False)
    is_auction = db.Column(db.Integer, nullable=False)
    is_keeper = db.Column(db.Integer, nullable=False)
    money_per_team = db.Column(db.Integer, nullable=True)
    keepers_allowed = db.Column(db.Integer, nullable=False)
    rfa_allowed = db.Column(db.Integer, nullable=False)
    amnesty_allowed = db.Column(db.Integer, nullable=False)
    extension_allowed = db.Column(db.Integer, nullable=False)
    extension_length = db.Column(db.Integer, nullable=True)
    rfa_length = db.Column(db.Integer, nullable=True)
    taxi_length = db.Column(db.Integer, nullable=False)
    rollover_every = db.Column(db.Integer, nullable=False)
    creation_date= db.Column(db.Text, nullable=False)
    