"""
FleetLeak Telemetry Normaliser Service
Normalises heterogeneous OEM payloads into the canonical telemetry schema,
deduplicates messages, and enriches events with vehicle/tenant metadata.
Supports dynamic mid-demo onboarding of new OEM adapters without downtime.
"""

import json
import logging
from typing import Dict, Any, Optional, Tuple

from services.simulator.oem_codecs import get_codec_for_oem, OEM_REGISTRY, OEMVolvoDynamicCodec
from services.ingest.validator import validate_telemetry_payload, validate_dtc
from services.normaliser.deduplicator import TelemetryDeduplicator

logger = logging.getLogger("fleetleak.normaliser")

class TelemetryNormaliser:
    def __init__(self, deduplicator: Optional[TelemetryDeduplicator] = None, vin_cache: Optional[Dict[str, Tuple[str, str]]] = None):
        self.deduplicator = deduplicator or TelemetryDeduplicator()
        # In-memory fast cache: vin -> (vehicle_id, tenant_id)
        self.vin_cache = vin_cache if vin_cache is not None else {}
        self.stats = {
            "processed": 0,
            "normalised": 0,
            "duplicates": 0,
            "dlq_invalid": 0
        }

    def register_dynamic_oem(self, oem_code: str, codec_class):
        """
        Dynamically registers a new OEM codec at runtime with zero downtime.
        Used to demonstrate live 4th OEM format onboarding.
        """
        OEM_REGISTRY[oem_code] = codec_class
        logger.info(f"Dynamically registered new OEM adapter: {oem_code}")

    def normalise(self, raw_payload: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Processes a raw incoming telemetry packet:
        1. Validates payload integrity and VIN checksum.
        2. Routes to appropriate OEM codec.
        3. Enriches with vehicle_id and tenant_id.
        4. Rejects duplicates via Bloom filter / Redis SETNX.
        Returns: (success, canonical_event, error_reason)
        """
        self.stats["processed"] += 1

        # 1. Validation
        is_valid, err_msg, sanitized = validate_telemetry_payload(raw_payload)
        if not is_valid:
            self.stats["dlq_invalid"] += 1
            return False, None, err_msg

        # Determine OEM Code
        oem_code = (
            sanitized.get("oem") or 
            sanitized.get("OEM") or 
            sanitized.get("oem_vendor") or 
            (sanitized.get("header", {}).get("source") if isinstance(sanitized.get("header"), dict) else None)
        )

        codec = get_codec_for_oem(oem_code) if oem_code else None
        if not codec:
            # Fallback inspection: check if it's the dynamic Volvo format
            if "oem_vendor" in sanitized and sanitized["oem_vendor"] == "OEM_VOLVO_DYNAMIC":
                codec = OEMVolvoDynamicCodec
            else:
                self.stats["dlq_invalid"] += 1
                return False, None, f"Unknown or unregistered OEM source: {oem_code}"

        try:
            canonical = codec.decode(sanitized)
        except Exception as e:
            self.stats["dlq_invalid"] += 1
            return False, None, f"Codec decoding exception: {str(e)}"

        # 2. Enrich vehicle_id and tenant_id
        vin = canonical["vin"]
        if vin in self.vin_cache:
            canonical["vehicle_id"], canonical["tenant_id"] = self.vin_cache[vin]
        else:
            # Use deterministic fallback UUID if cache miss
            canonical["vehicle_id"] = canonical.get("vehicle_id", "30000000-0000-0000-0000-000000000001")
            canonical["tenant_id"] = canonical.get("tenant_id", "11111111-1111-1111-1111-111111111111")

        # 3. Deduplication Check on (vehicle_id, seq, ts_utc)
        seq = int(canonical.get("seq", 0))
        ts_utc = str(canonical.get("ts_utc", ""))
        if self.deduplicator.is_duplicate(canonical["vehicle_id"], seq, ts_utc):
            self.stats["duplicates"] += 1
            return False, None, "DUPLICATE_PACKET"

        # 4. Clean DTC codes
        if "dtc" in canonical and isinstance(canonical["dtc"], list):
            _, canonical["dtc"] = validate_dtc(canonical["dtc"])

        self.stats["normalised"] += 1
        return True, canonical, None
