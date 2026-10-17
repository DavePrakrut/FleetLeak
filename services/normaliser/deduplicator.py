"""
Two-Tier Telemetry Deduplicator
Tier 1: In-memory counting Bloom Filter for sub-microsecond pre-filtering.
Tier 2: Redis SETNX atomic key reservation for exact distributed deduplication.
Natural dedupe key: (vehicle_id, seq, ts_utc)
"""

import hashlib
import time
from typing import Optional

try:
    import redis
except ImportError:
    redis = None

class BloomFilter:
    """Lightweight in-memory Bloom filter using bitarray/bytearray and multi-hash"""
    def __init__(self, size: int = 1_000_000, num_hashes: int = 4):
        self.size = size
        self.num_hashes = num_hashes
        self.bit_array = bytearray((size + 7) // 8)

    def _hashes(self, item: str):
        h1 = int(hashlib.md5(item.encode("utf-8")).hexdigest(), 16)
        h2 = int(hashlib.sha1(item.encode("utf-8")).hexdigest(), 16)
        for i in range(self.num_hashes):
            yield (h1 + i * h2) % self.size

    def add(self, item: str):
        for bit_index in self._hashes(item):
            byte_index = bit_index // 8
            bit_offset = bit_index % 8
            self.bit_array[byte_index] |= (1 << bit_offset)

    def contains(self, item: str) -> bool:
        for bit_index in self._hashes(item):
            byte_index = bit_index // 8
            bit_offset = bit_index % 8
            if not (self.bit_array[byte_index] & (1 << bit_offset)):
                return False
        return True


class TelemetryDeduplicator:
    def __init__(self, redis_client=None, ttl_seconds: int = 3600):
        self.bloom = BloomFilter(size=500_000, num_hashes=4)
        self.redis = redis_client
        self.ttl = ttl_seconds
        self.memory_cache = set()
        self.max_memory_cache = 100_000

    def is_duplicate(self, vehicle_id: str, seq: int, ts_utc: str) -> bool:
        dedupe_key = f"{vehicle_id}:{seq}:{ts_utc}"

        # Tier 1: Check Bloom Filter
        # If Bloom says NOT present, it is definitely not a duplicate
        if not self.bloom.contains(dedupe_key):
            self.bloom.add(dedupe_key)
            # Register in Redis if connected
            if self.redis:
                try:
                    self.redis.set(f"dedupe:{dedupe_key}", "1", ex=self.ttl)
                except Exception:
                    pass
            else:
                self._add_memory(dedupe_key)
            return False

        # Tier 2: Bloom reported possible duplicate -> check exact store (Redis SETNX)
        if self.redis:
            try:
                # SETNX returns True if key was set (new item), False if key already existed (duplicate)
                was_set = self.redis.set(f"dedupe:{dedupe_key}", "1", nx=True, ex=self.ttl)
                return not was_set
            except Exception:
                # Fallback to local memory set
                return dedupe_key in self.memory_cache
        else:
            if dedupe_key in self.memory_cache:
                return True
            self._add_memory(dedupe_key)
            return False

    def _add_memory(self, key: str):
        if len(self.memory_cache) >= self.max_memory_cache:
            self.memory_cache.clear()
        self.memory_cache.add(key)
