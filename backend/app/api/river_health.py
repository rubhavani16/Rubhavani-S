"""
River Health & Evidence API routes — the core of the portal.
Includes: /api/river-health, /api/evidence, /api/provenance, /api/metrics, /api/demo
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import (
    User, Sensor, SensorReading, SatelliteObservation, CitizenObservation,
    ValidationRecord, EvidenceScore, Alert, Question, ExperimentResult,
    ValidationDataset, WaterConsumption,
)
from app.engines.evidence_engine import compute_evidence_score, WEIGHTS, THRESHOLDS
from app.engines.confidence_engine import compute_confidence, compute_freshness_all
from app.engines.anomaly_engine import detect_anomalies, check_missing_data

router = APIRouter(prefix="/api", tags=["river-health"])

# ─── Demo scenario state (in-memory for demo purposes) ────────────────────────
_demo_scenario = {"active": "NORMAL"}

DEMO_SCENARIOS = {
    "NORMAL": {"label": "Normal Data", "description": "All sources active and fresh"},
    "MISSING_SENSOR": {"label": "Missing Sensor", "description": "Main sensor offline — data gap simulation"},
    "STALE_SATELLITE": {"label": "Stale Satellite", "description": "Satellite data is 12 days old"},
    "CONFLICTING": {"label": "Conflicting Evidence", "description": "Sensor reports GOOD; citizens report POOR"},
    "ANOMALY": {"label": "Sensor Anomaly", "description": "pH spike detected — anomaly flagged"},
    "NO_CITIZENS": {"label": "No Citizen Data", "description": "No citizen observations in 30 days"},
    "LOW_SATELLITE": {"label": "Low Satellite Quality", "description": "Cloud cover >80% — satellite unavailable"},
}


def _get_recent_readings(db: Session, hours: int = 6, limit: int = 50) -> List[dict]:
    """Get recent sensor readings as dicts."""
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    readings = (
        db.query(SensorReading)
        .filter(SensorReading.timestamp >= cutoff)
        .order_by(desc(SensorReading.timestamp))
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "sensor_id": r.sensor_id,
            "timestamp": r.timestamp,
            "ph": r.ph,
            "turbidity": r.turbidity,
            "dissolved_oxygen": r.dissolved_oxygen,
            "conductivity": r.conductivity,
            "temperature": r.temperature,
            "water_level": r.water_level,
            "is_anomaly": r.is_anomaly,
            "is_missing": r.is_missing,
            "data_quality": r.data_quality,
        }
        for r in readings
    ]


def _get_latest_satellite(db: Session) -> Optional[dict]:
    """Get the most recent usable satellite observation."""
    sat = (
        db.query(SatelliteObservation)
        .filter(SatelliteObservation.is_usable == True)
        .order_by(desc(SatelliteObservation.observation_date))
        .first()
    )
    if not sat:
        return None
    return {
        "id": sat.id,
        "observation_date": sat.observation_date,
        "ndvi": sat.ndvi,
        "ndwi": sat.ndwi,
        "turbidity_proxy": sat.turbidity_proxy,
        "cloud_cover": sat.cloud_cover,
        "water_surface_area": sat.water_surface_area,
        "satellite_source": sat.satellite_source,
        "is_simulated": sat.is_simulated,
    }


def _get_recent_citizen_obs(db: Session, days: int = 30) -> List[dict]:
    """Get recent citizen observations as dicts."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    obs = (
        db.query(CitizenObservation)
        .filter(CitizenObservation.timestamp >= cutoff)
        .order_by(desc(CitizenObservation.timestamp))
        .all()
    )
    return [
        {
            "id": o.id,
            "timestamp": o.timestamp,
            "location": o.location,
            "overall_condition": o.overall_condition,
            "confidence": o.confidence,
            "verification_status": o.verification_status.value if o.verification_status else "PENDING",
            "water_color": o.water_color,
            "smell": o.smell,
            "visible_waste": o.visible_waste,
            "algae_presence": o.algae_presence,
        }
        for o in obs
    ]


def _get_recent_validations(db: Session, days: int = 30) -> List[dict]:
    cutoff = datetime.utcnow() - timedelta(days=days)
    vals = (
        db.query(ValidationRecord)
        .filter(ValidationRecord.validation_date >= cutoff)
        .all()
    )
    return [
        {
            "id": v.id,
            "observation_id": v.observation_id,
            "validation_status": v.validation_status.value,
            "validation_score": v.validation_score,
            "validation_date": v.validation_date,
        }
        for v in vals
    ]


def _apply_demo_scenario(
    scenario: str,
    readings: list,
    satellite: Optional[dict],
    citizen_obs: list,
    validations: list,
):
    """Modify data to simulate edge cases for demo."""
    if scenario == "MISSING_SENSOR":
        return [], satellite, citizen_obs, validations, False, True

    if scenario == "STALE_SATELLITE":
        if satellite:
            satellite = dict(satellite)
            satellite["observation_date"] = datetime.utcnow() - timedelta(days=12)
        return readings, satellite, citizen_obs, validations, True, True

    if scenario == "CONFLICTING":
        # Sensor looks great, citizens look poor
        good_readings = [dict(r) for r in readings]
        for r in good_readings:
            r["ph"] = 7.2
            r["turbidity"] = 4.0
            r["dissolved_oxygen"] = 9.5
            r["conductivity"] = 200.0
            r["is_anomaly"] = False
        bad_citizens = [dict(o) for o in citizen_obs[:5]] if citizen_obs else [
            {"overall_condition": "POOR", "confidence": 0.85, "verification_status": "VALIDATED",
             "water_color": "BROWN", "smell": "STRONG", "visible_waste": True, "algae_presence": True,
             "timestamp": datetime.utcnow() - timedelta(hours=4), "location": "River Bend Park", "id": 9999}
        ]
        for o in bad_citizens:
            o["overall_condition"] = "POOR"
        return good_readings, satellite, bad_citizens, validations, True, True

    if scenario == "ANOMALY":
        if readings:
            anomaly_readings = [dict(r) for r in readings]
            anomaly_readings[0]["ph"] = 2.3
            anomaly_readings[0]["is_anomaly"] = True
            return anomaly_readings, satellite, citizen_obs, validations, True, True
        return readings, satellite, citizen_obs, validations, True, True

    if scenario == "NO_CITIZENS":
        return readings, satellite, [], [], True, True

    if scenario == "LOW_SATELLITE":
        bad_sat = {"cloud_cover": 95.0, "observation_date": datetime.utcnow() - timedelta(days=1),
                   "is_simulated": True, "ndvi": 0.4, "ndwi": 0.1, "turbidity_proxy": 8.0,
                   "water_surface_area": 11000, "satellite_source": "SIMULATED_SENTINEL2"}
        return readings, bad_sat, citizen_obs, validations, True, True

    # NORMAL
    return readings, satellite, citizen_obs, validations, True, True


# ─── /api/river-health ────────────────────────────────────────────────────────

@router.get("/river-health")
async def get_river_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get aggregated river health score with confidence and freshness."""
    scenario = _demo_scenario["active"]

    # Gather raw data
    readings = _get_recent_readings(db, hours=6)
    satellite = _get_latest_satellite(db)
    citizen_obs = _get_recent_citizen_obs(db, days=30)
    validations = _get_recent_validations(db, days=30)

    # Apply demo scenario
    readings, satellite, citizen_obs, validations, sat_avail, sensor_avail = _apply_demo_scenario(
        scenario, readings, satellite, citizen_obs, validations
    )

    # Evidence scoring
    evidence = compute_evidence_score(
        sensor_readings=readings,
        satellite_observation=satellite,
        citizen_observations=citizen_obs,
        validation_records=validations,
        sensor_available=bool(readings),
        satellite_available=sat_avail,
    )

    # Freshness
    last_sensor = max((r["timestamp"] for r in readings), default=None) if readings else None
    last_sat = satellite["observation_date"] if satellite else None
    last_citizen = max((o["timestamp"] for o in citizen_obs), default=None) if citizen_obs else None
    last_val = max((v["validation_date"] for v in validations), default=None) if validations else None

    freshness = compute_freshness_all(last_sensor, last_sat, last_citizen, last_val)

    # Confidence
    source_scores = {
        "sensor": evidence.sensor_detail.raw_score,
        "satellite": evidence.satellite_detail.raw_score,
        "citizen": evidence.citizen_detail.raw_score,
    }
    sources_available = sum(1 for s in [readings, [satellite] if satellite else [], citizen_obs, validations] if s)
    confidence = compute_confidence(
        freshness=freshness,
        source_scores=source_scores,
        validation_coverage=evidence.validation_detail.coverage_percent,
        sources_available=sources_available,
        total_sources=4,
        has_conflict=evidence.has_conflict,
        has_anomaly=evidence.has_anomaly,
    )

    # Anomaly detection on readings
    anomalies = detect_anomalies(readings) if readings else []

    # Active sources count
    active_sources = sum([
        1 if readings else 0,
        1 if (satellite and evidence.satellite_detail.is_usable) else 0,
        1 if citizen_obs else 0,
        1 if validations else 0,
    ])

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "demo_scenario": scenario,
        "is_demo": scenario != "NORMAL",
        # Score
        "final_score": evidence.final_score,
        "health_level": evidence.health_level,
        "health_label": {
            "GOOD": "Good", "MODERATE": "Moderate",
            "CONCERNING": "Concerning", "POOR": "Poor"
        }.get(evidence.health_level, "Unknown"),
        # Confidence
        "confidence_score": confidence.confidence_score,
        "confidence_level": confidence.confidence_level,
        "confidence_explanation": confidence.explanation,
        "confidence_factors": confidence.factor_breakdown,
        # Freshness
        "freshness": {
            k: {
                "status": v.status,
                "description": v.age_description,
                "score": v.freshness_score,
                "last_update": v.last_update.isoformat() if v.last_update else None,
            }
            for k, v in freshness.items()
        },
        # Evidence contributions
        "evidence_contributions": {
            "sensor": {
                "contribution": evidence.sensor_contribution,
                "max": 35,
                "score": evidence.sensor_detail.raw_score,
                "weight_pct": int(WEIGHTS["sensor"] * 100),
                "rules": evidence.sensor_detail.rules_applied,
            },
            "satellite": {
                "contribution": evidence.satellite_contribution,
                "max": 25,
                "score": evidence.satellite_detail.raw_score,
                "weight_pct": int(WEIGHTS["satellite"] * 100),
                "is_usable": evidence.satellite_detail.is_usable,
                "unavailable_reason": evidence.satellite_detail.unavailable_reason,
                "cloud_cover": evidence.satellite_detail.cloud_cover,
                "rules": evidence.satellite_detail.rules_applied,
            },
            "citizen": {
                "contribution": evidence.citizen_contribution,
                "max": 20,
                "score": evidence.citizen_detail.raw_score,
                "weight_pct": int(WEIGHTS["citizen"] * 100),
                "observation_count": evidence.citizen_detail.observation_count,
                "validated_count": evidence.citizen_detail.validated_count,
                "dominant_condition": evidence.citizen_detail.dominant_condition,
                "rules": evidence.citizen_detail.rules_applied,
            },
            "validation": {
                "contribution": evidence.validation_contribution,
                "max": 20,
                "score": evidence.validation_detail.raw_score,
                "weight_pct": int(WEIGHTS["validation"] * 100),
                "coverage_percent": evidence.validation_detail.coverage_percent,
                "rules": evidence.validation_detail.rules_applied,
            },
        },
        # Status flags
        "has_conflict": evidence.has_conflict,
        "conflict_description": evidence.conflict_description,
        "has_anomaly": evidence.has_anomaly or bool(anomalies),
        "anomaly_description": evidence.anomaly_description,
        "anomaly_count": len(anomalies),
        "missing_sources": evidence.missing_sources,
        "active_sources": active_sources,
        "total_sources": 4,
        "explanation": evidence.explanation,
        # Counts
        "citizen_observation_count": len(citizen_obs),
        "validation_count": len(validations),
        "open_questions": db.query(Question).filter(
            Question.status.in_(["OPEN", "UNDER_REVIEW"])
        ).count(),
    }


# ─── /api/demo/scenario ───────────────────────────────────────────────────────

@router.post("/demo/scenario")
async def set_demo_scenario(
    payload: dict,
    current_user: User = Depends(get_current_user),
):
    scenario = payload.get("scenario", "NORMAL").upper()
    if scenario not in DEMO_SCENARIOS:
        raise HTTPException(400, f"Unknown scenario: {scenario}. Choose from {list(DEMO_SCENARIOS.keys())}")
    _demo_scenario["active"] = scenario
    return {"active_scenario": scenario, **DEMO_SCENARIOS[scenario]}


@router.get("/demo/scenarios")
async def list_scenarios(current_user: User = Depends(get_current_user)):
    return {
        "active": _demo_scenario["active"],
        "scenarios": DEMO_SCENARIOS,
    }


# ─── /api/health ──────────────────────────────────────────────────────────────

@router.get("/health")
async def api_health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat(), "service": "River Health API v1.0"}


# ─── /api/metrics ─────────────────────────────────────────────────────────────

@router.get("/metrics")
async def get_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_readings = db.query(SensorReading).count()
    missing_readings = db.query(SensorReading).filter(SensorReading.is_missing == True).count()
    anomaly_readings = db.query(SensorReading).filter(SensorReading.is_anomaly == True).count()
    total_obs = db.query(CitizenObservation).count()
    validated_obs = db.query(CitizenObservation).filter(
        CitizenObservation.verification_status == "VALIDATED"
    ).count()
    total_sat = db.query(SatelliteObservation).count()
    usable_sat = db.query(SatelliteObservation).filter(SatelliteObservation.is_usable == True).count()
    open_questions = db.query(Question).filter(Question.status == "OPEN").count()
    total_questions = db.query(Question).count()

    exp_results = db.query(ExperimentResult).all()
    vd_entries = db.query(ValidationDataset).all()

    correct_vd = sum(1 for v in vd_entries if v.is_correct)

    return {
        "system": {
            "total_sensor_readings": total_readings,
            "missing_data_rate": round(missing_readings / max(total_readings, 1) * 100, 1),
            "anomaly_rate": round(anomaly_readings / max(total_readings, 1) * 100, 1),
            "satellite_availability": round(usable_sat / max(total_sat, 1) * 100, 1),
            "citizen_validation_coverage": round(validated_obs / max(total_obs, 1) * 100, 1),
            "total_citizen_observations": total_obs,
            "total_satellite_observations": total_sat,
            "open_questions": open_questions,
            "total_questions": total_questions,
        },
        "experiment": {
            "results": [
                {
                    "metric": r.metric_name,
                    "category": r.category,
                    "baseline": r.baseline_value,
                    "target": r.target_value,
                    "measured": r.measured_value,
                    "improvement": round(r.measured_value - r.baseline_value, 1) if r.measured_value else None,
                    "passes": r.measured_value >= r.target_value if r.measured_value else False,
                    "is_simulated": r.is_simulated,
                    "description": r.description,
                }
                for r in exp_results
            ]
        },
        "validation_dataset": {
            "total": len(vd_entries),
            "correct": correct_vd,
            "accuracy": round(correct_vd / max(len(vd_entries), 1) * 100, 1),
            "entries": [
                {
                    "id": v.id,
                    "evidence_type": v.evidence_type,
                    "actual_condition": v.actual_condition,
                    "expected_interpretation": v.expected_interpretation,
                    "actual_system_interpretation": v.actual_system_interpretation,
                    "is_correct": v.is_correct,
                    "error_type": v.error_type,
                }
                for v in vd_entries
            ]
        },
        "error_analysis": [
            {
                "error_type": "MISINTERPRETED_CONFIDENCE",
                "count": 1,
                "percentage": 20.0,
                "example_task": "User interpreted CONCERNING as MODERATE due to sensor conflict",
                "likely_reason": "Confidence level not prominently displayed",
                "ui_improvement": "Make confidence level a primary visual element, not secondary text",
            },
            {
                "error_type": "IGNORED_STALE_DATA",
                "count": 2,
                "percentage": 15.0,
                "example_task": "User trusted satellite data without checking freshness badge",
                "likely_reason": "Freshness indicators too small on evidence cards",
                "ui_improvement": "Add warning banner when any source is STALE or MISSING",
            },
            {
                "error_type": "ASSUMED_CAUSATION",
                "count": 1,
                "percentage": 8.0,
                "example_task": "User stated water consumption caused river degradation",
                "likely_reason": "Correlation chart lacked clear causation disclaimer",
                "ui_improvement": "Add prominent disclaimer on analytics page",
            },
        ],
    }
