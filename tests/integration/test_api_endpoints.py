"""
FleetLeak API Integration & Contract Test Suite
Tests REST endpoints, JWT authorization, keyset pagination, recommendations, and agent queries.
"""

from fastapi.testclient import TestClient
from services.api.main import app

client = TestClient(app)

def test_openapi_spec():
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    spec = response.json()
    assert spec["info"]["title"] == "FleetLeak: Fleet Fuel, Idling & Utilisation Intelligence API"
    print("Test OpenAPI Spec: PASSED")

def test_login_flow():
    response = client.post("/api/v1/auth/login", json={
        "email": "finance@apexlogistics.com",
        "password": "Password123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "fleet_manager"
    print("Test Login Flow & JWT Generation: PASSED")
    return data["access_token"]

def test_fleet_kpis(token):
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/fleet/kpis", headers=headers)
    assert response.status_code == 200
    kpis = response.json()
    assert kpis["total_vehicles"] > 0
    assert "monthly_leak_cost_usd" in kpis
    assert "recoverable_savings_usd" in kpis
    print(f"Test Fleet KPIs: PASSED (Total Vehicles: {kpis['total_vehicles']:,}, Leak Cost: ${kpis['monthly_leak_cost_usd']:.2f})")

def test_keyset_leaks_pagination(token):
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/leaks?limit=10", headers=headers)
    assert response.status_code == 200
    page = response.json()
    assert len(page["items"]) <= 10
    assert "has_more" in page
    print(f"Test Keyset Leaks Pagination: PASSED ({len(page['items'])} items returned)")

def test_depots_comparison(token):
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/depots/compare", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["depot_count"] > 0
    print(f"Test Depots Comparison: PASSED ({data['depot_count']} depots evaluated)")

def test_copilot_chat(token):
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post("/api/v1/agent/query", json={
        "prompt": "Which depots have the highest fuel leak cost?"
    }, headers=headers)
    assert response.status_code == 200
    agent_res = response.json()
    assert agent_res["status"] == "SUCCESS"
    assert "response" in agent_res
    print(f"Test Copilot Chat Query: PASSED (Engine: {agent_res['engine']}, Latency: {agent_res['latency_ms']} ms)")

def test_recommendation_approval(token):
    headers = {"Authorization": f"Bearer {token}"}
    # List recommendations
    list_res = client.get("/api/v1/recommendations", headers=headers)
    assert list_res.status_code == 200
    recs = list_res.json()["recommendations"]
    if recs:
        rec_id = recs[0]["id"]
        approve_res = client.post(f"/api/v1/recommendations/{rec_id}/approve", json={
            "notes": "Verified via integration test"
        }, headers=headers)
        assert approve_res.status_code == 200
        assert approve_res.json()["new_status"] == "APPROVED"
        print("Test Human-in-the-Loop Recommendation Approval: PASSED")

if __name__ == "__main__":
    t = test_login_flow()
    test_openapi_spec()
    test_fleet_kpis(t)
    test_keyset_leaks_pagination(t)
    test_depots_comparison(t)
    test_copilot_chat(t)
    test_recommendation_approval(t)
    print("ALL API INTEGRATION TESTS PASSED!")
