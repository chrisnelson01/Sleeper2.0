import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import requests
from .cache import sleeper_api_cache, league_cache
from .extensions import db
from .models import (
    SleeperApiCache,
    SleeperLeague,
    SleeperRosters,
    SleeperUsers,
    SleeperDrafts,
    SleeperDraftPicks,
    SleeperTransactions,
)

logger = logging.getLogger(__name__)

class SleeperAPIService:
    """Optimized Sleeper API service with caching and batching"""
    
    BASE_URL = "https://api.sleeper.app/v1"
    TIMEOUT = 10
    DEFAULT_TTL_SECONDS = 300

    def _ttl_for_url(self, url: str) -> int:
        if "/players/nfl" in url:
            return 60 * 60 * 24  # 24 hours
        if "/rosters" in url or "/users" in url:
            return 60 * 2  # 2 minutes
        if "/transactions/" in url:
            return 60  # 1 minute
        if "/drafts" in url or "/draft/" in url:
            return 60 * 30  # 30 minutes
        if "/league/" in url:
            return 60 * 5  # 5 minutes
        return self.DEFAULT_TTL_SECONDS

    def _get_db_cache(self, url: str, ttl_seconds: int) -> Optional[Dict]:
        try:
            cached = SleeperApiCache.query.filter_by(url=url).first()
            if not cached:
                return None
            if cached.updated_at and datetime.utcnow() - cached.updated_at > timedelta(seconds=ttl_seconds):
                return None
            return json.loads(cached.response_json)
        except Exception as e:
            logger.warning(f"DB cache read failed for {url}: {e}")
            return None

    def _entity_cache_fresh(self, updated_at: Optional[datetime], ttl_seconds: int) -> bool:
        if not updated_at:
            return False
        return (datetime.utcnow() - updated_at) <= timedelta(seconds=ttl_seconds)

    def _load_entity_cache(self, model, filters: Dict, ttl_seconds: int):
        try:
            row = model.query.filter_by(**filters).first()
            if not row or not self._entity_cache_fresh(row.updated_at, ttl_seconds):
                return None
            return json.loads(row.data_json)
        except Exception as e:
            logger.warning(f"Entity cache read failed for {model.__tablename__}: {e}")
            return None

    def _store_entity_cache(self, model, filters: Dict, data):
        try:
            payload = json.dumps(data)
            row = model.query.filter_by(**filters).first()
            if row:
                row.data_json = payload
                row.updated_at = db.func.now()
                db.session.add(row)
            else:
                row = model(**filters, data_json=payload)
                db.session.add(row)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.warning(f"Entity cache write failed for {model.__tablename__}: {e}")

    def _set_db_cache(self, url: str, data: Dict) -> None:
        try:
            payload = json.dumps(data)
            cached = SleeperApiCache.query.filter_by(url=url).first()
            if cached:
                cached.response_json = payload
                cached.updated_at = db.func.now()
                db.session.add(cached)
            else:
                db.session.add(SleeperApiCache(url=url, response_json=payload))
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.warning(f"DB cache write failed for {url}: {e}")
    
    def fetch(self, url: str, use_cache: bool = True) -> Dict:
        """Fetch data with optional caching"""
        
        if use_cache:
            cached = sleeper_api_cache.get(url)
            if cached is not None:
                logger.debug(f"Cache hit: {url}")
                return cached
            ttl_seconds = self._ttl_for_url(url)
            db_cached = self._get_db_cache(url, ttl_seconds)
            if db_cached is not None:
                sleeper_api_cache.set(url, db_cached)
                logger.debug(f"DB cache hit: {url}")
                return db_cached
        
        try:
            resp = requests.get(url, timeout=self.TIMEOUT)
            if resp.status_code == 200:
                data = resp.json()
                if use_cache:
                    sleeper_api_cache.set(url, data)
                    self._set_db_cache(url, data)
                return data
            else:
                logger.error(f"API error {resp.status_code}: {url}")
                return {}
        except requests.Timeout:
            logger.error(f"Timeout fetching {url}")
            return {}
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            return {}
    
    def get_league_chain(self, league_id: str) -> List[str]:
        """Get all league IDs from current year back to original"""
        cache_key = f"league_chain_{league_id}"
        cached = league_cache.get(cache_key)
        if cached is not None:
            return cached

        league_ids = []

        # Start from provided league_id and determine whether it's the most
        # recent. If the passed league is already complete, callers should
        # provide a user_id/season so we can look up the user's current
        # league; otherwise we'll treat the passed id as the current.
        current_id = str(league_id)

        try:
            league_data = self.fetch(f"{self.BASE_URL}/league/{current_id}")
        except Exception:
            league_data = {}

        # If league_data indicates this is a completed league, we may need
        # to find the current league via the user leagues endpoint. Callers
        # may call get_user_leagues separately and then call this method
        # again with the resolved current id.
        previous_id = league_data.get('previous_league_id')

        # Follow the chain backwards (limit to 20 to prevent infinite loops)
        league_ids.append(current_id)
        for _ in range(20):
            try:
                league_data = self.fetch(f"{self.BASE_URL}/league/{current_id}")
            except Exception:
                break

            previous_id = league_data.get('previous_league_id')
            if not previous_id:
                break
            league_ids.append(str(previous_id))
            current_id = str(previous_id)

        league_cache.set(cache_key, league_ids)
        logger.info(f"League chain for {league_id}: {league_ids}")
        return league_ids

    def get_user_leagues(self, user_id: str, season: Optional[str] = None) -> List[Dict]:
        """Get leagues for a user for a given season.

        Returns a list of league objects from the Sleeper API. Caller can
        pick the most recent/current league from the list.
        """
        # If caller didn't provide a season, resolve the current NFL season
        # from the Sleeper `/state/nfl` endpoint so we query the correct year.
        if not season:
            try:
                state = self.get_current_nfl_state() or {}
                season = str(state.get('league_season') or state.get('season') or '')
            except Exception:
                season = ''

        url = f"{self.BASE_URL}/user/{user_id}/leagues/nfl/{season}" if season else f"{self.BASE_URL}/user/{user_id}/leagues/nfl"
        data = self.fetch(url)
        return data if isinstance(data, list) else []
    
    def get_league_data(self, league_id: str) -> Dict:
        """Get current league data"""
        url = f"{self.BASE_URL}/league/{league_id}"
        ttl_seconds = self._ttl_for_url(url)
        cached = self._load_entity_cache(SleeperLeague, {"league_id": int(league_id)}, ttl_seconds)
        if cached is not None:
            return cached
        data = self.fetch(url)
        if isinstance(data, dict) and data:
            self._store_entity_cache(SleeperLeague, {"league_id": int(league_id)}, data)
        return data
    
    def get_rosters(self, league_id: str) -> List[Dict]:
        """Get league rosters"""
        url = f"{self.BASE_URL}/league/{league_id}/rosters"
        ttl_seconds = self._ttl_for_url(url)
        cached = self._load_entity_cache(SleeperRosters, {"league_id": int(league_id)}, ttl_seconds)
        if cached is not None:
            return cached if isinstance(cached, list) else []
        data = self.fetch(url)
        if isinstance(data, list):
            self._store_entity_cache(SleeperRosters, {"league_id": int(league_id)}, data)
        return data if isinstance(data, list) else []
    
    def get_users(self, league_id: str) -> List[Dict]:
        """Get league users"""
        url = f"{self.BASE_URL}/league/{league_id}/users"
        ttl_seconds = self._ttl_for_url(url)
        cached = self._load_entity_cache(SleeperUsers, {"league_id": int(league_id)}, ttl_seconds)
        if cached is not None:
            return cached if isinstance(cached, list) else []
        data = self.fetch(url)
        if isinstance(data, list):
            self._store_entity_cache(SleeperUsers, {"league_id": int(league_id)}, data)
        return data if isinstance(data, list) else []
    
    def get_drafts(self, league_id: str) -> List[Dict]:
        """Get league drafts"""
        url = f"{self.BASE_URL}/league/{league_id}/drafts"
        ttl_seconds = self._ttl_for_url(url)
        cached = self._load_entity_cache(SleeperDrafts, {"league_id": int(league_id)}, ttl_seconds)
        if cached is not None:
            return cached if isinstance(cached, list) else []
        data = self.fetch(url)
        if isinstance(data, list):
            self._store_entity_cache(SleeperDrafts, {"league_id": int(league_id)}, data)
        return data if isinstance(data, list) else []
    
    def get_draft_picks(self, draft_id: str) -> List[Dict]:
        """Get draft picks"""
        url = f"{self.BASE_URL}/draft/{draft_id}/picks"
        ttl_seconds = self._ttl_for_url(url)
        cached = self._load_entity_cache(SleeperDraftPicks, {"draft_id": int(draft_id)}, ttl_seconds)
        if cached is not None:
            return cached if isinstance(cached, list) else []
        data = self.fetch(url)
        if isinstance(data, list):
            self._store_entity_cache(SleeperDraftPicks, {"draft_id": int(draft_id)}, data)
        return data if isinstance(data, list) else []
    
    def get_transactions(self, league_id: str, round_num: int) -> List[Dict]:
        """Get league transactions for a round"""
        url = f"{self.BASE_URL}/league/{league_id}/transactions/{round_num}"
        ttl_seconds = self._ttl_for_url(url)
        cached = self._load_entity_cache(
            SleeperTransactions,
            {"league_id": int(league_id), "round_num": int(round_num)},
            ttl_seconds
        )
        if cached is not None:
            return cached if isinstance(cached, list) else []
        data = self.fetch(url)
        if isinstance(data, list):
            self._store_entity_cache(
                SleeperTransactions,
                {"league_id": int(league_id), "round_num": int(round_num)},
                data
            )
        return data if isinstance(data, list) else []
    
    def get_current_nfl_state(self) -> Dict:
        """Get current NFL state"""
        return self.fetch(f"{self.BASE_URL}/state/nfl")
    
    def get_player(self, player_id: str) -> Dict:
        """Get a single player by ID"""
        return self.fetch(f"{self.BASE_URL}/player/{player_id}")
    
    def get_players_nfl(self) -> Dict:
        """Get all NFL players"""
        return self.fetch(f"{self.BASE_URL}/players/nfl")

# Global instance
sleeper_service = SleeperAPIService()
