"""
FleetLeak Fleet & Telemetry Generator
Generates realistic fleets, routes, noise, and injected ground-truth anomalies
for 100,000+ vehicles across 20+ tenants.
"""

import random
import uuid
import datetime
import math
from typing import List, Dict, Any, Tuple

# Valid characters for VIN (excludes I, O, Q per ISO 3779)
VIN_CHARS = "0123456789ABCDEFGHJKLMNPRSTUVWXYZ"

# Geohash base 32
BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"

def encode_geohash(latitude: float, longitude: float, precision: int = 7) -> str:
    """Encode latitude and longitude into Geohash string"""
    lat_interval = (-90.0, 90.0)
    lon_interval = (-180.0, 180.0)
    geohash = []
    bits = [16, 8, 4, 2, 1]
    bit = 0
    ch = 0
    even = True

    while len(geohash) < precision:
        if even:
            mid = (lon_interval[0] + lon_interval[1]) / 2.0
            if longitude > mid:
                ch |= bits[bit]
                lon_interval = (mid, lon_interval[1])
            else:
                lon_interval = (lon_interval[0], mid)
        else:
            mid = (lat_interval[0] + lat_interval[1]) / 2.0
            if latitude > mid:
                ch |= bits[bit]
                lat_interval = (mid, lat_interval[1])
            else:
                lat_interval = (lat_interval[0], mid)

        even = not even
        if bit < 4:
            bit += 1
        else:
            geohash.append(BASE32[ch])
            bit = 0
            ch = 0

    return "".join(geohash)


def generate_valid_vin(rnd: random.Random) -> str:
    """Generates a synthetic 17-character VIN obeying ISO 3779 (no I, O, Q)"""
    wmi = "1FT" if rnd.random() < 0.5 else ("1FD" if rnd.random() < 0.5 else "2WK")
    vds = "".join(rnd.choices(VIN_CHARS, k=5))
    check_digit = str(rnd.randint(0, 9))
    model_year = "R"  # 2024
    plant_code = "A"
    vis = f"{rnd.randint(100000, 999999):06d}"
    return f"{wmi}{vds}{check_digit}{model_year}{plant_code}{vis}"


def generate_fleet_metadata(num_tenants: int = 20, total_vehicles: int = 100000, seed: int = 42) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Deterministically generates tenants, depots, vehicles, and injected ground truth labels.
    """
    rnd = random.Random(seed)
    
    # 1. Tenants
    tenants = []
    depots = []
    vehicles = []
    ground_truth_labels = []

    depot_templates = [
        ("Chicago Hub", 41.974162, -87.907321),
        ("Dallas Terminal", 32.899809, -97.040335),
        ("Newark Logistics Center", 40.689531, -74.174463),
        ("Atlanta Freight Depot", 33.640728, -84.427704),
        ("Los Angeles Hub", 33.941589, -118.40853),
        ("Denver Metro Terminal", 39.856096, -104.673737),
        ("Seattle Gateway", 47.450250, -122.308817),
        ("Miami Cargo Depot", 25.795865, -80.287046)
    ]

    oems = ["OEM_FORD_PRO", "OEM_FREIGHTLINER", "OEM_GEOTAB"]
    vehicle_classes = [
        ("CLASS_1_VAN", 0.40, 1.8),       # 40% delivery vans
        ("CLASS_6_MEDIUM", 0.30, 3.2),    # 30% box trucks
        ("CLASS_8_HEAVY", 0.15, 4.5),     # 15% freight tractors
        ("EV_DELIVERY_VAN", 0.10, 0.0),   # 10% electric vans
        ("HYBRID_SHUTTLE", 0.05, 1.2)     # 5% hybrids
    ]

    vehicles_per_tenant = total_vehicles // num_tenants

    for t_idx in range(num_tenants):
        tenant_id = str(uuid.UUID(f"10000000-0000-0000-0000-{t_idx+1:012d}"))
        tenant_code = f"TENANT_{t_idx+1:03d}"
        tenant_name = f"Fleet Logistics Operations Corp {t_idx+1:02d}"
        tenants.append({
            "id": tenant_id,
            "code": tenant_code,
            "name": tenant_name
        })

        # Generate 3 to 6 depots per tenant
        num_depots = rnd.randint(3, 5)
        tenant_depots = []
        for d_idx in range(num_depots):
            template_name, base_lat, base_lon = depot_templates[(t_idx + d_idx) % len(depot_templates)]
            lat = base_lat + rnd.uniform(-0.05, 0.05)
            lon = base_lon + rnd.uniform(-0.05, 0.05)
            depot_id = str(uuid.UUID(f"20000000-0000-{t_idx+1:04d}-0000-{d_idx+1:012d}"))
            geohash_7 = encode_geohash(lat, lon, precision=7)
            depot_data = {
                "id": depot_id,
                "tenant_id": tenant_id,
                "code": f"DEPOT_{tenant_code}_{d_idx+1:02d}",
                "name": f"{tenant_name} - {template_name} #{d_idx+1}",
                "geohash_7": geohash_7,
                "center_lat": round(lat, 6),
                "center_lon": round(lon, 6),
                "radius_meters": rnd.choice([500.0, 750.0, 1000.0])
            }
            depots.append(depot_data)
            tenant_depots.append(depot_data)

        # Generate vehicles for this tenant
        for v_idx in range(vehicles_per_tenant):
            veh_num = t_idx * vehicles_per_tenant + v_idx + 1
            veh_id = str(uuid.UUID(f"30000000-0000-0000-0000-{veh_num:012d}"))
            assigned_depot = rnd.choice(tenant_depots)
            assigned_oem = rnd.choice(oems)
            
            # Pick vehicle class based on distribution
            r_val = rnd.random()
            cum = 0.0
            chosen_class = vehicle_classes[0][0]
            for v_cls, prob, _ in vehicle_classes:
                cum += prob
                if r_val <= cum:
                    chosen_class = v_cls
                    break

            vin = generate_valid_vin(rnd)
            daily_lease = 40.0 if "VAN" in chosen_class else (75.0 if "MEDIUM" in chosen_class else 120.0)

            # Ground truth anomaly assignment
            # ~8% Chronic Idling, ~3% After-Hours Use, ~5% Low Utilisation
            injected_leak = None
            rand_anomaly = rnd.random()
            if rand_anomaly < 0.08:
                injected_leak = "IDLE_EXCESS"
            elif rand_anomaly < 0.11:
                injected_leak = "AFTER_HOURS_USE"
            elif rand_anomaly < 0.16:
                injected_leak = "LOW_UTILISATION"

            vehicle_record = {
                "id": veh_id,
                "tenant_id": tenant_id,
                "depot_id": assigned_depot["id"],
                "vehicle_class_code": chosen_class,
                "oem_code": assigned_oem,
                "vin": vin,
                "license_plate": f"FL-{rnd.randint(100, 999)}-{chr(rnd.randint(65, 90))}{chr(rnd.randint(65, 90))}",
                "make": "Ford" if "VAN" in chosen_class else ("Freightliner" if "HEAVY" in chosen_class else "Volvo"),
                "model": "Transit" if "VAN" in chosen_class else ("Cascadia" if "HEAVY" in chosen_class else "VNR"),
                "year": rnd.choice([2021, 2022, 2023, 2024, 2025]),
                "daily_lease_cost": daily_lease,
                "currency": "USD",
                "injected_leak": injected_leak
            }
            vehicles.append(vehicle_record)

            if injected_leak:
                ground_truth_labels.append({
                    "vehicle_id": veh_id,
                    "injected_leak_type": injected_leak,
                    "injection_ratio": 0.85 if injected_leak == "IDLE_EXCESS" else 0.50,
                    "valid_from": "2026-10-01T00:00:00Z",
                    "valid_to": "2026-10-31T23:59:59Z",
                    "notes": f"Synthetic benchmark injection: {injected_leak}"
                })

    return tenants, depots, vehicles, ground_truth_labels
