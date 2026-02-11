"""
Data schemas and validators for type safety and proper data handling.
Ensures consistent data structure across the application.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
import logging

logger = logging.getLogger(__name__)


@dataclass
class PlayerData:
    """Immutable player data from Sleeper API"""
    player_id: str
    first_name: str
    last_name: str
    position: str
    nfl_team: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    @staticmethod
    def from_sleeper_response(player_id: str, data: Dict) -> 'PlayerData':
        """Create PlayerData from Sleeper API response"""
        return PlayerData(
            player_id=str(player_id),
            first_name=data.get('first_name', 'Unknown'),
            last_name=data.get('last_name', 'Unknown'),
            position=data.get('position', 'N/A'),
            nfl_team=data.get('team')
        )
    
    @staticmethod
    def placeholder(player_id: str) -> 'PlayerData':
        """Create placeholder for missing player data"""
        return PlayerData(
            player_id=str(player_id),
            first_name='Unknown',
            last_name=f'(ID: {player_id})',
            position='N/A'
        )


@dataclass
class RosterPlayer:
    """Player on a roster with contract and salary info"""
    player_id: str
    first_name: str
    last_name: str
    position: str
    amount: int = 0
    contract_years: int = 0
    nfl_team: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    @staticmethod
    def from_player_data(
        player: PlayerData,
        amount: int = 0,
        contract_years: int = 0
    ) -> 'RosterPlayer':
        """Create RosterPlayer from PlayerData"""
        return RosterPlayer(
            player_id=player.player_id,
            first_name=player.first_name,
            last_name=player.last_name,
            position=player.position,
            amount=amount,
            contract_years=contract_years,
            nfl_team=player.nfl_team
        )


@dataclass
class TeamRoster:
    """Complete team roster with metadata"""
    owner_id: str
    display_name: str
    avatar: Optional[str]
    is_owner: bool
    players: List[RosterPlayer]
    roster_id: Optional[int] = None
    total_amount: int = 0
    taxi: List[str] = field(default_factory=list)
    rfa_left: Optional[int] = None
    amnesty_left: Optional[int] = None
    extension_left: Optional[int] = None
    contracts: Optional[int] = None
    
    def to_dict(self) -> Dict:
        return {
            'owner_id': self.owner_id,
            'roster_id': self.roster_id,
            'display_name': self.display_name,
            'avatar': self.avatar,
            'is_owner': self.is_owner,
            'total_amount': self.total_amount,
            'players': [p.to_dict() for p in self.players],
            'taxi': self.taxi,
            'rfa_left': self.rfa_left,
            'amnesty_left': self.amnesty_left,
            'extension_left': self.extension_left,
            'contracts': self.contracts
        }


@dataclass
class RostersResponse:
    """Complete rosters API response"""
    team_info: List[TeamRoster]
    league_info: Dict
    current_season: int
    
    def to_dict(self) -> Dict:
        return {
            'team_info': [t.to_dict() for t in self.team_info],
            'league_info': self.league_info,
            'current_season': self.current_season
        }


def validate_sleeper_players_response(response: Any) -> Dict[str, Dict]:
    """
    Validate Sleeper API /players/nfl response.
    Returns a dict mapping player_id (string) to player data.
    """
    if not isinstance(response, dict):
        logger.error(f"Invalid players response: expected dict, got {type(response)}")
        return {}
    
    validated = {}
    for player_id, player_data in response.items():
        if not isinstance(player_data, dict):
            logger.warning(f"Skipping invalid player {player_id}: not a dict")
            continue
        
        # Ensure required fields
        if not player_data.get('first_name') or not player_data.get('last_name'):
            logger.warning(f"Skipping player {player_id}: missing name fields")
            continue
        
        validated[str(player_id)] = player_data
    
    logger.info(f"Validated {len(validated)} players from Sleeper API")
    return validated


def validate_sleeper_roster(roster: Any) -> Dict:
    """Validate a single roster from Sleeper API"""
    if not isinstance(roster, dict):
        logger.error("Invalid roster: not a dict")
        return {}
    
    return {
        'roster_id': roster.get('roster_id', 0),
        'owner_id': roster.get('owner_id'),
        'players': roster.get('players', []) if isinstance(roster.get('players'), list) else [],
        'taxi': roster.get('taxi', []) if isinstance(roster.get('taxi'), list) else []
    }


def validate_sleeper_user(user: Any) -> Dict:
    """Validate a single user from Sleeper API"""
    if not isinstance(user, dict):
        logger.error("Invalid user: not a dict")
        return {}
    
    return {
        'user_id': str(user.get('user_id', '')),
        'display_name': user.get('display_name', 'Unknown'),
        'avatar': user.get('avatar'),
        'username': user.get('username')
    }


def validate_draft_pick(pick: Any) -> Dict:
    """Validate a single draft pick from Sleeper API"""
    if not isinstance(pick, dict):
        return {}
    
    return {
        'player_id': str(pick.get('player_id', '')),
        'metadata': pick.get('metadata', {})
    }
