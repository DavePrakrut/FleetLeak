"""
OEM Telemetry Encoders / Decoders
Implements realistic heterogeneous payload formats across 3 OEM manufacturers
plus a 4th format for dynamic mid-demo onboarding.
"""

import time
from typing import Dict, Any, Optional

class OEMFordProCodec:
    """OEM 1: Ford Pro Telematics (Imperial units, nested ISO timestamp)"""
    OEM_CODE = "OEM_FORD_PRO"

    @staticmethod
    def encode(event: Dict[str, Any]) -> Dict[str, Any]:
        speed_mph = round(float(event["speed_kmh"]) * 0.621371, 2)
        # fuel_rate_lph to gallons per hour
        fuel_flow_gph = round(float(event.get("fuel_rate_lph", 0.0)) * 0.264172, 3)
        return {
            "oem": OEMFordProCodec.OEM_CODE,
            "vin": event["vin"],
            "timestamp_iso": event["ts_utc"],
            "message_sequence": event["seq"],
            "gps": {
                "latitude": event["lat"],
                "longitude": event["lon"]
            } if event["lat"] is not None and event["lon"] is not None else None,
            "telemetry": {
                "speed_mph": speed_mph,
                "ignition": "ON" if event["engine_on"] else "OFF",
                "engine_rpm": event.get("rpm", 0),
                "fuel_flow_gph": fuel_flow_gph,
                "odometer_miles": round(float(event.get("odo_km", 0.0)) * 0.621371, 2)
            },
            "diagnostics": {
                "dtc_codes": event.get("dtc", [])
            }
        }

    @staticmethod
    def decode(payload: Dict[str, Any]) -> Dict[str, Any]:
        tel = payload.get("telemetry", {})
        gps = payload.get("gps")
        speed_kmh = round(float(tel.get("speed_mph", 0.0)) * 1.60934, 2)
        fuel_rate_lph = round(float(tel.get("fuel_flow_gph", 0.0)) * 3.78541, 4)
        odo_km = round(float(tel.get("odometer_miles", 0.0)) * 1.60934, 2)
        return {
            "vin": payload["vin"],
            "ts_utc": payload["timestamp_iso"],
            "seq": payload["message_sequence"],
            "lat": gps.get("latitude") if gps else None,
            "lon": gps.get("longitude") if gps else None,
            "speed_kmh": speed_kmh,
            "engine_on": tel.get("ignition") == "ON",
            "rpm": tel.get("engine_rpm", 0),
            "fuel_rate_lph": fuel_rate_lph,
            "odo_km": odo_km,
            "dtc": payload.get("diagnostics", {}).get("dtc_codes", []),
            "oem": OEMFordProCodec.OEM_CODE,
            "schema_version": "1.0"
        }


class OEMFreightlinerCodec:
    """OEM 2: Daimler Freightliner Truck Connect (Metric units, epoch timestamp in ms)"""
    OEM_CODE = "OEM_FREIGHTLINER"

    @staticmethod
    def encode(event: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "header": {
                "source": OEMFreightlinerCodec.OEM_CODE,
                "vin": event["vin"],
                "packet_seq": event["seq"],
                "epoch_ms": int(time.time() * 1000)
            },
            "loc": {
                "pos_lat": event["lat"],
                "pos_long": event["lon"]
            },
            "engine_data": {
                "eng_running": 1 if event["engine_on"] else 0,
                "v_kmh": event["speed_kmh"],
                "inst_fuel_lph": event.get("fuel_rate_lph", 0.0),
                "tachometer_rpm": event.get("rpm", 0),
                "total_dist_km": event.get("odo_km", 0.0)
            },
            "faults": event.get("dtc", [])
        }

    @staticmethod
    def decode(payload: Dict[str, Any]) -> Dict[str, Any]:
        header = payload.get("header", {})
        loc = payload.get("loc", {})
        eng = payload.get("engine_data", {})
        return {
            "vin": header["vin"],
            "ts_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(header.get("epoch_ms", int(time.time()*1000)) / 1000.0)),
            "seq": header["packet_seq"],
            "lat": loc.get("pos_lat"),
            "lon": loc.get("pos_long"),
            "speed_kmh": eng.get("v_kmh", 0.0),
            "engine_on": bool(eng.get("eng_running", 0)),
            "rpm": eng.get("tachometer_rpm", 0),
            "fuel_rate_lph": eng.get("inst_fuel_lph", 0.0),
            "odo_km": eng.get("total_dist_km", 0.0),
            "dtc": payload.get("faults", []),
            "oem": OEMFreightlinerCodec.OEM_CODE,
            "schema_version": "1.0"
        }


class OEMGeotabCodec:
    """OEM 3: Geotab MyGeotab Format (PascalCase keys, separate status codes)"""
    OEM_CODE = "OEM_GEOTAB"

    @staticmethod
    def encode(event: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "OEM": OEMGeotabCodec.OEM_CODE,
            "VehicleIdentificationNumber": event["vin"],
            "SequenceId": event["seq"],
            "DateTime": event["ts_utc"],
            "Latitude": event["lat"],
            "Longitude": event["lon"],
            "Speed": event["speed_kmh"],
            "Ignition": event["engine_on"],
            "EngineSpeed": event.get("rpm", 0),
            "FuelRateLitersPerHour": event.get("fuel_rate_lph", 0.0),
            "Odometer": event.get("odo_km", 0.0),
            "DiagnosticTroubleCodes": event.get("dtc", [])
        }

    @staticmethod
    def decode(payload: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "vin": payload["VehicleIdentificationNumber"],
            "ts_utc": payload["DateTime"],
            "seq": payload["SequenceId"],
            "lat": payload.get("Latitude"),
            "lon": payload.get("Longitude"),
            "speed_kmh": payload.get("Speed", 0.0),
            "engine_on": bool(payload.get("Ignition", False)),
            "rpm": payload.get("EngineSpeed", 0),
            "fuel_rate_lph": payload.get("FuelRateLitersPerHour", 0.0),
            "odo_km": payload.get("Odometer", 0.0),
            "dtc": payload.get("DiagnosticTroubleCodes", []),
            "oem": OEMGeotabCodec.OEM_CODE,
            "schema_version": "1.0"
        }


class OEMVolvoDynamicCodec:
    """OEM 4: Volvo Dynamic Connect (Demonstrates zero-downtime hot-onboarding mid-demo)"""
    OEM_CODE = "OEM_VOLVO_DYNAMIC"

    @staticmethod
    def encode(event: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "oem_vendor": OEMVolvoDynamicCodec.OEM_CODE,
            "chassis_vin": event["vin"],
            "packet_counter": event["seq"],
            "utc_recorded": event["ts_utc"],
            "position": {
                "geo_lat": event["lat"],
                "geo_lon": event["lon"]
            },
            "chassis_metrics": {
                "ground_speed_kph": event["speed_kmh"],
                "motor_active": event["engine_on"],
                "crankshaft_rpm": event.get("rpm", 0),
                "fuel_flow_dm3_h": event.get("fuel_rate_lph", 0.0), # 1 dm3 = 1 liter
                "total_rolling_km": event.get("odo_km", 0.0)
            },
            "ecu_alarms": event.get("dtc", [])
        }

    @staticmethod
    def decode(payload: Dict[str, Any]) -> Dict[str, Any]:
        metrics = payload.get("chassis_metrics", {})
        pos = payload.get("position", {})
        return {
            "vin": payload["chassis_vin"],
            "ts_utc": payload["utc_recorded"],
            "seq": payload["packet_counter"],
            "lat": pos.get("geo_lat"),
            "lon": pos.get("geo_lon"),
            "speed_kmh": metrics.get("ground_speed_kph", 0.0),
            "engine_on": bool(metrics.get("motor_active", False)),
            "rpm": metrics.get("crankshaft_rpm", 0),
            "fuel_rate_lph": metrics.get("fuel_flow_dm3_h", 0.0),
            "odo_km": metrics.get("total_rolling_km", 0.0),
            "dtc": payload.get("ecu_alarms", []),
            "oem": OEMVolvoDynamicCodec.OEM_CODE,
            "schema_version": "2.0"
        }


# Dynamic Adapter Registry for zero-downtime hot-pluggable OEM onboarding
OEM_REGISTRY = {
    OEMFordProCodec.OEM_CODE: OEMFordProCodec,
    OEMFreightlinerCodec.OEM_CODE: OEMFreightlinerCodec,
    OEMGeotabCodec.OEM_CODE: OEMGeotabCodec,
    OEMVolvoDynamicCodec.OEM_CODE: OEMVolvoDynamicCodec
}

def get_codec_for_oem(oem_code: str):
    return OEM_REGISTRY.get(oem_code)
