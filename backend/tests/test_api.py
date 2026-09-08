"""
Integration tests for the River Health Portal API endpoints.
"""
import pytest
from fastapi import status


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "healthy"


def test_river_health_summary(client, auth_headers):
    response = client.get("/api/river-health", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "final_score" in data
    assert "health_level" in data
    assert "confidence_score" in data
    assert "confidence_level" in data
    assert "freshness" in data
    assert "evidence_contributions" in data
    assert "sensor" in data["evidence_contributions"]
    assert "satellite" in data["evidence_contributions"]
    assert "citizen" in data["evidence_contributions"]
    assert "validation" in data["evidence_contributions"]


def test_demo_scenario_switch(client, auth_headers):
    # Switch to MISSING_SENSOR scenario
    res = client.post(
        "/api/demo/scenario",
        json={"scenario": "MISSING_SENSOR"},
        headers=auth_headers,
    )
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["active_scenario"] == "MISSING_SENSOR"

    # Check that river-health reflects missing sensor
    rh_res = client.get("/api/river-health", headers=auth_headers)
    assert rh_res.status_code == status.HTTP_200_OK
    rh_data = rh_res.json()
    assert rh_data["demo_scenario"] == "MISSING_SENSOR"
    assert "SENSOR" in rh_data["missing_sources"]

    # Reset back to NORMAL
    res_reset = client.post(
        "/api/demo/scenario",
        json={"scenario": "NORMAL"},
        headers=auth_headers,
    )
    assert res_reset.status_code == status.HTTP_200_OK


def test_evidence_listing_and_filtering(client, auth_headers):
    response = client.get("/api/evidence", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    items = response.json()
    assert len(items) > 0
    assert any(it["source_type"] == "composite" for it in items)
    assert any(it["source_type"] == "sensor" for it in items)

    # Filter by source_type=sensor
    res_sensor = client.get("/api/evidence?source_type=sensor", headers=auth_headers)
    assert res_sensor.status_code == status.HTTP_200_OK
    assert all(it["source_type"] == "sensor" for it in res_sensor.json())


def test_evidence_drilldown(client, auth_headers):
    response = client.get("/api/evidence/composite-current", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == "composite-current"
    assert "claim" in data
    assert "methodology" in data
    assert "confidence_factors" in data
    assert "rules_applied" in data
    assert "action_guidance" in data


def test_provenance_chain(client, auth_headers):
    response = client.get("/api/provenance/sensor-1", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["evidence_id"] == "sensor-1"
    assert len(data["steps"]) >= 4
    stages = [s["stage"] for s in data["steps"]]
    assert any("Collection" in s for s in stages)
    assert any("Scoring" in s for s in stages)


def test_sensors_and_readings(client, auth_headers):
    res_sensors = client.get("/api/sensors", headers=auth_headers)
    assert res_sensors.status_code == status.HTTP_200_OK
    sensors = res_sensors.json()
    assert len(sensors) >= 3
    s_id = sensors[0]["id"]

    res_readings = client.get(f"/api/sensors/{s_id}/readings?limit=20", headers=auth_headers)
    assert res_readings.status_code == status.HTTP_200_OK
    readings = res_readings.json()
    assert len(readings) > 0
    assert "ph" in readings[0]
    assert "dissolved_oxygen" in readings[0]


def test_satellite_endpoints(client, auth_headers):
    res = client.get("/api/satellite", headers=auth_headers)
    assert res.status_code == status.HTTP_200_OK
    sat = res.json()
    assert sat is not None
    assert "ndwi" in sat
    assert "cloud_cover" in sat

    res_hist = client.get("/api/satellite/history", headers=auth_headers)
    assert res_hist.status_code == status.HTTP_200_OK
    assert len(res_hist.json()) > 0


def test_citizen_observation_flow(client, auth_headers, volunteer_headers):
    # Submit observation
    obs_payload = {
        "location": "Downstream Testing Ghat",
        "latitude": 10.9980,
        "longitude": 76.9750,
        "water_color": "CLEAR",
        "smell": "NONE",
        "visible_waste": False,
        "algae_presence": False,
        "fish_activity": "ACTIVE",
        "user_comment": "Water looks remarkably clear this morning.",
        "overall_condition": "GOOD",
        "confidence": 0.9,
    }
    res_create = client.post("/api/citizen-observations", json=obs_payload, headers=auth_headers)
    assert res_create.status_code == status.HTTP_200_OK
    obs_data = res_create.json()
    obs_id = obs_data["id"]
    assert obs_data["verification_status"] == "PENDING"

    # Validate observation as volunteer
    val_payload = {
        "observation_id": obs_id,
        "validation_status": "VALIDATED",
        "validation_score": 90.0,
        "notes": "Verified by community river volunteer team.",
    }
    res_val = client.post("/api/validation", json=val_payload, headers=volunteer_headers)
    assert res_val.status_code == status.HTTP_200_OK
    val_data = res_val.json()
    assert val_data["validation_status"] == "VALIDATED"


def test_water_consumption_metrics(client, auth_headers):
    res = client.get("/api/water-consumption", headers=auth_headers)
    assert res.status_code == status.HTTP_200_OK
    assert len(res.json()) > 0

    res_summary = client.get("/api/water-consumption/summary", headers=auth_headers)
    assert res_summary.status_code == status.HTTP_200_OK
    summary = res_summary.json()
    assert "percentage_saved" in summary
    assert "by_building" in summary
    assert "Block A" in summary["by_building"]


def test_alerts_listing_and_resolve(client, auth_headers, volunteer_headers):
    res = client.get("/api/alerts", headers=auth_headers)
    assert res.status_code == status.HTTP_200_OK
    alerts = res.json()
    assert len(alerts) > 0

    target_alert = next((a for a in alerts if not a["is_resolved"]), alerts[0])
    res_resolve = client.patch(f"/api/alerts/{target_alert['id']}/resolve", headers=volunteer_headers)
    assert res_resolve.status_code == status.HTTP_200_OK
    assert res_resolve.json()["is_resolved"] is True


def test_questions_flow(client, auth_headers, admin_headers):
    # Create question
    q_payload = {
        "evidence_type": "composite",
        "evidence_id": 1,
        "question_type": "INTERPRETATION",
        "comment": "Can we explain why the confidence is High despite the gap in satellite passes?",
    }
    res_q = client.post("/api/questions", json=q_payload, headers=auth_headers)
    assert res_q.status_code == status.HTTP_200_OK
    q_data = res_q.json()
    assert q_data["status"] == "OPEN"
    q_id = q_data["id"]

    # Respond as admin
    resp_payload = {
        "admin_response": "In-situ sensors update every hour and provide 35% of the score weight, compensating for satellite revisit intervals.",
        "status": "RESOLVED",
    }
    res_resp = client.patch(f"/api/questions/{q_id}/respond", json=resp_payload, headers=admin_headers)
    assert res_resp.status_code == status.HTTP_200_OK
    assert res_resp.json()["status"] == "RESOLVED"
    assert "compensating" in res_resp.json()["admin_response"]


def test_metrics_endpoint(client, auth_headers):
    res = client.get("/api/metrics", headers=auth_headers)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert "system" in data
    assert "experiment" in data
    assert "validation_dataset" in data
    assert "error_analysis" in data
