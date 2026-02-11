from .extensions import db
from sqlalchemy import func
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

class Contract(db.Model):
    __tablename__ = 'contract'
    
    league_id = db.Column(db.Integer, primary_key=True, nullable=False)
    player_id = db.Column(db.Integer, primary_key=True, nullable=False)
    team_id = db.Column(db.Integer)
    contract_amount = db.Column(db.Integer, nullable=True)
    contract_length = db.Column(db.Integer, nullable=False)
    season = db.Column(db.Integer, nullable=False, default=db.func.strftime('%Y', 'now'))
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    created_at = db.Column(db.DateTime, nullable=True, default=db.func.now())

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
    created_at = db.Column(db.DateTime, nullable=True, default=db.func.now())

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
    created_at = db.Column(db.DateTime, nullable=True, default=db.func.now())

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
    created_at = db.Column(db.DateTime, nullable=True, default=db.func.now())

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
    max_contract_length = db.Column(db.Integer, nullable=True)
    rfa_length = db.Column(db.Integer, nullable=True)
    taxi_length = db.Column(db.Integer, nullable=False)
    rollover_every = db.Column(db.Integer, nullable=False)
    creation_date= db.Column(db.Text, nullable=False)
    
class LocalPlayer(db.Model):
    __tablename__ = 'local_players'
    
    player_id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String)
    last_name = db.Column(db.String)
    position = db.Column(db.String)

# Cached player headshots from Sleeper CDN (base64-encoded)
class PlayerImage(db.Model):
    __tablename__ = 'player_images'

    player_id = db.Column(db.Integer, primary_key=True, nullable=False)
    image_base64 = db.Column(db.Text, nullable=False)
    content_type = db.Column(db.String, nullable=False, default="image/jpeg")
    updated_at = db.Column(db.DateTime, nullable=False, default=db.func.now())

# Add this LeagueChain model to models.py

class LeagueChain(db.Model):
    """Maps league IDs across years to track league history"""
    __tablename__ = 'league_chain'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    original_league_id = db.Column(db.Integer, nullable=False, unique=True)  # First league in chain
    current_league_id = db.Column(db.Integer, nullable=False)  # Most recent league ID
    league_ids = db.Column(db.String, nullable=False)  # JSON list of all league IDs in order
    last_updated = db.Column(db.DateTime, default=db.func.now())
    
    def __repr__(self):
        return f"<LeagueChain original={self.original_league_id} current={self.current_league_id}>"


class SleeperApiCache(db.Model):
    """Persistent cache for Sleeper API responses"""
    __tablename__ = 'sleeper_api_cache'

    url = db.Column(db.String, primary_key=True, nullable=False)
    response_json = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=False, default=db.func.now())


class SleeperLeague(db.Model):
    __tablename__ = 'sleeper_league'

    league_id = db.Column(db.Integer, primary_key=True, nullable=False)
    data_json = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=False, default=db.func.now())


class SleeperRosters(db.Model):
    __tablename__ = 'sleeper_rosters'

    league_id = db.Column(db.Integer, primary_key=True, nullable=False)
    data_json = db.Column(db.Text, nullable=False)  # list of rosters
    updated_at = db.Column(db.DateTime, nullable=False, default=db.func.now())


class SleeperUsers(db.Model):
    __tablename__ = 'sleeper_users'

    league_id = db.Column(db.Integer, primary_key=True, nullable=False)
    data_json = db.Column(db.Text, nullable=False)  # list of users
    updated_at = db.Column(db.DateTime, nullable=False, default=db.func.now())


class SleeperDrafts(db.Model):
    __tablename__ = 'sleeper_drafts'

    league_id = db.Column(db.Integer, primary_key=True, nullable=False)
    data_json = db.Column(db.Text, nullable=False)  # list of drafts
    updated_at = db.Column(db.DateTime, nullable=False, default=db.func.now())


class SleeperDraftPicks(db.Model):
    __tablename__ = 'sleeper_draft_picks'

    draft_id = db.Column(db.Integer, primary_key=True, nullable=False)
    data_json = db.Column(db.Text, nullable=False)  # list of picks
    updated_at = db.Column(db.DateTime, nullable=False, default=db.func.now())


class SleeperTransactions(db.Model):
    __tablename__ = 'sleeper_transactions'

    league_id = db.Column(db.Integer, primary_key=True, nullable=False)
    round_num = db.Column(db.Integer, primary_key=True, nullable=False)
    data_json = db.Column(db.Text, nullable=False)  # list of transactions
    updated_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
