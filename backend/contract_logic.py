import logging
from typing import Dict, List, Optional, Tuple
from .models import Contract, AmnestyPlayer, ExtensionPlayer, LocalPlayer
from .extensions import db

logger = logging.getLogger(__name__)

class ContractValidator:
    """Validates and processes contract data"""
    
    @staticmethod
    def is_contract_active(
        contract: Contract,
        current_season: int,
        amnesty_records: List[AmnestyPlayer]
    ) -> bool:
        """
        Determine if a contract is currently active.
        
        A contract is active if:
        1. current_season <= contract_start_season + contract_length
        2. The contract has not been amnestied
        
        Args:
            contract: Contract object from database
            current_season: Current NFL season
            amnesty_records: List of amnesty records for this contract
            
        Returns:
            bool: True if contract is active, False otherwise
        """
        # Check if contract has expired
        contract_end_season = contract.season + contract.contract_length - 1
        if current_season > contract_end_season:
            logger.debug(
                f"Contract {contract.id} (player {contract.player_id}) expired. "
                f"End season: {contract_end_season}, Current: {current_season}"
            )
            return False
        
        # Check if contract was amnestied
        if amnesty_records:
            logger.debug(
                f"Contract {contract.id} (player {contract.player_id}) was amnestied"
            )
            return False
        
        logger.debug(
            f"Contract {contract.id} (player {contract.player_id}) is active. "
            f"Season range: {contract.season}-{contract_end_season}"
        )
        return True
    
    @staticmethod
    def get_player_contract_info(
        player_id: int,
        league_id: int,
        current_season: int,
        current_roster: Optional[Dict] = None
    ) -> Dict:
        """
        Get comprehensive contract information for a player.
        
        Returns contract info from database, checking validity against current season
        and amnesty/extension status.
        
        Args:
            player_id: Sleeper player ID
            league_id: League ID
            current_season: Current NFL season
            current_roster: Current roster info (for team_id updates on trade)
            
        Returns:
            Dict with keys:
                - has_contract: bool
                - contract_id: int or None
                - contract_length: int or None
                - contract_start_season: int or None
                - contract_end_season: int or None
                - is_active: bool
                - was_amnestied: bool
                - team_id: int (current team from roster or contract)
        """
        # Query contract from database
        contract = Contract.query.filter_by(
            league_id=league_id,
            player_id=player_id
        ).first()
        
        result = {
            'has_contract': False,
            'contract_id': None,
            'contract_length': None,
            'contract_start_season': None,
            'contract_end_season': None,
            'is_active': False,
            'was_amnestied': False,
            'team_id': None
        }
        
        if not contract:
            # If player has current roster, return current team
            if current_roster:
                result['team_id'] = current_roster.get('team_id')
            return result
        
        # Contract exists in database
        result['has_contract'] = True
        result['contract_id'] = contract.id
        result['contract_length'] = contract.contract_length
        result['contract_start_season'] = contract.season
        result['contract_end_season'] = contract.season + contract.contract_length - 1
        
        # Update team_id to current roster (in case of trade)
        if current_roster:
            result['team_id'] = current_roster.get('team_id')
        else:
            result['team_id'] = contract.team_id
        
        # Check if contract was amnestied
        amnesty_records = AmnestyPlayer.query.filter_by(
            contract_id=contract.id
        ).all()
        
        if amnesty_records:
            result['was_amnestied'] = True
            result['is_active'] = False
            logger.info(
                f"Player {player_id} contract {contract.id} was amnestied in season {amnesty_records[0].season}"
            )
            return result
        
        # Check if contract is still active based on season
        result['is_active'] = ContractValidator.is_contract_active(
            contract,
            current_season,
            amnesty_records
        )
        
        return result
    
    @staticmethod
    def get_active_contracts_for_league(
        league_id: int,
        current_season: int,
        player_ids: Optional[List[int]] = None
    ) -> List[Dict]:
        """
        Get all active contracts for a league.
        
        Args:
            league_id: League ID
            current_season: Current NFL season
            player_ids: Optional list of player IDs to filter by (e.g., current rosters)
            
        Returns:
            List of contract info dicts
        """
        # Query contracts
        query = Contract.query.filter_by(league_id=league_id)
        if player_ids:
            query = query.filter(Contract.player_id.in_(player_ids))
        
        contracts = query.all()
        logger.info(f"Found {len(contracts)} contracts for league {league_id}")
        
        active_contracts = []
        
        for contract in contracts:
            # Check amnesty status
            amnesty_records = AmnestyPlayer.query.filter_by(
                contract_id=contract.id
            ).all()
            
            # Determine if active
            is_active = ContractValidator.is_contract_active(
                contract,
                current_season,
                amnesty_records
            )
            
            if is_active:
                active_contracts.append({
                    'id': contract.id,
                    'player_id': contract.player_id,
                    'league_id': contract.league_id,
                    'team_id': contract.team_id,
                    'contract_length': contract.contract_length,
                    'contract_start_season': contract.season,
                    'contract_end_season': contract.season + contract.contract_length - 1,
                    'is_amnestied': bool(amnesty_records)
                })
        
        logger.info(f"Active contracts for league {league_id}: {len(active_contracts)}")
        return active_contracts