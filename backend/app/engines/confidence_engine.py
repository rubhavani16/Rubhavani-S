"""
Confidence / Uncertainty Engine
================================
Calculates confidence in the overall river health assessment.

Confidence = 0.30 × source_reliability
           + 0.20 × freshness_score
           + 0.25 × cross_source_agreement
           + 0.15 × validation_coverage
           + 0.10 × data_completeness
"""
from datetime import datetime, timedelta
from typing import Optional
from dataclasses import dataclass, field

CONFIDENCE_WEIGHTS = {
    "source_reliability": 0.30,
    "freshness": 0.20,
    "cross_source_agreement": 0.25,
    "validation_coverage": 0.15,
    "completeness": 0.10,
}

# Freshness windows
FRESHNESS_WINDOWS = {
    "sensor_fresh_hours": 2,
    "sensor_aging_hours": 6,
    "sensor_stale_hours": 24,
    "satellite_fresh_days": 3,
    "satellite_aging_days": 7,
    "satellite_stale_days": 30,
    "citizen_fresh_days": 7,
    "citizen_aging_days": 14,
    "citizen_stale_days": 30,
    "validation_fresh_days": 7,
    "validation_aging_days": 14,
    "validation_stale_days": 30,
}

@dataclass
class FreshnessResult:
    status: str  # FRESH / AGING / STALE / MISSING
    age_description: str
    freshness_score: float  # 0-100
    last_update: Optional[datetime] = None
    expected_frequency: str = ""

@dataclass
class ConfidenceResult:
    confidence_score: float
    confidence_level: str   # HIGH / MEDIUM / LOW
    source_reliability_score: float
    freshness_score: float
    agreement_score: float
    validation_score: float
    completeness_score: float
    explanation: str
    factor_breakdown: dict = field(default_factory=dict)


def compute_freshness(
    last_timestamp: Optional[datetime],
    fresh_hours: float = None,
    fresh_days: float = None,
    aging_hours: float = None,
    aging_days: float = None,
    stale_hours: float = None,
    stale_days: float = None,
    label: str = "data",
) -> FreshnessResult:
    """Compute freshness status from last known timestamp."""
    if not last_timestamp:
        return FreshnessResult(
            status="MISSING",
            age_description=f"No {label} available",
            freshness_score=0.0,
        )

    now = datetime.utcnow()
    age = now - last_timestamp
    age_hours = age.total_seconds() / 3600
    age_days = age_hours / 24

    if fresh_hours is not None:
        if age_hours <= fresh_hours:
            status = "FRESH"
            score = 100.0
            desc = f"Updated {_format_age(age)} ago"
        elif age_hours <= (aging_hours or fresh_hours * 3):
            status = "AGING"
            score = 65.0
            desc = f"Updated {_format_age(age)} ago — aging"
        elif age_hours <= (stale_hours or fresh_hours * 12):
            status = "STALE"
            score = 25.0
            desc = f"Last update {_format_age(age)} ago — stale"
        else:
            status = "MISSING"
            score = 0.0
            desc = f"No update in {_format_age(age)} — likely offline"
    else:
        if age_days <= fresh_days:
            status = "FRESH"
            score = 100.0
            desc = f"Updated {_format_age(age)} ago"
        elif age_days <= (aging_days or fresh_days * 2):
            status = "AGING"
            score = 65.0
            desc = f"Updated {_format_age(age)} ago — aging"
        elif age_days <= (stale_days or fresh_days * 4):
            status = "STALE"
            score = 25.0
            desc = f"Last update {_format_age(age)} ago — stale"
        else:
            status = "MISSING"
            score = 0.0
            desc = f"No update in {_format_age(age)}"

    return FreshnessResult(
        status=status,
        age_description=desc,
        freshness_score=score,
        last_update=last_timestamp,
    )


def _format_age(age: timedelta) -> str:
    total_seconds = int(age.total_seconds())
    if total_seconds < 3600:
        minutes = total_seconds // 60
        return f"{minutes} minute{'s' if minutes != 1 else ''}"
    elif total_seconds < 86400:
        hours = total_seconds // 3600
        return f"{hours} hour{'s' if hours != 1 else ''}"
    else:
        days = total_seconds // 86400
        return f"{days} day{'s' if days != 1 else ''}"


def compute_freshness_all(
    last_sensor_reading: Optional[datetime],
    last_satellite_obs: Optional[datetime],
    last_citizen_obs: Optional[datetime],
    last_validation: Optional[datetime],
) -> dict:
    """Compute freshness for all sources."""
    return {
        "sensor": compute_freshness(
            last_sensor_reading,
            fresh_hours=FRESHNESS_WINDOWS["sensor_fresh_hours"],
            aging_hours=FRESHNESS_WINDOWS["sensor_aging_hours"],
            stale_hours=FRESHNESS_WINDOWS["sensor_stale_hours"],
            label="sensor data",
        ),
        "satellite": compute_freshness(
            last_satellite_obs,
            fresh_days=FRESHNESS_WINDOWS["satellite_fresh_days"],
            aging_days=FRESHNESS_WINDOWS["satellite_aging_days"],
            stale_days=FRESHNESS_WINDOWS["satellite_stale_days"],
            label="satellite data",
        ),
        "citizen": compute_freshness(
            last_citizen_obs,
            fresh_days=FRESHNESS_WINDOWS["citizen_fresh_days"],
            aging_days=FRESHNESS_WINDOWS["citizen_aging_days"],
            stale_days=FRESHNESS_WINDOWS["citizen_stale_days"],
            label="citizen observations",
        ),
        "validation": compute_freshness(
            last_validation,
            fresh_days=FRESHNESS_WINDOWS["validation_fresh_days"],
            aging_days=FRESHNESS_WINDOWS["validation_aging_days"],
            stale_days=FRESHNESS_WINDOWS["validation_stale_days"],
            label="validation records",
        ),
    }


def calculate_freshness(
    last_timestamp: Optional[datetime],
    source_type: str,
    expected_interval_hours: float = 1.0,
) -> FreshnessResult:
    """Convenience helper to compute freshness for a specific source."""
    if source_type == "sensor":
        return compute_freshness(
            last_timestamp,
            fresh_hours=FRESHNESS_WINDOWS["sensor_fresh_hours"],
            aging_hours=FRESHNESS_WINDOWS["sensor_aging_hours"],
            stale_hours=FRESHNESS_WINDOWS["sensor_stale_hours"],
            label="sensor data",
        )
    elif source_type == "satellite":
        return compute_freshness(
            last_timestamp,
            fresh_days=FRESHNESS_WINDOWS["satellite_fresh_days"],
            aging_days=FRESHNESS_WINDOWS["satellite_aging_days"],
            stale_days=FRESHNESS_WINDOWS["satellite_stale_days"],
            label="satellite observation",
        )
    elif source_type == "citizen":
        return compute_freshness(
            last_timestamp,
            fresh_days=FRESHNESS_WINDOWS["citizen_fresh_days"],
            aging_days=FRESHNESS_WINDOWS["citizen_aging_days"],
            stale_days=FRESHNESS_WINDOWS["citizen_stale_days"],
            label="citizen report",
        )
    elif source_type == "validation":
        return compute_freshness(
            last_timestamp,
            fresh_days=FRESHNESS_WINDOWS["validation_fresh_days"],
            aging_days=FRESHNESS_WINDOWS["validation_aging_days"],
            stale_days=FRESHNESS_WINDOWS["validation_stale_days"],
            label="validation record",
        )
    return compute_freshness(last_timestamp, fresh_hours=expected_interval_hours * 2, label=source_type)


def compute_confidence(
    freshness: dict,
    source_scores: dict,  # {sensor: float, satellite: float, citizen: float}
    validation_coverage: float,   # 0-100
    sources_available: int,
    total_sources: int = 4,
    has_conflict: bool = False,
    has_anomaly: bool = False,
) -> ConfidenceResult:
    """
    Compute overall confidence score and level.
    """
    reasons = []

    # 1. Source reliability (based on sensor/satellite availability and known quality)
    base_reliability = {
        "sensor": 85.0,      # Sensor networks are reliable when working
        "satellite": 80.0,   # Simulated satellite data
        "citizen": 65.0,     # Citizen reports have subjective variability
        "validation": 90.0,  # Expert validation is high reliability
    }
    active_reliabilities = []
    for src, score in source_scores.items():
        if score > 0:
            active_reliabilities.append(base_reliability.get(src, 70.0))
    source_reliability = sum(active_reliabilities) / len(active_reliabilities) if active_reliabilities else 0.0
    reasons.append(f"Source reliability: {source_reliability:.0f}/100")

    # 2. Freshness score (average of all sources)
    freshness_scores = [f.freshness_score for f in freshness.values()]
    freshness_avg = sum(freshness_scores) / len(freshness_scores)
    stale_count = sum(1 for f in freshness.values() if f.status in ("STALE", "MISSING"))
    if stale_count > 0:
        reasons.append(f"{stale_count} source(s) are stale or missing — freshness reduced")
    else:
        reasons.append(f"All sources fresh — good freshness score")

    # 3. Cross-source agreement (penalize if scores differ widely)
    active_scores = [s for s in source_scores.values() if s > 0]
    if len(active_scores) >= 2:
        max_s = max(active_scores)
        min_s = min(active_scores)
        diff = max_s - min_s
        agreement = max(0.0, 100.0 - diff)
        if has_conflict:
            agreement *= 0.7
            reasons.append(f"Conflicting evidence detected — agreement score reduced")
        else:
            reasons.append(f"Sources broadly agree — good cross-source agreement")
    elif len(active_scores) == 1:
        agreement = 50.0  # Single source, limited cross-validation
        reasons.append("Only one source available — limited cross-source validation")
    else:
        agreement = 0.0
        reasons.append("No active sources — no agreement possible")

    # 4. Validation coverage
    val_score = min(validation_coverage, 100.0)
    if validation_coverage < 20:
        reasons.append(f"Low validation coverage ({validation_coverage:.0f}%) — confidence limited")
    else:
        reasons.append(f"Validation coverage: {validation_coverage:.0f}%")

    # 5. Data completeness
    completeness = (sources_available / total_sources) * 100
    if completeness < 100:
        missing = total_sources - sources_available
        reasons.append(f"{missing} of {total_sources} sources unavailable — completeness reduced")

    # Anomaly penalty
    anomaly_factor = 0.85 if has_anomaly else 1.0
    if has_anomaly:
        reasons.append("Sensor anomaly detected — confidence reduced pending validation")

    # Weighted sum
    confidence_raw = (
        source_reliability * CONFIDENCE_WEIGHTS["source_reliability"]
        + freshness_avg * CONFIDENCE_WEIGHTS["freshness"]
        + agreement * CONFIDENCE_WEIGHTS["cross_source_agreement"]
        + val_score * CONFIDENCE_WEIGHTS["validation_coverage"]
        + completeness * CONFIDENCE_WEIGHTS["completeness"]
    ) * anomaly_factor

    confidence_score = min(max(round(confidence_raw, 1), 0.0), 100.0)

    if confidence_score >= 75:
        level = "HIGH"
    elif confidence_score >= 50:
        level = "MEDIUM"
    else:
        level = "LOW"

    # Generate natural explanation
    explanation = _generate_confidence_explanation(
        level, reasons, stale_count, has_conflict, has_anomaly, sources_available, total_sources
    )

    return ConfidenceResult(
        confidence_score=confidence_score,
        confidence_level=level,
        source_reliability_score=round(source_reliability, 1),
        freshness_score=round(freshness_avg, 1),
        agreement_score=round(agreement, 1),
        validation_score=round(val_score, 1),
        completeness_score=round(completeness, 1),
        explanation=explanation,
        factor_breakdown={
            "source_reliability": round(source_reliability, 1),
            "freshness": round(freshness_avg, 1),
            "cross_source_agreement": round(agreement, 1),
            "validation_coverage": round(val_score, 1),
            "data_completeness": round(completeness, 1),
        },
    )


def _generate_confidence_explanation(
    level: str, reasons: list, stale_count: int, has_conflict: bool,
    has_anomaly: bool, sources_available: int, total_sources: int
) -> str:
    parts = []
    if level == "HIGH":
        parts.append("Confidence is HIGH — multiple fresh, consistent sources agree on the river condition.")
    elif level == "MEDIUM":
        parts.append("Confidence is MEDIUM — some uncertainty exists in the current assessment.")
    else:
        parts.append("Confidence is LOW — significant data gaps or disagreements limit the reliability of this assessment.")

    if stale_count > 0:
        parts.append(f"{stale_count} source(s) have not been updated recently.")
    if has_conflict:
        parts.append("Different data sources disagree — this requires field validation.")
    if has_anomaly:
        parts.append("A sensor anomaly has been detected and requires expert review.")
    if sources_available < total_sources:
        parts.append(f"Only {sources_available} of {total_sources} evidence sources are active.")

    return " ".join(parts)
