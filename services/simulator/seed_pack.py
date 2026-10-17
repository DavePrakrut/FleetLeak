"""
FleetLeak Seed Pack Script
Seeds 100,000+ vehicles, 20 tenants, depots, and 7 days of history aggregates.
One command execution: python -m services.simulator.seed_pack
"""

import sys
import os
import uuid
import argparse
import time
import datetime
import random
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

from services.simulator.fleet_generator import generate_fleet_metadata, generate_valid_vin

load_dotenv()

# PostgreSQL Connection Settings
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "fleetleak")
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "fleet_secure_password_2026")

def get_connection():
    try:
        return psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
    except Exception as e:
        # Fallback to local postgres with default credentials
        return psycopg2.connect(
            host="localhost",
            port=5432,
            dbname="fleetleak" if "fleetleak" in str(e) else "postgres",
            user="postgres"
        )


def seed_database(num_tenants: int = 20, total_vehicles: int = 100000, days_history: int = 7, clean: bool = False):
    print(f"=================================================================")
    print(f" FleetLeak Enterprise Seed Pack: {total_vehicles:,} Vehicles, {num_tenants} Tenants")
    print(f" Generating 7-day historical telemetry roll-ups & injected leaks")
    print(f"=================================================================")
    start_time = time.time()

    conn = get_connection()
    conn.autocommit = False
    cur = conn.cursor()

    try:
        print("[1/5] Applying Schema Migration & Reference Data...")
        migration_path = os.path.join(os.path.dirname(__file__), "..", "..", "db", "migrations", "001_initial_schema.sql")
        seed_ref_path = os.path.join(os.path.dirname(__file__), "..", "..", "db", "seeds", "001_seed_reference_data.sql")
        
        with open(migration_path, "r", encoding="utf-8") as f:
            cur.execute(f.read())
        with open(seed_ref_path, "r", encoding="utf-8") as f:
            cur.execute(f.read())
        conn.commit()

        if clean:
            print("   -> Truncating previous simulation fleet and events...")
            cur.execute("""
                TRUNCATE TABLE alert, leak_event, ground_truth_label, recommendation_action, recommendation,
                savings_estimate, trip, stop, vehicle_assignment, vehicle, depot CASCADE;
            """)
            conn.commit()

        # Cache class & oem IDs
        cur.execute("SELECT code, id FROM vehicle_class")
        class_map = dict(cur.fetchall())
        cur.execute("SELECT oem_code, id FROM oem_source")
        oem_map = dict(cur.fetchall())
        cur.execute("SELECT code, id FROM leak_type")
        leak_type_map = dict(cur.fetchall())

        print(f"[2/5] Generating fleet metadata for {total_vehicles:,} vehicles...")
        tenants, depots, vehicles, ground_truth = generate_fleet_metadata(
            num_tenants=num_tenants,
            total_vehicles=total_vehicles,
            seed=42
        )

        # Batch insert tenants
        print(f"   -> Inserting {len(tenants)} tenants...")
        execute_values(
            cur,
            """
            INSERT INTO tenant (id, code, name)
            VALUES %s
            ON CONFLICT (code) DO NOTHING
            """,
            [(t["id"], t["code"], t["name"]) for t in tenants]
        )

        # Batch insert depots
        print(f"   -> Inserting {len(depots)} depots...")
        execute_values(
            cur,
            """
            INSERT INTO depot (id, tenant_id, code, name, geohash_7, center_lat, center_lon, radius_meters)
            VALUES %s
            ON CONFLICT (tenant_id, code) DO NOTHING
            """,
            [(d["id"], d["tenant_id"], d["code"], d["name"], d["geohash_7"], d["center_lat"], d["center_lon"], d["radius_meters"]) for d in depots]
        )
        conn.commit()

        # Batch insert vehicles in chunks of 5000 for maximum throughput
        print(f"   -> Inserting {len(vehicles):,} vehicles (chunk size: 5,000)...")
        chunk_size = 5000
        for i in range(0, len(vehicles), chunk_size):
            chunk = vehicles[i:i + chunk_size]
            v_rows = [
                (
                    v["id"],
                    v["tenant_id"],
                    v["depot_id"],
                    class_map[v["vehicle_class_code"]],
                    oem_map[v["oem_code"]],
                    v["vin"],
                    v["license_plate"],
                    v["make"],
                    v["model"],
                    v["year"],
                    v["daily_lease_cost"],
                    v["currency"]
                )
                for v in chunk
            ]
            execute_values(
                cur,
                """
                INSERT INTO vehicle (id, tenant_id, depot_id, vehicle_class_id, oem_source_id, vin, license_plate, make, model, year, daily_lease_cost, currency)
                VALUES %s
                ON CONFLICT (vin) DO NOTHING
                """,
                v_rows
            )
            print(f"      ... inserted {min(i + chunk_size, len(vehicles)):,} / {len(vehicles):,} vehicles")
        conn.commit()

        # Insert Ground Truth Labels
        print(f"[3/5] Inserting {len(ground_truth):,} Ground-Truth Injected Leak Labels...")
        gt_rows = [
            (gt["vehicle_id"], gt["injected_leak_type"], gt["injection_ratio"], gt["valid_from"], gt["valid_to"], gt["notes"])
            for gt in ground_truth
        ]
        execute_values(
            cur,
            """
            INSERT INTO ground_truth_label (vehicle_id, injected_leak_type, injection_ratio, valid_from, valid_to, notes)
            VALUES %s
            """,
            gt_rows
        )
        conn.commit()

        # 4. Generate 7-day Historical Leaks & Roll-up Savings
        print(f"[4/5] Generating 7-day Historical Leaks & Financial Impact...")
        now = datetime.datetime.now(datetime.timezone.utc)
        fuel_price_usd = 1.15  # $1.15 per liter
        leak_events = []
        alerts = []

        rnd = random.Random(1337)
        # Select active sample of vehicles with injected leaks to synthesize rich dashboard events
        anomalous_vehicles = [v for v in vehicles if v["injected_leak"] is not None]
        sample_anomalies = rnd.sample(anomalous_vehicles, min(1200, len(anomalous_vehicles)))

        for v in sample_anomalies:
            leak_code = v["injected_leak"]
            leak_type_id = leak_type_map.get(leak_code)
            if not leak_type_id:
                continue

            for day_offset in range(days_history):
                # Chance of leak event occurring on this day
                if rnd.random() < 0.70:
                    event_time = now - datetime.timedelta(days=day_offset, hours=rnd.randint(1, 10), minutes=rnd.randint(0, 59))
                    
                    if leak_code == "IDLE_EXCESS":
                        duration_sec = rnd.randint(900, 3600) # 15 to 60 mins idle
                        idle_hours = duration_sec / 3600.0
                        fuel_wasted = round(idle_hours * 3.5, 2) # ~3.5 L/hr
                        cost_loss = round(fuel_wasted * fuel_price_usd, 2)
                        severity = "HIGH" if cost_loss > 3.0 else "MEDIUM"
                    elif leak_code == "AFTER_HOURS_USE":
                        duration_sec = rnd.randint(1800, 7200)
                        fuel_wasted = round((duration_sec / 3600.0) * 8.5, 2)
                        cost_loss = round(fuel_wasted * fuel_price_usd + 25.0, 2) # includes unauthorized surcharge
                        severity = "CRITICAL"
                    elif leak_code == "LOW_UTILISATION":
                        duration_sec = 28800 # 8 hours
                        fuel_wasted = 0.0
                        cost_loss = round(v["daily_lease_cost"] * 0.75, 2)
                        severity = "MEDIUM"
                    else:
                        duration_sec = rnd.randint(600, 1800)
                        fuel_wasted = round(rnd.uniform(2.0, 6.0), 2)
                        cost_loss = round(fuel_wasted * fuel_price_usd, 2)
                        severity = "LOW"

                    leak_event_id = str(uuid.uuid4())
                    leak_events.append((
                        leak_event_id,
                        v["tenant_id"],
                        v["id"],
                        v["depot_id"],
                        leak_type_id,
                        "OPEN" if day_offset == 0 else rnd.choice(["RESOLVED", "OPEN", "IN_REVIEW"]),
                        severity,
                        event_time,
                        event_time + datetime.timedelta(seconds=duration_sec),
                        duration_sec,
                        fuel_wasted,
                        cost_loss,
                        "USD",
                        "STREAM_SLIDING_WINDOW",
                        "dp3wm",
                        '{"injected": true}'
                    ))

                    # Create alert for high / critical leaks
                    if severity in ("HIGH", "CRITICAL") and day_offset <= 1:
                        alerts.append((
                            str(uuid.uuid4()),
                            v["tenant_id"],
                            leak_event_id,
                            severity,
                            f"Live Alert: {leak_code} detected on {v['license_plate']}",
                            f"Vehicle {v['license_plate']} ({v['make']} {v['model']}) exceeded threshold with estimated cost loss of ${cost_loss:.2f}.",
                            False,
                            event_time
                        ))

        print(f"   -> Inserting {len(leak_events):,} historical leak events...")
        execute_values(
            cur,
            """
            INSERT INTO leak_event (id, tenant_id, vehicle_id, depot_id, leak_type_id, status, severity, started_at, ended_at, duration_seconds, fuel_wasted_liters, estimated_cost_loss, currency, detection_method, geohash_5, raw_details)
            VALUES %s
            """,
            leak_events
        )

        print(f"   -> Inserting {len(alerts):,} active live alerts...")
        execute_values(
            cur,
            """
            INSERT INTO alert (id, tenant_id, leak_event_id, severity, title, message, is_read, dispatched_at)
            VALUES %s
            """,
            alerts
        )

        # 5. Seed Initial Pending AI Recommendations
        print("[5/5] Generating Initial Guarded Copilot Recommendations...")
        recommendations = [
            (
                str(uuid.uuid4()),
                tenants[0]["id"],
                depots[0]["id"],
                "Enforce 3-Minute Auto-Shutdown at Chicago Hub",
                "Telemetry shows Chicago Hub drivers exceed idle threshold during shift transition dwell by an average of 18 minutes. Installing a 3-minute automatic engine shutdown policy reduces fuel burn by 420 liters/month.",
                483.00,
                0.9200,
                "PENDING_APPROVAL"
            ),
            (
                str(uuid.uuid4()),
                tenants[0]["id"],
                depots[1]["id"],
                "Reassign 8 Low-Utilisation Medium Vans to Dallas Hub",
                "Peer-group clustering identified 8 medium duty vans operating below 25 km/day over 14 consecutive days. Consolidating leases recovers $1,800/month in idle lease depreciation.",
                1800.00,
                0.8800,
                "PENDING_APPROVAL"
            )
        ]
        execute_values(
            cur,
            """
            INSERT INTO recommendation (id, tenant_id, depot_id, title, proposed_action, projected_monthly_savings, confidence_score, status)
            VALUES %s
            """,
            recommendations
        )

        # Refresh Materialized View
        try:
            cur.execute("REFRESH MATERIALIZED VIEW agg_depot_daily_leak;")
        except Exception:
            pass

        conn.commit()
        cur.close()
        conn.close()

        elapsed = time.time() - start_time
        print(f"=================================================================")
        print(f" Seed Pack Successfully Completed in {elapsed:.2f} seconds!")
        print(f" Total Vehicles: {total_vehicles:,}")
        print(f" Total Tenants: {num_tenants}")
        print(f" Total Injected Leak Events: {len(leak_events):,}")
        print(f" Active Alerts: {len(alerts):,}")
        print(f"=================================================================")

    except Exception as e:
        conn.rollback()
        print(f"Error during seeding: {e}", file=sys.stderr)
        raise

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FleetLeak Enterprise Seed Pack")
    parser.add_argument("--tenants", type=int, default=20, help="Number of tenants (default: 20)")
    parser.add_argument("--vehicles", type=int, default=100000, help="Total vehicles to seed (default: 100000)")
    parser.add_argument("--days", type=int, default=7, help="Days of history (default: 7)")
    parser.add_argument("--clean", action="store_true", help="Clean truncate existing fleet before seeding")
    args = parser.parse_args()

    seed_database(num_tenants=args.tenants, total_vehicles=args.vehicles, days_history=args.days, clean=args.clean)
