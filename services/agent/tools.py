"""
FleetLeak Guarded Agent Tools
Implements strictly scoped, tenant-isolated tools for the AI Copilot.
All read tools enforce tenant_id scoping.
All write tools require explicit human-in-the-loop fleet_manager approval.
"""

import os
import uuid
import datetime
from typing import Dict, Any, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

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
        password=DB_PASS,
        cursor_factory=RealDictCursor
    )

class GuardedAgentTools:
    """Allowed tool collection with strict tenant isolation and audit enforcement"""

    @staticmethod
    def get_top_leaks(tenant_id: str, limit: int = 5) -> Dict[str, Any]:
        """Fetch the highest cost fuel leak events for the authenticated tenant"""
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                le.id AS leak_id,
                v.license_plate,
                v.make,
                v.model,
                d.name AS depot_name,
                lt.code AS leak_type,
                le.severity,
                le.duration_seconds / 60 AS duration_minutes,
                le.fuel_wasted_liters,
                le.estimated_cost_loss,
                le.started_at,
                le.status
            FROM leak_event le
            JOIN vehicle v ON le.vehicle_id = v.id
            JOIN depot d ON le.depot_id = d.id
            JOIN leak_type lt ON le.leak_type_id = lt.id
            WHERE le.tenant_id = %s
            ORDER BY le.estimated_cost_loss DESC
            LIMIT %s;
        """, (tenant_id, min(limit, 20)))
        rows = cur.fetchall()
        cur.close()
        conn.close()

        # Convert datetimes and UUIDs to strings
        for r in rows:
            r["leak_id"] = str(r["leak_id"])
            r["started_at"] = r["started_at"].isoformat() if r["started_at"] else None
            r["estimated_cost_loss"] = float(r["estimated_cost_loss"])
            r["fuel_wasted_liters"] = float(r["fuel_wasted_liters"])

        return {
            "tool": "get_top_leaks",
            "tenant_id": tenant_id,
            "count": len(rows),
            "leaks": rows
        }

    @staticmethod
    def explain_vehicle(tenant_id: str, identifier: str) -> Dict[str, Any]:
        """Provides operational context, idle profile, and leak history for a vehicle"""
        conn = get_db()
        cur = conn.cursor()
        # Query by VIN or license plate or vehicle UUID
        cur.execute("""
            SELECT 
                v.id AS vehicle_id,
                v.vin,
                v.license_plate,
                v.make,
                v.model,
                v.year,
                v.daily_lease_cost,
                vc.code AS vehicle_class,
                vc.propulsion_type,
                d.name AS depot_name,
                COUNT(le.id) AS total_leaks,
                COALESCE(SUM(le.fuel_wasted_liters), 0) AS total_fuel_wasted,
                COALESCE(SUM(le.estimated_cost_loss), 0) AS total_cost_loss
            FROM vehicle v
            JOIN vehicle_class vc ON v.vehicle_class_id = vc.id
            JOIN depot d ON v.depot_id = d.id
            LEFT JOIN leak_event le ON v.id = le.vehicle_id
            WHERE v.tenant_id = %s AND (v.vin = %s OR v.license_plate = %s OR v.id::text = %s)
            GROUP BY v.id, vc.code, vc.propulsion_type, d.name;
        """, (tenant_id, identifier, identifier, identifier))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            return {
                "error": f"Vehicle '{identifier}' not found in tenant organization.",
                "tenant_id": tenant_id
            }

        row["vehicle_id"] = str(row["vehicle_id"])
        row["daily_lease_cost"] = float(row["daily_lease_cost"])
        row["total_fuel_wasted"] = float(row["total_fuel_wasted"])
        row["total_cost_loss"] = float(row["total_cost_loss"])

        return {
            "tool": "explain_vehicle",
            "vehicle": row,
            "explanation": f"Vehicle {row['license_plate']} ({row['make']} {row['model']}) assigned to {row['depot_name']} has accumulated {row['total_leaks']} leak incidents totaling ${row['total_cost_loss']:.2f} in excess fuel loss."
        }

    @staticmethod
    def compare_depots(tenant_id: str) -> Dict[str, Any]:
        """Compares operational fuel waste and idle leakage across all tenant depots"""
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                d.id AS depot_id,
                d.name AS depot_name,
                d.geohash_7,
                COUNT(v.id) AS assigned_vehicles,
                COUNT(le.id) AS total_leaks,
                COALESCE(SUM(le.fuel_wasted_liters), 0) AS total_fuel_wasted_liters,
                COALESCE(SUM(le.estimated_cost_loss), 0) AS total_leak_cost_usd
            FROM depot d
            LEFT JOIN vehicle v ON d.id = v.depot_id
            LEFT JOIN leak_event le ON d.id = le.depot_id
            WHERE d.tenant_id = %s
            GROUP BY d.id, d.name, d.geohash_7
            ORDER BY total_leak_cost_usd DESC;
        """, (tenant_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()

        for r in rows:
            r["depot_id"] = str(r["depot_id"])
            r["total_fuel_wasted_liters"] = float(r["total_fuel_wasted_liters"])
            r["total_leak_cost_usd"] = float(r["total_leak_cost_usd"])

        return {
            "tool": "compare_depots",
            "tenant_id": tenant_id,
            "depot_count": len(rows),
            "depots": rows
        }

    @staticmethod
    def estimate_savings(tenant_id: str, idle_reduction_pct: float = 30.0) -> Dict[str, Any]:
        """Calculates financial and CO2 savings for what-if scenarios"""
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                COALESCE(SUM(estimated_cost_loss), 0) AS monthly_idle_loss,
                COALESCE(SUM(fuel_wasted_liters), 0) AS monthly_fuel_wasted
            FROM leak_event
            WHERE tenant_id = %s;
        """, (tenant_id,))
        res = cur.fetchone()
        cur.close()
        conn.close()

        monthly_loss = float(res["monthly_idle_loss"]) if res else 0.0
        monthly_liters = float(res["monthly_fuel_wasted"]) if res else 0.0

        fraction = idle_reduction_pct / 100.0
        projected_monthly_usd = monthly_loss * fraction
        projected_annual_usd = projected_monthly_usd * 12.0
        # 1 liter diesel = ~2.68 kg CO2
        saved_co2_kg = (monthly_liters * fraction) * 2.68
        saved_co2_tons = (saved_co2_kg * 12.0) / 1000.0

        return {
            "tool": "estimate_savings",
            "tenant_id": tenant_id,
            "idle_reduction_percent": idle_reduction_pct,
            "projected_monthly_savings_usd": round(projected_monthly_usd, 2),
            "projected_annual_savings_usd": round(projected_annual_usd, 2),
            "projected_annual_co2_reduced_metric_tons": round(saved_co2_tons, 2)
        }

    @staticmethod
    def create_recommendation(tenant_id: str, depot_id: Optional[str], title: str, proposed_action: str, projected_monthly_savings: float) -> Dict[str, Any]:
        """
        Guarded write tool: Strictly inserts recommendation in PENDING_APPROVAL status.
        Does NOT execute or modify system policies without explicit human approval.
        """
        rec_id = str(uuid.uuid4())
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO recommendation (id, tenant_id, depot_id, title, proposed_action, projected_monthly_savings, status, created_by_agent)
            VALUES (%s, %s, %s, %s, %s, %s, 'PENDING_APPROVAL', TRUE);
        """, (rec_id, tenant_id, depot_id, title, proposed_action, projected_monthly_savings))
        conn.commit()
        cur.close()
        conn.close()

        return {
            "tool": "create_recommendation",
            "recommendation_id": rec_id,
            "status": "PENDING_APPROVAL",
            "message": "Recommendation successfully staged. Awaiting approval from Fleet Finance Manager."
        }
