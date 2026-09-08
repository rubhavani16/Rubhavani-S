"""
Evidence Scoring Engine — Community River Health Evidence Portal
================================================================
Transparent, weighted evidence aggregation with full explainability.

Score = 0.35 × Sensor + 0.25 × Satellite + 0.20 × Citizen + 0.20 × Validation
"""
from datetime import datetime, timedelta
from typing import Optional
from dataclasses import dataclass, field

# ─── Configuration (admin-configurable) ───────────────────────────────────────
WEIGHTS = {
    "sensor": 0.35,
    "satellite": 0.25,
    "citizen": 0.20,
    "validation": 0.20,
}

# Rule thresholds
THRESHOLDS = {
    "ph_min": 6.5,
    "ph_max": 8.5,
    "ph_critical_min": 5.5,
    "ph_critical_max": 9.5,
    "turbidity_moderate": 10.0,   # NTU
    "turbidity_concerning": 25.0,
    "dissolved_oxygen_min": 6.0,  # mg/L
    "dissolved_oxygen_critical": 4.0,
    "conductivity_max": 800.0,    # µS/cm
    "conductivity_concerning": 600.0,
    "temperature_max": 30.0,      # °C
    "cloud_cover_max": 80.0,      # %
    "sensor_stale_hours": 3.0,
    "satellite_stale_days": 7.0,
    "citizen_stale_days": 14.0,
    "validation_stale_days": 30.0,
    "conflict_threshold": 30.0,   # score difference that indicates conflict
    "ndwi_healthy": 0.1,
    "ndvi_healthy": 0.3,
}

# ─── Result dataclasses ────────────────────────────────────────────────────────
@dataclass
class SensorScore:
    raw_score: float          # 0–100
    ph_status: str = "NORMAL"
    turbidity_status: str = "NORMAL"
    do_status: str = "NORMAL"
    conductivity_status: str = "NORMAL"
    temperature_status: str = "NORMAL"
    anomaly_detected: bool = False
    anomaly_description: str = ""
    rules_applied: list = field(default_factory=list)

@dataclass
class SatelliteScore:
    raw_score: float
    ndvi_status: str = "NORMAL"
    ndwi_status: str = "NORMAL"
    turbidity_status: str = "NORMAL"
    cloud_cover: float = 0.0
    is_usable: bool = True
    unavailable_reason: str = ""
    rules_applied: list = field(default_factory=list)

@dataclass
class CitizenScore:
    raw_score: float
    observation_count: int = 0
    validated_count: int = 0
    dominant_condition: str = "UNKNOWN"
    rules_applied: list = field(default_factory=list)

@dataclass
class ValidationScore:
    raw_score: float
    coverage_percent: float = 0.0
    validated_count: int = 0
    pending_count: int = 0
    rejected_count: int = 0
    rules_applied: list = field(default_factory=list)

@dataclass
class EvidenceResult:
    # Component scores (contribution out of max weight × 100)
    sensor_contribution: float     # out of 35
    satellite_contribution: float  # out of 25
    citizen_contribution: float    # out of 20
    validation_contribution: float # out of 20
    final_score: float             # 0–100
    health_level: str              # GOOD / MODERATE / CONCERNING / POOR
    # Detail
    sensor_detail: SensorScore = None
    satellite_detail: SatelliteScore = None
    citizen_detail: CitizenScore = None
    validation_detail: ValidationScore = None
    # Flags
    has_conflict: bool = False
    conflict_description: str = ""
    has_anomaly: bool = False
    anomaly_description: str = ""
    missing_sources: list = field(default_factory=list)
    explanation: str = ""

# ─── Rule Engine ──────────────────────────────────────────────────────────────

def apply_sensor_rules(readings: list) -> SensorScore:
    """
    Apply transparent threshold rules to a list of recent sensor readings.
    Returns SensorScore with per-parameter status and overall score.
    """
    if not readings:
        return SensorScore(raw_score=0.0, rules_applied=["NO_DATA: No sensor readings available"])

    # Average over recent readings (ignore anomalies for scoring, but flag them)
    valid = [r for r in readings if not r.get("is_anomaly", False) and not r.get("is_missing", False)]
    if not valid:
        return SensorScore(raw_score=0.0, rules_applied=["NO_VALID_DATA: All recent readings are anomalous or missing"])

    avg_ph = sum(r.get("ph", 7.0) for r in valid) / len(valid)
    avg_turbidity = sum(r.get("turbidity", 5.0) for r in valid) / len(valid)
    avg_do = sum(r.get("dissolved_oxygen", 8.0) for r in valid) / len(valid)
    avg_conductivity = sum(r.get("conductivity", 300.0) for r in valid) / len(valid)
    avg_temp = sum(r.get("temperature", 22.0) for r in valid) / len(valid)

    rules_applied = []
    scores = []

    # --- pH rule (25% of sensor score) ---
    if avg_ph < THRESHOLDS["ph_critical_min"] or avg_ph > THRESHOLDS["ph_critical_max"]:
        ph_status = "CRITICAL"
        ph_score = 10.0
        rules_applied.append(f"pH_CRITICAL: pH={avg_ph:.1f} outside critical range [5.5, 9.5]")
    elif avg_ph < THRESHOLDS["ph_min"] or avg_ph > THRESHOLDS["ph_max"]:
        ph_status = "CONCERNING"
        ph_score = 50.0
        rules_applied.append(f"pH_CONCERNING: pH={avg_ph:.1f} outside normal range [6.5, 8.5]")
    else:
        ph_status = "NORMAL"
        ph_score = 100.0
        rules_applied.append(f"pH_NORMAL: pH={avg_ph:.1f} within normal range [6.5, 8.5]")
    scores.append(("ph", ph_score, 0.25))

    # --- Turbidity rule (25% of sensor score) ---
    if avg_turbidity > THRESHOLDS["turbidity_concerning"]:
        turb_status = "CONCERNING"
        turb_score = 20.0
        rules_applied.append(f"TURBIDITY_CONCERNING: turbidity={avg_turbidity:.1f} NTU > {THRESHOLDS['turbidity_concerning']} NTU")
    elif avg_turbidity > THRESHOLDS["turbidity_moderate"]:
        turb_status = "MODERATE"
        turb_score = 60.0
        rules_applied.append(f"TURBIDITY_MODERATE: turbidity={avg_turbidity:.1f} NTU > {THRESHOLDS['turbidity_moderate']} NTU")
    else:
        turb_status = "NORMAL"
        turb_score = 100.0
        rules_applied.append(f"TURBIDITY_NORMAL: turbidity={avg_turbidity:.1f} NTU within safe range")
    scores.append(("turbidity", turb_score, 0.25))

    # --- Dissolved Oxygen rule (25% of sensor score) ---
    if avg_do < THRESHOLDS["dissolved_oxygen_critical"]:
        do_status = "CRITICAL"
        do_score = 10.0
        rules_applied.append(f"DO_CRITICAL: dissolved_oxygen={avg_do:.1f} mg/L < {THRESHOLDS['dissolved_oxygen_critical']} mg/L")
    elif avg_do < THRESHOLDS["dissolved_oxygen_min"]:
        do_status = "CONCERNING"
        do_score = 50.0
        rules_applied.append(f"DO_CONCERNING: dissolved_oxygen={avg_do:.1f} mg/L < {THRESHOLDS['dissolved_oxygen_min']} mg/L")
    else:
        do_status = "NORMAL"
        do_score = 100.0
        rules_applied.append(f"DO_NORMAL: dissolved_oxygen={avg_do:.1f} mg/L within safe range")
    scores.append(("do", do_score, 0.25))

    # --- Conductivity rule (15% of sensor score) ---
    if avg_conductivity > THRESHOLDS["conductivity_max"]:
        cond_status = "CONCERNING"
        cond_score = 30.0
        rules_applied.append(f"CONDUCTIVITY_CONCERNING: conductivity={avg_conductivity:.0f} µS/cm > {THRESHOLDS['conductivity_max']}")
    elif avg_conductivity > THRESHOLDS["conductivity_concerning"]:
        cond_status = "MODERATE"
        cond_score = 65.0
        rules_applied.append(f"CONDUCTIVITY_MODERATE: conductivity={avg_conductivity:.0f} µS/cm elevated")
    else:
        cond_status = "NORMAL"
        cond_score = 100.0
        rules_applied.append(f"CONDUCTIVITY_NORMAL: conductivity={avg_conductivity:.0f} µS/cm within range")
    scores.append(("conductivity", cond_score, 0.10))

    # --- Temperature rule (10% of sensor score) ---
    if avg_temp > THRESHOLDS["temperature_max"]:
        temp_status = "CONCERNING"
        temp_score = 50.0
        rules_applied.append(f"TEMPERATURE_ELEVATED: temp={avg_temp:.1f}°C > {THRESHOLDS['temperature_max']}°C")
    else:
        temp_status = "NORMAL"
        temp_score = 100.0
        rules_applied.append(f"TEMPERATURE_NORMAL: temp={avg_temp:.1f}°C within range")
    scores.append(("temperature", temp_score, 0.15))

    # Weighted composite
    total_weight = sum(w for _, _, w in scores)
    composite = sum(s * w for _, s, w in scores) / total_weight

    # Check anomalies
    anomaly_count = sum(1 for r in readings if r.get("is_anomaly", False))
    anomaly_desc = f"{anomaly_count} anomalous readings detected" if anomaly_count > 0 else ""

    return SensorScore(
        raw_score=round(composite, 1),
        ph_status=ph_status,
        turbidity_status=turb_status,
        do_status=do_status,
        conductivity_status=cond_status,
        temperature_status=temp_status,
        anomaly_detected=anomaly_count > 0,
        anomaly_description=anomaly_desc,
        rules_applied=rules_applied,
    )


def apply_satellite_rules(observation: Optional[dict]) -> SatelliteScore:
    """Apply rules to the most recent usable satellite observation."""
    if not observation:
        return SatelliteScore(
            raw_score=0.0,
            is_usable=False,
            unavailable_reason="No satellite observations available",
            rules_applied=["NO_DATA: No satellite observations available"],
        )

    cloud_cover = observation.get("cloud_cover", 0.0)
    rules_applied = []

    # --- Cloud cover rule ---
    if cloud_cover > THRESHOLDS["cloud_cover_max"]:
        rules_applied.append(
            f"SATELLITE_UNAVAILABLE: Cloud cover={cloud_cover:.0f}% > {THRESHOLDS['cloud_cover_max']}% threshold"
        )
        return SatelliteScore(
            raw_score=0.0,
            is_usable=False,
            cloud_cover=cloud_cover,
            unavailable_reason=f"Cloud coverage too high ({cloud_cover:.0f}%) — satellite indicator unavailable",
            rules_applied=rules_applied,
        )

    ndvi = observation.get("ndvi", 0.0)
    ndwi = observation.get("ndwi", 0.0)
    turbidity = observation.get("turbidity_proxy", 5.0)
    scores = []

    # NDWI (water body health indicator)
    if ndwi < -0.1:
        ndwi_status = "CONCERNING"
        ndwi_score = 30.0
        rules_applied.append(f"NDWI_LOW: NDWI={ndwi:.2f} — reduced water body extent or turbidity")
    elif ndwi < THRESHOLDS["ndwi_healthy"]:
        ndwi_status = "MODERATE"
        ndwi_score = 65.0
        rules_applied.append(f"NDWI_MODERATE: NDWI={ndwi:.2f}")
    else:
        ndwi_status = "NORMAL"
        ndwi_score = 100.0
        rules_applied.append(f"NDWI_NORMAL: NDWI={ndwi:.2f} — healthy water surface indicator")
    scores.append(ndwi_score * 0.40)

    # NDVI (riparian vegetation)
    if ndvi < 0.1:
        ndvi_status = "CONCERNING"
        ndvi_score = 25.0
        rules_applied.append(f"NDVI_LOW: NDVI={ndvi:.2f} — sparse riparian vegetation")
    elif ndvi < THRESHOLDS["ndvi_healthy"]:
        ndvi_status = "MODERATE"
        ndvi_score = 60.0
        rules_applied.append(f"NDVI_MODERATE: NDVI={ndvi:.2f}")
    else:
        ndvi_status = "NORMAL"
        ndvi_score = 100.0
        rules_applied.append(f"NDVI_HEALTHY: NDVI={ndvi:.2f} — healthy riparian vegetation")
    scores.append(ndvi_score * 0.35)

    # Turbidity proxy
    if turbidity > 20:
        turb_status = "CONCERNING"
        turb_score = 25.0
        rules_applied.append(f"SAT_TURBIDITY_HIGH: proxy={turbidity:.1f} — elevated turbidity detected")
    elif turbidity > 10:
        turb_status = "MODERATE"
        turb_score = 65.0
    else:
        turb_status = "NORMAL"
        turb_score = 100.0
    scores.append(turb_score * 0.25)

    composite = sum(scores)
    return SatelliteScore(
        raw_score=round(composite, 1),
        ndvi_status=ndvi_status,
        ndwi_status=ndwi_status,
        turbidity_status=turb_status,
        cloud_cover=cloud_cover,
        is_usable=True,
        rules_applied=rules_applied,
    )


def apply_citizen_rules(observations: list) -> CitizenScore:
    """Score citizen observations based on count and reported conditions."""
    rules_applied = []

    if not observations:
        rules_applied.append("NO_CITIZEN_DATA: No recent citizen observations — absence NOT interpreted as good quality")
        return CitizenScore(
            raw_score=0.0,
            observation_count=0,
            dominant_condition="UNKNOWN",
            rules_applied=rules_applied,
        )

    count = len(observations)
    rules_applied.append(f"CITIZEN_COUNT: {count} recent observations")

    # Map conditions to scores
    condition_map = {"GOOD": 100, "MODERATE": 60, "POOR": 20}
    condition_scores = []
    for obs in observations:
        cond = obs.get("overall_condition", "MODERATE")
        condition_scores.append(condition_map.get(cond, 60))

    avg_condition = sum(condition_scores) / len(condition_scores)

    # Confidence weighting
    avg_confidence = sum(obs.get("confidence", 0.7) for obs in observations) / len(observations)

    # Penalty for very few observations
    if count < 3:
        coverage_factor = 0.6
        rules_applied.append(f"LOW_COVERAGE: Only {count} observations — reduced weighting applied")
    elif count < 10:
        coverage_factor = 0.8
    else:
        coverage_factor = 1.0

    composite = avg_condition * coverage_factor * avg_confidence

    # Dominant condition
    conditions = [obs.get("overall_condition", "MODERATE") for obs in observations]
    dominant = max(set(conditions), key=conditions.count)

    validated = sum(1 for obs in observations if obs.get("verification_status") == "VALIDATED")
    rules_applied.append(f"VALIDATED_OBSERVATIONS: {validated}/{count} observations validated")

    return CitizenScore(
        raw_score=round(min(composite, 100.0), 1),
        observation_count=count,
        validated_count=validated,
        dominant_condition=dominant,
        rules_applied=rules_applied,
    )


def apply_validation_rules(validations: list, total_observations: int) -> ValidationScore:
    """Score the validation coverage of citizen observations."""
    rules_applied = []

    if total_observations == 0:
        return ValidationScore(
            raw_score=0.0,
            coverage_percent=0.0,
            rules_applied=["NO_OBSERVATIONS: No citizen observations to validate"],
        )

    if not validations:
        rules_applied.append("NO_VALIDATIONS: No validation records — confidence reduced")
        return ValidationScore(
            raw_score=20.0,  # Non-zero but low
            coverage_percent=0.0,
            rules_applied=rules_applied,
        )

    validated = sum(1 for v in validations if v.get("validation_status") == "VALIDATED")
    partial = sum(1 for v in validations if v.get("validation_status") == "PARTIALLY_VALIDATED")
    rejected = sum(1 for v in validations if v.get("validation_status") == "REJECTED")
    pending = sum(1 for v in validations if v.get("validation_status") == "PENDING")

    coverage = len(validations) / max(total_observations, 1) * 100
    quality_score = (validated * 100 + partial * 60 - rejected * 20) / max(len(validations), 1)

    composite = min((coverage / 100 * 0.5 + quality_score / 100 * 0.5) * 100, 100.0)

    rules_applied.append(
        f"VALIDATION_COVERAGE: {coverage:.0f}% of observations have validation records"
    )
    rules_applied.append(
        f"VALIDATION_QUALITY: {validated} validated, {partial} partial, {rejected} rejected, {pending} pending"
    )

    return ValidationScore(
        raw_score=round(composite, 1),
        coverage_percent=round(coverage, 1),
        validated_count=validated,
        pending_count=pending,
        rejected_count=rejected,
        rules_applied=rules_applied,
    )


# ─── Final Aggregator ─────────────────────────────────────────────────────────

def classify_health(score: float) -> str:
    if score >= 80:
        return "GOOD"
    elif score >= 60:
        return "MODERATE"
    elif score >= 40:
        return "CONCERNING"
    else:
        return "POOR"


def compute_evidence_score(
    sensor_readings: list,
    satellite_observation: Optional[dict],
    citizen_observations: list,
    validation_records: list,
    sensor_available: bool = True,
    satellite_available: bool = True,
) -> EvidenceResult:
    """
    Master evidence scoring function.
    Combines all four evidence sources into a transparent final score.
    """
    missing_sources = []

    # Score each component
    sensor_detail = apply_sensor_rules(sensor_readings) if sensor_available else SensorScore(
        raw_score=0.0, rules_applied=["SENSOR_UNAVAILABLE: Sensor data not available"]
    )
    if not sensor_available or not sensor_readings:
        missing_sources.append("SENSOR")

    satellite_detail = apply_satellite_rules(satellite_observation) if satellite_available else SatelliteScore(
        raw_score=0.0, is_usable=False, unavailable_reason="Satellite source unavailable"
    )
    if not satellite_available or not satellite_observation:
        missing_sources.append("SATELLITE")

    citizen_detail = apply_citizen_rules(citizen_observations)
    if not citizen_observations:
        missing_sources.append("CITIZEN")

    validation_detail = apply_validation_rules(validation_records, len(citizen_observations))

    # Weighted contributions (contribution out of max weight*100)
    s_contrib = sensor_detail.raw_score * WEIGHTS["sensor"]      # out of 35
    sat_contrib = satellite_detail.raw_score * WEIGHTS["satellite"]  # out of 25
    c_contrib = citizen_detail.raw_score * WEIGHTS["citizen"]    # out of 20
    v_contrib = validation_detail.raw_score * WEIGHTS["validation"]  # out of 20

    # Missing source penalty: redistribute weight but reduce total capacity
    total_available_weight = (
        WEIGHTS["sensor"] if sensor_readings and sensor_available else 0
    ) + (
        WEIGHTS["satellite"] if satellite_observation and satellite_available and satellite_detail.is_usable else 0
    ) + WEIGHTS["citizen"] + WEIGHTS["validation"]

    if total_available_weight < 0.5:
        final_score = 0.0
    elif total_available_weight < 1.0:
        # Normalize by available weight but apply penalty
        raw_sum = s_contrib + sat_contrib + c_contrib + v_contrib
        final_score = (raw_sum / total_available_weight) * 0.85
    else:
        final_score = s_contrib + sat_contrib + c_contrib + v_contrib

    final_score = min(max(round(final_score, 1), 0.0), 100.0)
    health_level = classify_health(final_score)

    # Conflict detection
    scores_available = []
    if sensor_readings and sensor_available:
        scores_available.append(("SENSOR", sensor_detail.raw_score))
    if satellite_observation and satellite_available and satellite_detail.is_usable:
        scores_available.append(("SATELLITE", satellite_detail.raw_score))
    if citizen_observations:
        scores_available.append(("CITIZEN", citizen_detail.raw_score))

    has_conflict = False
    conflict_desc = ""
    if len(scores_available) >= 2:
        max_score = max(s for _, s in scores_available)
        min_score = min(s for _, s in scores_available)
        if max_score - min_score > THRESHOLDS["conflict_threshold"]:
            has_conflict = True
            high = [n for n, s in scores_available if s == max_score][0]
            low = [n for n, s in scores_available if s == min_score][0]
            conflict_desc = (
                f"{high} reports {max_score:.0f}/100 but {low} reports {min_score:.0f}/100 "
                f"— disagreement of {max_score - min_score:.0f} points requires validation"
            )

    # Explanation
    parts = []
    parts.append(f"River health score: {final_score:.0f}/100 ({health_level})")
    parts.append(
        f"Contributions — Sensor: {s_contrib:.0f}/35, "
        f"Satellite: {sat_contrib:.0f}/25, "
        f"Citizen: {c_contrib:.0f}/20, "
        f"Validation: {v_contrib:.0f}/20"
    )
    if missing_sources:
        parts.append(f"Missing sources: {', '.join(missing_sources)} — confidence reduced")
    if has_conflict:
        parts.append(f"Source disagreement detected: {conflict_desc}")

    return EvidenceResult(
        sensor_contribution=round(s_contrib, 1),
        satellite_contribution=round(sat_contrib, 1),
        citizen_contribution=round(c_contrib, 1),
        validation_contribution=round(v_contrib, 1),
        final_score=final_score,
        health_level=health_level,
        sensor_detail=sensor_detail,
        satellite_detail=satellite_detail,
        citizen_detail=citizen_detail,
        validation_detail=validation_detail,
        has_conflict=has_conflict,
        conflict_description=conflict_desc,
        has_anomaly=sensor_detail.anomaly_detected,
        anomaly_description=sensor_detail.anomaly_description,
        missing_sources=missing_sources,
        explanation=" | ".join(parts),
    )
