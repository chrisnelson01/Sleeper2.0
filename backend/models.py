from extensions import db  # Import db from extensions.py

# Contract Model
class Contract(db.Model):
    __tablename__ = 'contract'
    league_id = db.Column(db.Integer, primary_key=True, nullable=False)
    player_id = db.Column(db.Integer, primary_key=True, nullable=False)
    contract_length = db.Column(db.Integer, nullable=False)

# Rule Model
class Rule(db.Model):
    __tablename__ = 'rules'
    rule_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    league_id = db.Column(db.Integer, nullable=False)
    rule_text = db.Column(db.Text, nullable=False)

# Amnesty Player Model
class AmnestyPlayer(db.Model):
    __tablename__ = 'amnesty_player'
    league_id = db.Column(db.Integer, primary_key=True, nullable=False)
    player_id = db.Column(db.Integer, primary_key=True, nullable=False)

# Amnesty Team Model
class AmnestyTeam(db.Model):
    __tablename__ = 'amnesty_team'
    league_id = db.Column(db.Integer, primary_key=True, nullable=False)
    team_id = db.Column(db.Integer, primary_key=True, nullable=False)
    amnesty_left = db.Column(db.Integer, nullable=False)

# RFA Player Model
class RfaPlayer(db.Model):
    __tablename__ = 'rfa_players'
    league_id = db.Column(db.Integer, primary_key=True, nullable=False)
    player_id = db.Column(db.Integer, primary_key=True, nullable=False)
    contract_length = db.Column(db.Integer, nullable=False)

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
    contract_length = db.Column(db.Integer, nullable=False)

# Extension Team Model
class ExtensionTeam(db.Model):
    __tablename__ = 'extension_team'
    league_id = db.Column(db.Integer, primary_key=True, nullable=False)
    team_id = db.Column(db.Integer, primary_key=True, nullable=False)
    extension_left = db.Column(db.Integer, nullable=False)
