"""
FleetLeak Streaming Pipeline Worker
Listens on telemetry.raw, runs two-tier deduplication, normalisation across 3+1 OEMs,
sliding-window idle detection, and emits real-time alerts to PostgreSQL and Redis.
"""

import os
import sys
import json
import time
import datetime
import uuid
import logging
from typing import Dict, Any, Optional

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

from services.normaliser.normaliser import TelemetryNormaliser
from services.normaliser.deduplicator import TelemetryDeduplicator
from services.stream.processor import StreamProcessor

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("fleetleak.pipeline")

# DB Connection
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "fleetleak")
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "fleet_secure_password_2026")

def get_db():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )

class PipelineWorker:
    def __init__(self, use_redis: bool = True):
        self.redis_client = None
        if use_redis:
            try:
                import redis
                self.redis_client = redis.Redis(host=os.getenv("REDIS_HOST", "localhost"), port=6379, db=0, socket_timeout=1)
                self.redis_client.ping()
                logger.info("Connected to Redis successfully.")
            except Exception as e:
                logger.warning(f"Redis unavailable, using in-memory fallback: {e}")
                self.redis_client = None

        self.deduplicator = TelemetryDeduplicator(redis_client=self.redis_client)
        self.normaliser = TelemetryNormaliser(deduplicator=self.deduplicator)
        self.processor = StreamProcessor()
        self.db_conn = None
        self._init_db_cache()

    def _init_db_cache(self):
        """Pre-populate VIN cache from PostgreSQL"""
        try:
            conn = get_db()
            cur = conn.cursor()
            cur.execute("SELECT vin, id, tenant_id FROM vehicle LIMIT 50000;")
            rows = cur.fetchall()
            for vin, v_id, t_id in rows:
                self.normaliser.vin_cache[vin] = (str(v_id), str(t_id))
            cur.close()
            conn.close()
            logger.info(f"Loaded {len(self.normaliser.vin_cache):,} vehicles into normaliser cache.")
        except Exception as e:
            logger.warning(f"Could not load VIN cache from DB: {e}")

    def process_raw_packet(self, raw_payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Processes single raw telemetry message through the entire pipeline:
        Raw -> Validate -> Normalise (OEM) -> Dedupe -> Stream Processor (Idle Deque) -> Alert
        """
        success, canonical, err = self.normaliser.normalise(raw_payload)
        if not success:
            if err == "DUPLICATE_PACKET":
                return None
            logger.debug(f"DLQ Packet: {err}")
            return None

        # Pass canonical to real-time stream processor
        leak_event = self.processor.process_canonical_event(canonical)
        if leak_event:
            self._persist_leak(leak_event)
            return leak_event

        return None

    def _persist_leak(self, leak: Dict[str, Any]):
        """Persists detected leak to PostgreSQL and notifies Redis pub/sub channel"""
        try:
            conn = get_db()
            cur = conn.cursor()
            
            # Lookup default depot if not present
            cur.execute("SELECT id FROM depot WHERE tenant_id = %s LIMIT 1;", (leak["tenant_id"],))
            depot_row = cur.fetchone()
            depot_id = depot_row[0] if depot_row else "20000000-0000-0001-0000-000000000001"

            cur.execute("SELECT id FROM leak_type WHERE code = %s LIMIT 1;", (leak["leak_type"],))
            lt_row = cur.fetchone()
            lt_id = lt_row[0] if lt_row else "b0000000-0000-0000-0000-000000000001"

            # Insert leak event
            started_dt = datetime.datetime.fromtimestamp(leak["started_at"], datetime.timezone.utc)
            cur.execute("""
                INSERT INTO leak_event (id, tenant_id, vehicle_id, depot_id, leak_type_id, status, severity, started_at, duration_seconds, fuel_wasted_liters, estimated_cost_loss, currency, detection_method, geohash_5)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING;
            """, (
                leak["leak_event_id"],
                leak["tenant_id"],
                leak["vehicle_id"],
                depot_id,
                lt_id,
                leak["status"],
                leak["severity"],
                started_dt,
                leak["duration_seconds"],
                leak["fuel_wasted_liters"],
                leak["estimated_cost_loss"],
                "USD",
                leak["detection_method"],
                leak.get("geohash_5", "dp3wm")
            ))

            # Insert real-time alert
            alert_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO alert (id, tenant_id, leak_event_id, severity, title, message)
                VALUES (%s, %s, %s, %s, %s, %s);
            """, (
                alert_id,
                leak["tenant_id"],
                leak["leak_event_id"],
                leak["severity"],
                f"Real-Time Alert: {leak['leak_type']} Detected",
                f"Vehicle {leak.get('vin', 'N/A')} accumulated {leak['duration_seconds']//60} mins idle (${leak['estimated_cost_loss']:.2f} loss)."
            ))

            conn.commit()
            cur.close()
            conn.close()

            # Broadcast via Redis Pub/Sub for live WebSockets
            if self.redis_client:
                alert_payload = {
                    "alert_id": alert_id,
                    "tenant_id": leak["tenant_id"],
                    "leak_type": leak["leak_type"],
                    "severity": leak["severity"],
                    "cost_loss": leak["estimated_cost_loss"],
                    "timestamp": started_dt.isoformat()
                }
                self.redis_client.publish("fleet_alerts", json.dumps(alert_payload))

        except Exception as e:
            logger.error(f"Failed to persist leak event: {e}")

if __name__ == "__main__":
    print("Starting FleetLeak Streaming Pipeline Worker...")
    worker = PipelineWorker()
    print("Pipeline Worker initialized and ready.")
