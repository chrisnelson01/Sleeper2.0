from cachetools import TTLCache
from threading import Lock
from typing import Any, Dict, List
import logging

logger = logging.getLogger(__name__)

class CacheManager:
    """Thread-safe cache manager with TTL support"""
    
    def __init__(self, maxsize: int = 100, ttl: int = 300):
        self.cache = TTLCache(maxsize=maxsize, ttl=ttl)
        self.lock = Lock()
    
    def get(self, key: str) -> Any:
        with self.lock:
            return self.cache.get(key)
    
    def set(self, key: str, value: Any) -> None:
        with self.lock:
            self.cache[key] = value
    
    def delete(self, key: str) -> None:
        with self.lock:
            if key in self.cache:
                del self.cache[key]
    
    def clear(self) -> None:
        with self.lock:
            self.cache.clear()

# Global cache instances
sleeper_api_cache = CacheManager(maxsize=200, ttl=300)  # 5 minutes
league_cache = CacheManager(maxsize=50, ttl=600)  # 10 minutes