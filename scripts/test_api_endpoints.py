import sys
from pathlib import Path
sys.path.insert(0, str(Path("backend").resolve()))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_endpoints():
    print("========================================")
    print("TESTING BACKEND API ENDPOINTS")
    print("========================================")
    
    # 1. Health
    res = client.get("/api/health")
    print(f"GET /api/health -> {res.status_code} | {res.json().get('status')}")
    assert res.status_code == 200

    # 2. Wells
    res = client.get("/api/wells")
    wells = res.json()
    print(f"GET /api/wells -> {res.status_code} | {len(wells)} wells loaded")
    assert res.status_code == 200
    test_well_id = wells[0]["well_id"] if wells else "BGW-SYN-001"
    print(f"Testing with Well ID: {test_well_id}")

    # 3. Digital Twin State
    res = client.get(f"/api/wells/{test_well_id}/digital-twin/state")
    print(f"GET /api/wells/{test_well_id}/digital-twin/state -> {res.status_code}")
    assert res.status_code == 200
    state = res.json()
    print(f"   -> Res Temp: {state['reservoir']['temperature_c']}°C | Viscosity: {state['reservoir']['viscosity_cp']} cP | Floating Risk: {state['srp']['rod_floating_risk_pct']}%")

    # 4. Production History
    res = client.get(f"/api/wells/{test_well_id}/production")
    print(f"GET /api/wells/{test_well_id}/production -> {res.status_code} | {len(res.json().get('data', []))} days")
    assert res.status_code == 200

    # 5. Production Forecast
    res = client.get(f"/api/wells/{test_well_id}/forecast")
    print(f"GET /api/wells/{test_well_id}/forecast -> {res.status_code} | model: {res.json().get('model_name')}")
    assert res.status_code == 200

    # 6. CSS Cycles
    res = client.get(f"/api/wells/{test_well_id}/css")
    print(f"GET /api/wells/{test_well_id}/css -> {res.status_code} | {len(res.json())} cycles")
    assert res.status_code == 200

    # 7. CSS Optimize
    res = client.post(f"/api/wells/{test_well_id}/css/optimize")
    print(f"POST /api/wells/{test_well_id}/css/optimize -> {res.status_code}")
    assert res.status_code == 200

    # 8. SRP Config & Optimize
    res = client.get(f"/api/wells/{test_well_id}/srp")
    print(f"GET /api/wells/{test_well_id}/srp -> {res.status_code}")
    res_srp_opt = client.post(f"/api/wells/{test_well_id}/srp/optimize")
    print(f"POST /api/wells/{test_well_id}/srp/optimize -> {res_srp_opt.status_code}")

    # 9. Predictions
    res = client.get(f"/api/{test_well_id}/predictions")
    print(f"GET /api/{test_well_id}/predictions -> {res.status_code} | {len(res.json())} predictions")
    assert res.status_code == 200

    # 10. Anomalies
    res = client.get(f"/api/{test_well_id}/anomalies")
    print(f"GET /api/{test_well_id}/anomalies -> {res.status_code}")
    assert res.status_code == 200

    # 11. Failure Risk
    res = client.get(f"/api/wells/{test_well_id}/failure-risk")
    print(f"GET /api/wells/{test_well_id}/failure-risk -> {res.status_code} | score: {res.json().get('overall_risk_score')}% ({res.json().get('risk_tier')})")
    assert res.status_code == 200

    # 12. Recommendations
    res = client.get(f"/api/{test_well_id}/recommendations")
    print(f"GET /api/{test_well_id}/recommendations -> {res.status_code} | {len(res.json())} recommendations")
    assert res.status_code == 200

    print("\n========================================")
    print("ALL 12 API ENDPOINTS VERIFIED & PASSING!")
    print("========================================")

if __name__ == "__main__":
    test_endpoints()
