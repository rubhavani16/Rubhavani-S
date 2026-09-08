"""
Tests for Evidence Engine, Confidence Model, Freshness, and Anomaly Detection.
"""
from datetime import datetime, timedelta
import pytest

from app.engines.evidence_engine import (
    compute_evidence_score, apply_sensor_rules, apply_satellite_rules,
    apply_citizen_rules, apply_validation_rules, classify_health, THRESHOLDS, WEIGHTS
)
from app.engines.confidence_engine import (
    compute_confidence, compute_freshness_all, calculate_freshness, compute_freshness
)
from app.engines.anomaly_engine import detect_anomalies


def test_classify_health():
    assert classify_health(85.0) == "GOOD"
    assert classify_health(70.0) == "MODERATE"
    assert classify_health(50.0) == "CONCERNING"
    assert classify_health(30.0) == "POOR"


def test_sensor_rules_healthy():
    readings = [
        {"ph": 7.4, "turbidity": 4.0, "dissolved_oxygen": 8.5, "conductivity": 250.0, "temperature": 23.0, "is_anomaly": False, "is_missing": False},
        {"ph": 7.2, "turbidity": 5.0, "dissolved_oxygen": 8.2, "conductivity": 260.0, "temperature": 23.5, "is_anomaly": False, "is_missing": False},
    ]
    res = apply_sensor_rules(readings)
    assert res.raw_score >= 85.0
    assert res.ph_status == "NORMAL"
    assert res.turbidity_status == "NORMAL"
    assert res.do_status == "NORMAL"


def test_sensor_rules_critical_ph():
    readings = [
        {"ph": 3.0, "turbidity": 5.0, "dissolved_oxygen": 8.0, "conductivity": 300.0, "temperature": 22.0, "is_anomaly": False, "is_missing": False}
    ]
    res = apply_sensor_rules(readings)
    assert res.ph_status == "CRITICAL"
    assert res.raw_score < 80.0


def test_satellite_rules_cloudy():
    sat = {
        "cloud_cover": 90.0,  # exceeds 80% threshold
        "ndvi": 0.4,
        "ndwi": 0.1,
        "turbidity_proxy": 8.0,
    }
    res = apply_satellite_rules(sat)
    assert res.is_usable is False
    assert res.raw_score == 0.0


def test_satellite_rules_healthy():
    sat = {
        "cloud_cover": 15.0,
        "ndvi": 0.5,
        "ndwi": 0.3,
        "turbidity_proxy": 5.0,
    }
    res = apply_satellite_rules(sat)
    assert res.is_usable is True
    assert res.raw_score >= 80.0


def test_freshness_calculation():
    now = datetime.utcnow()
    # 30 mins ago -> FRESH for sensor
    res_fresh = calculate_freshness(now - timedelta(minutes=30), "sensor")
    assert res_fresh.status == "FRESH"
    assert res_fresh.freshness_score == 100.0

    # 10 hours ago -> STALE for sensor (stale > 6h)
    res_stale = calculate_freshness(now - timedelta(hours=10), "sensor")
    assert res_stale.status in ["STALE", "MISSING"]

    # None -> MISSING
    res_missing = calculate_freshness(None, "sensor")
    assert res_missing.status == "MISSING"
    assert res_missing.freshness_score == 0.0


def test_confidence_computation():
    now = datetime.utcnow()
    freshness = compute_freshness_all(
        last_sensor_reading=now - timedelta(hours=1),
        last_satellite_obs=now - timedelta(days=2),
        last_citizen_obs=now - timedelta(days=3),
        last_validation=now - timedelta(days=4),
    )
    source_scores = {"sensor": 80.0, "satellite": 75.0, "citizen": 78.0}
    
    conf = compute_confidence(
        freshness=freshness,
        source_scores=source_scores,
        validation_coverage=80.0,
        sources_available=4,
        total_sources=4,
        has_conflict=False,
        has_anomaly=False,
    )
    assert conf.confidence_score >= 70.0
    assert conf.confidence_level in ["HIGH", "MEDIUM"]


def test_detect_anomalies_bounds():
    readings = [
        {"id": 1, "ph": 1.5, "turbidity": 5.0, "dissolved_oxygen": 8.0, "conductivity": 200.0, "temperature": 20.0, "is_anomaly": False, "is_missing": False}
    ]
    anomalies = detect_anomalies(readings)
    assert len(anomalies) > 0
    assert any(a["parameter"].lower() == "ph" for a in anomalies)
