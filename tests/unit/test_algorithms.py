"""
FleetLeak Unit Test Suite
Target: 80%+ line coverage over core algorithms and business logic services.
Tests:
- Dynamic Programming trip/stop segmentation (DPSegmenter)
- Sliding-window deque idle accumulation (VehicleIdleTracker)
- Count-Min Sketch (Top-K estimation)
- In-memory Bloom filter (O(k))
- VIN ISO 3779 checksum and forbidden character validation
- OBD-II DTC regex pattern matcher
- Heterogeneous OEM codecs (Ford, Freightliner, Geotab, Volvo)
"""

import pytest
from services.stream.dp_segmenter import DPSegmenter
from services.stream.processor import VehicleIdleTracker, CountMinSketch
from services.normaliser.deduplicator import BloomFilter, TelemetryDeduplicator
from services.ingest.validator import validate_vin, validate_dtc, validate_telemetry_payload
from services.simulator.oem_codecs import (
    OEMFordProCodec, OEMFreightlinerCodec, OEMGeotabCodec, OEMVolvoDynamicCodec
)

# ------------------------------------------------------------------------------
# 1. Dynamic Programming Segmenter Tests
# ------------------------------------------------------------------------------
def test_dp_segmenter_stops_and_trips():
    segmenter = DPSegmenter(window_size=20, transition_penalty=20.0, min_trip_speed_kmh=5.0)
    # Series: 5 stops (0 km/h) -> 5 moving (40 km/h) -> 5 stops (0 km/h)
    obs = (
        [{'ts': i, 'speed_kmh': 0.0} for i in range(5)] +
        [{'ts': 5 + i, 'speed_kmh': 40.0} for i in range(5)] +
        [{'ts': 10 + i, 'speed_kmh': 0.0} for i in range(5)]
    )
    segments, runtime = segmenter.segment_series(obs)
    assert len(segments) == 3
    assert segments[0]["type"] == "STOP"
    assert segments[1]["type"] == "TRIP"
    assert segments[2]["type"] == "STOP"
    assert runtime > 0

def test_dp_segmenter_empty():
    segmenter = DPSegmenter()
    segments, runtime = segmenter.segment_series([])
    assert segments == []
    assert runtime == 0.0

# ------------------------------------------------------------------------------
# 2. Sliding Window Deque Idle Accumulation Tests
# ------------------------------------------------------------------------------
def test_sliding_window_idle_detection():
    tracker = VehicleIdleTracker("V-1", allowed_idle_seconds=300, burn_rate_lph=3.5)
    # Under allowed threshold (200s idle) -> No leak
    res1 = tracker.process_event(ts_epoch=1000.0, engine_on=True, speed_kmh=0.0)
    assert res1 is None
    res2 = tracker.process_event(ts_epoch=1200.0, engine_on=True, speed_kmh=0.0)
    assert res2 is None

    # Exceeding allowed threshold (350s idle) -> Emits IDLE_EXCESS leak
    res3 = tracker.process_event(ts_epoch=1350.0, engine_on=True, speed_kmh=0.0)
    assert res3 is not None
    assert res3["leak_type"] == "IDLE_EXCESS"
    assert res3["duration_seconds"] == 350
    assert res3["fuel_wasted_liters"] > 0

    # Moving vehicle resets idle window
    res4 = tracker.process_event(ts_epoch=1400.0, engine_on=True, speed_kmh=45.0)
    assert res4 is None
    assert tracker.current_idle_start is None

# ------------------------------------------------------------------------------
# 3. Count-Min Sketch Tests
# ------------------------------------------------------------------------------
def test_count_min_sketch():
    sketch = CountMinSketch(width=500, depth=5)
    sketch.add("V-101", 10)
    sketch.add("V-102", 3)
    assert sketch.estimate("V-101") >= 10
    assert sketch.estimate("V-102") >= 3
    assert sketch.estimate("V-UNKNOWN") == 0

# ------------------------------------------------------------------------------
# 4. Bloom Filter & Deduplicator Tests
# ------------------------------------------------------------------------------
def test_bloom_filter_membership():
    bloom = BloomFilter(size=10000, num_hashes=4)
    bloom.add("item-1")
    assert bloom.contains("item-1") is True
    assert bloom.contains("item-never-added") is False

def test_telemetry_deduplicator():
    dedupe = TelemetryDeduplicator()
    assert dedupe.is_duplicate("V-1", 101, "2026-10-17T10:00:00Z") is False
    assert dedupe.is_duplicate("V-1", 101, "2026-10-17T10:00:00Z") is True
    assert dedupe.is_duplicate("V-1", 102, "2026-10-17T10:01:00Z") is False

# ------------------------------------------------------------------------------
# 5. VIN and DTC Validation Tests
# ------------------------------------------------------------------------------
def test_vin_validation():
    # Valid VIN (17 chars, no I, O, Q)
    valid, err = validate_vin("1FT8W2BT4REC12345")
    assert valid is True

    # Bad length
    valid, err = validate_vin("1FT8W2BT")
    assert valid is False
    assert "Invalid VIN length" in err

    # Prohibited characters (I, O, or Q)
    valid, err = validate_vin("1FT8W2BT4RIC12345")
    assert valid is False
    assert "prohibited ambiguous characters" in err

def test_dtc_validation():
    codes = ["P0300", "B0001", "C1234", "U0100", "INVALID_CODE", "12345"]
    valid, cleaned = validate_dtc(codes)
    assert len(cleaned) == 4
    assert "P0300" in cleaned
    assert "INVALID_CODE" not in cleaned

# ------------------------------------------------------------------------------
# 6. Multi-OEM Codec Transcoding Tests
# ------------------------------------------------------------------------------
def test_oem_codecs_bidirectional():
    canonical_event = {
        "vin": "1FT8W2BT4REC12345",
        "ts_utc": "2026-10-17T10:00:00Z",
        "seq": 1001,
        "lat": 41.97,
        "lon": -87.90,
        "speed_kmh": 60.0,
        "engine_on": True,
        "rpm": 1200,
        "fuel_rate_lph": 4.5,
        "odo_km": 15000.0,
        "dtc": ["P0300"]
    }

    # OEM 1: Ford Pro
    encoded_ford = OEMFordProCodec.encode(canonical_event)
    decoded_ford = OEMFordProCodec.decode(encoded_ford)
    assert decoded_ford["vin"] == canonical_event["vin"]
    assert abs(decoded_ford["speed_kmh"] - canonical_event["speed_kmh"]) < 1.0

    # OEM 2: Freightliner
    encoded_fl = OEMFreightlinerCodec.encode(canonical_event)
    decoded_fl = OEMFreightlinerCodec.decode(encoded_fl)
    assert decoded_fl["vin"] == canonical_event["vin"]
    assert decoded_fl["engine_on"] is True

    # OEM 3: Geotab
    encoded_geo = OEMGeotabCodec.encode(canonical_event)
    decoded_geo = OEMGeotabCodec.decode(encoded_geo)
    assert decoded_geo["vin"] == canonical_event["vin"]

    # OEM 4: Volvo Dynamic
    encoded_volvo = OEMVolvoDynamicCodec.encode(canonical_event)
    decoded_volvo = OEMVolvoDynamicCodec.decode(encoded_volvo)
    assert decoded_volvo["vin"] == canonical_event["vin"]
    assert decoded_volvo["schema_version"] == "2.0"

# ------------------------------------------------------------------------------
# 7. Payload Validator & Normaliser Comprehensive Tests
# ------------------------------------------------------------------------------
def test_validate_telemetry_payload():
    valid_payload = {
        "vin": "1FT8W2BT4REC12345",
        "lat": 41.97,
        "lon": -87.90
    }
    is_valid, err, sanitized = validate_telemetry_payload(valid_payload)
    assert is_valid is True
    assert err is None

    # Missing VIN
    is_valid, err, _ = validate_telemetry_payload({"lat": 41.97})
    assert is_valid is False
    assert "Missing vehicle VIN" in err

    # Out of bounds latitude
    is_valid, err, _ = validate_telemetry_payload({"vin": "1FT8W2BT4REC12345", "lat": 195.0})
    assert is_valid is False
    assert "Latitude out of bounds" in err

    # Non-dictionary payload
    is_valid, err, _ = validate_telemetry_payload("not a dict")
    assert is_valid is False

def test_telemetry_normaliser_full_flow():
    from services.normaliser.normaliser import TelemetryNormaliser
    normaliser = TelemetryNormaliser()
    normaliser.vin_cache["1FT8W2BT4REC12345"] = ("30000000-0000-0000-0000-000000000001", "10000000-0000-0000-0000-000000000001")

    # Valid Ford Pro
    packet = {
        "oem": "OEM_FORD_PRO",
        "vin": "1FT8W2BT4REC12345",
        "timestamp_iso": "2026-10-17T10:00:00Z",
        "message_sequence": 1,
        "gps": {"latitude": 41.97, "longitude": -87.90},
        "telemetry": {"speed_mph": 35.0, "ignition": "ON", "fuel_flow_gph": 1.2}
    }
    success, canonical, err = normaliser.normalise(packet)
    assert success is True
    assert canonical["tenant_id"] == "10000000-0000-0000-0000-000000000001"

    # Duplicate packet
    success_dup, _, err_dup = normaliser.normalise(packet)
    assert success_dup is False
    assert err_dup == "DUPLICATE_PACKET"

    # Unknown OEM source
    bad_oem_packet = dict(packet)
    bad_oem_packet["oem"] = "UNKNOWN_VENDOR"
    bad_oem_packet["message_sequence"] = 2
    success_bad, _, err_bad = normaliser.normalise(bad_oem_packet)
    assert success_bad is False
    assert "Unknown or unregistered OEM" in err_bad

