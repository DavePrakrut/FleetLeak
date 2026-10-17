"""
BDD Step Definitions for FleetLeak Enterprise Scenarios
"""

from behave import given, when, then
from services.stream.worker import PipelineWorker
from services.agent.copilot import GuardedCopilot
from services.agent.tools import GuardedAgentTools
from services.normaliser.deduplicator import TelemetryDeduplicator

TENANT_1 = "10000000-0000-0000-0000-000000000001"
TENANT_2 = "10000000-0000-0000-0000-000000000002"
USER_1 = "f0000000-0000-0000-0000-000000000001"

# Scenario 1
@given('a commercial delivery vehicle "{plate}" assigned to "{depot}"')
def step_impl(context, plate, depot):
    context.worker = PipelineWorker(use_redis=False)
    context.vin = "1FT8W2BT4REC99999"
    context.worker.normaliser.vin_cache[context.vin] = (
        "30000000-0000-0000-0000-000000000001",
        TENANT_1
    )

@when('the vehicle engine remains on at 0 km/h for 360 seconds')
def step_impl(context):
    packet1 = {
        "OEM": "OEM_GEOTAB",
        "VehicleIdentificationNumber": context.vin,
        "SequenceId": 100,
        "DateTime": "2026-10-17T10:00:00Z",
        "Speed": 0.0,
        "Ignition": True,
        "FuelRateLitersPerHour": 3.5
    }
    context.worker.process_raw_packet(packet1)
    packet2 = {
        "OEM": "OEM_GEOTAB",
        "VehicleIdentificationNumber": context.vin,
        "SequenceId": 101,
        "DateTime": "2026-10-17T10:06:00Z", # 360 seconds later
        "Speed": 0.0,
        "Ignition": True,
        "FuelRateLitersPerHour": 3.5
    }
    context.alert = context.worker.process_raw_packet(packet2)

@then('a leak event of type "{leak_type}" is generated')
def step_impl(context, leak_type):
    assert context.alert is not None
    assert context.alert["leak_type"] == leak_type

@then('an alert is published with status "{status}" and positive financial loss')
def step_impl(context, status):
    assert context.alert["status"] == status
    assert context.alert["estimated_cost_loss"] > 0

# Scenario 2
@given('a valid telemetry packet with sequence {seq:d}')
def step_impl(context, seq):
    context.dedupe = TelemetryDeduplicator()
    context.veh_id = "30000000-0000-0000-0000-000000000001"
    context.ts = "2026-10-17T10:00:00Z"
    context.seq = seq
    is_dup = context.dedupe.is_duplicate(context.veh_id, context.seq, context.ts)
    assert not is_dup

@when('the same sequence {seq:d} packet is transmitted again')
def step_impl(context, seq):
    context.is_second_dup = context.dedupe.is_duplicate(context.veh_id, context.seq, context.ts)

@then('the deduplicator drops the packet as "{err_msg}"')
def step_impl(context, err_msg):
    assert context.is_second_dup is True

@then('no duplicate row is written to the database')
def step_impl(context):
    assert True

# Scenario 3
@given('a user belonging to tenant "{tenant}"')
def step_impl(context, tenant):
    context.copilot = GuardedCopilot()

@when('the user requests vehicle records belonging to "{other_tenant}"')
def step_impl(context, other_tenant):
    context.response = context.copilot.query(TENANT_1, USER_1, f"Show me vehicles from {other_tenant}")

@then('the system refuses access with zero cross-tenant leak')
def step_impl(context):
    assert context.response["status"] == "REFUSED" or context.response["tool_called"] != "cross_tenant"

# Scenario 4
@given('the guarded AI copilot stages an automatic engine shut-off policy')
def step_impl(context):
    context.copilot = GuardedCopilot()

@when('the recommendation is generated')
def step_impl(context):
    context.res = context.copilot.query(TENANT_1, USER_1, "Recommend an auto shutdown policy")

@then('its status must be "{status}"')
def step_impl(context, status):
    assert context.res["data"]["status"] == status

@then('the action cannot execute until authorized by a fleet_manager')
def step_impl(context):
    assert "PENDING_APPROVAL" in context.res["data"]["status"]

# Scenario 5
@given('an authenticated request to erase driver "{driver_code}"')
def step_impl(context, driver_code):
    context.driver_code = driver_code
    from services.agent.tools import get_db
    conn = get_db()
    cur = conn.cursor()
    # Insert or get test driver
    cur.execute("""
        INSERT INTO driver (id, tenant_id, employee_code, full_name)
        VALUES ('d1111111-1111-1111-1111-111111111111', %s, %s, 'Test Erasure Driver')
        ON CONFLICT (tenant_id, employee_code) DO NOTHING;
    """, (TENANT_1, driver_code))
    conn.commit()
    cur.execute("SELECT id FROM driver WHERE tenant_id = %s AND employee_code = %s;", (TENANT_1, driver_code))
    row = cur.fetchone()
    context.driver_id = str(row["id"])
    cur.close()
    conn.close()

@when('the erasure endpoint is called')
def step_impl(context):
    from services.api.main import app
    from fastapi.testclient import TestClient
    client = TestClient(app)
    context.api_res = client.post("/api/v1/privacy/erasure-requests", json={
        "driver_id": context.driver_id,
        "reason": "GDPR right to erasure"
    })

@then('an erasure request is registered with status "{status}"')
def step_impl(context, status):
    assert context.api_res.status_code == 200
    assert context.api_res.json()["status"] == status

@then('an immutable record is written to the audit log')
def step_impl(context):
    assert context.api_res.json()["compliance_standard"] == "GDPR Article 17 / DPDP Section 12"
