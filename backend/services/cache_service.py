"""
cache_service.py — In-memory LRU analysis cache + request rate limiter.

Cache:
  - Keyed on SHA-256(url + YYYY-MM-DD) so entries naturally expire at midnight
  - Hard TTL: 24 hours regardless
  - Max 500 entries; LRU eviction when full

Rate Limiter:
  - Per extension install ID (or IP as fallback)
  - 20 requests per rolling 60-minute window
"""

import hashlib
import json
import time
from collections import OrderedDict, defaultdict, deque
from threading import Lock


# ─── LRU Analysis Cache ───────────────────────────────────────────────────────

class AnalysisCache:
    def __init__(self, max_size: int = 500, ttl_seconds: int = 86_400):
        self._store: OrderedDict = OrderedDict()
        self._max_size = max_size
        self._ttl = ttl_seconds
        self._lock = Lock()
        self._hits = 0
        self._misses = 0

    def _make_key(self, url: str) -> str:
        """Key = hash(url + today's date) so entries expire at midnight naturally."""
        date_str = time.strftime('%Y-%m-%d')
        raw = f"{url.strip()}:{date_str}"
        return hashlib.sha256(raw.encode()).hexdigest()[:40]

    def get(self, url: str) -> dict | None:
        key = self._make_key(url)
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._misses += 1
                return None
            if time.time() > entry['expires_at']:
                del self._store[key]
                self._misses += 1
                return None
            # Move to end (most-recently used)
            self._store.move_to_end(key)
            self._hits += 1
            return entry['data']

    def set(self, url: str, data: dict) -> None:
        key = self._make_key(url)
        with self._lock:
            if key in self._store:
                self._store.move_to_end(key)
            self._store[key] = {
                'data': data,
                'cached_at': time.time(),
                'expires_at': time.time() + self._ttl,
            }
            # Evict the oldest entry if over capacity
            if len(self._store) > self._max_size:
                self._store.popitem(last=False)

    def invalidate(self, url: str) -> bool:
        key = self._make_key(url)
        with self._lock:
            return self._store.pop(key, None) is not None

    def clear_all(self) -> int:
        with self._lock:
            count = len(self._store)
            self._store.clear()
            return count

    def stats(self) -> dict:
        with self._lock:
            total = self._hits + self._misses
            return {
                'entries': len(self._store),
                'max_size': self._max_size,
                'hits': self._hits,
                'misses': self._misses,
                'hit_rate': round(self._hits / total, 3) if total else 0.0,
            }


# ─── Sliding-window Rate Limiter ──────────────────────────────────────────────

class RateLimiter:
    def __init__(self, max_requests: int = 20, window_seconds: int = 3_600):
        self._requests: dict[str, deque] = defaultdict(deque)
        self._max = max_requests
        self._window = window_seconds
        self._lock = Lock()

    def check(self, identifier: str) -> tuple[bool, dict]:
        """
        Returns (allowed, info_dict).
        info_dict keys: remaining, reset_in_seconds, limit
        """
        now = time.time()
        cutoff = now - self._window

        with self._lock:
            q = self._requests[identifier]
            # Purge expired timestamps
            while q and q[0] < cutoff:
                q.popleft()

            if len(q) >= self._max:
                reset_in = max(0, int(q[0] - cutoff))
                return False, {
                    'remaining': 0,
                    'reset_in_seconds': reset_in,
                    'limit': self._max,
                }

            q.append(now)
            return True, {
                'remaining': self._max - len(q),
                'reset_in_seconds': self._window,
                'limit': self._max,
            }

    def reset(self, identifier: str) -> None:
        with self._lock:
            self._requests.pop(identifier, None)


# ─── Singletons ───────────────────────────────────────────────────────────────

analysis_cache = AnalysisCache(max_size=500, ttl_seconds=86_400)
rate_limiter = RateLimiter(max_requests=20, window_seconds=3_600)
