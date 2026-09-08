"""
Anomaly Detection Engine
========================
Simple statistical anomaly detection for sensor readings.
Methods: rolling mean z-score + threshold rules.
"""
import statistics
from typing import Optional

ANOMALY_THRESHOLDS = {
    "ph_min": 3.0,        # Physically impossible below this
    "ph_max": 12.0,       # Physically impossible above this
    "ph_spike": 2.5,      # Z-score threshold for pH spike
    "turbidity_max": 200, # Physically unrealistic turbidity (NTU)
    "turbidity_spike": 3.0,
    "do_min": 0.0,        # Cannot be negative
    "do_max": 20.0,       # Saturation limit
    "do_spike": 2.5,
    "conductivity_max": 5000,  # Extreme contamination
    "repeated_identical_count": 5,  # Sensor stuck if same value 5+ times
    "z_score_threshold": 3.0,
}


def detect_anomalies(readings: list) -> list:
    """
    Run anomaly detection on a list of sensor reading dicts.
    Returns list of anomaly dicts: {reading_id, anomaly_type, description, severity}
    """
    anomalies = []

    if not readings:
        return anomalies

    # Extract time-series for each parameter
    params = ["ph", "turbidity", "dissolved_oxygen", "conductivity", "temperature"]

    for param in params:
        values = [(r.get("id"), r.get(param)) for r in readings if r.get(param) is not None]
        if not values:
            continue

        ids = [v[0] for v in values]
        vals = [v[1] for v in values]

        # 1. Hard threshold rule (impossible values)
        for i, val in enumerate(vals):
            if param == "ph" and (val < ANOMALY_THRESHOLDS["ph_min"] or val > ANOMALY_THRESHOLDS["ph_max"]):
                anomalies.append({
                    "reading_id": ids[i],
                    "anomaly_type": "IMPOSSIBLE_VALUE",
                    "parameter": param,
                    "value": val,
                    "description": f"{param}={val:.2f} is outside physically possible range",
                    "severity": "HIGH",
                })
            elif param == "dissolved_oxygen" and (val < ANOMALY_THRESHOLDS["do_min"] or val > ANOMALY_THRESHOLDS["do_max"]):
                anomalies.append({
                    "reading_id": ids[i],
                    "anomaly_type": "IMPOSSIBLE_VALUE",
                    "parameter": param,
                    "value": val,
                    "description": f"dissolved_oxygen={val:.2f} mg/L outside possible range [0, 20]",
                    "severity": "HIGH",
                })
            elif param == "conductivity" and val > ANOMALY_THRESHOLDS["conductivity_max"]:
                anomalies.append({
                    "reading_id": ids[i],
                    "anomaly_type": "IMPOSSIBLE_VALUE",
                    "parameter": param,
                    "value": val,
                    "description": f"conductivity={val:.0f} µS/cm extremely high — possible contamination or sensor fault",
                    "severity": "HIGH",
                })

        # 2. Z-score spike detection
        if len(vals) >= 5:
            try:
                mean = statistics.mean(vals)
                std = statistics.stdev(vals)
                if std > 0:
                    for i, val in enumerate(vals):
                        z = abs((val - mean) / std)
                        if z > ANOMALY_THRESHOLDS["z_score_threshold"]:
                            # Don't duplicate with threshold rule
                            already = any(a["reading_id"] == ids[i] for a in anomalies)
                            if not already:
                                anomalies.append({
                                    "reading_id": ids[i],
                                    "anomaly_type": "STATISTICAL_SPIKE",
                                    "parameter": param,
                                    "value": val,
                                    "z_score": round(z, 2),
                                    "description": (
                                        f"{param}={val:.2f} is {z:.1f} standard deviations "
                                        f"from rolling mean ({mean:.2f}) — possible spike or sensor fault. "
                                        "Requires validation."
                                    ),
                                    "severity": "MEDIUM",
                                })
            except statistics.StatisticsError:
                pass

    # 3. Repeated identical values (sensor stuck)
    for param in params:
        values = [r.get(param) for r in readings[-10:] if r.get(param) is not None]
        if len(values) >= ANOMALY_THRESHOLDS["repeated_identical_count"]:
            unique = set(values)
            if len(unique) == 1:
                anomalies.append({
                    "reading_id": readings[-1].get("id"),
                    "anomaly_type": "REPEATED_IDENTICAL",
                    "parameter": param,
                    "value": values[0],
                    "description": (
                        f"{param} has reported identical value ({values[0]:.2f}) "
                        f"for {len(values)} consecutive readings — possible sensor fault"
                    ),
                    "severity": "MEDIUM",
                })

    # Deduplicate
    seen = set()
    unique_anomalies = []
    for a in anomalies:
        key = (a.get("reading_id"), a.get("parameter"), a.get("anomaly_type"))
        if key not in seen:
            seen.add(key)
            unique_anomalies.append(a)

    return unique_anomalies


def check_missing_data(
    last_reading_timestamp,
    expected_frequency_hours: float,
    now=None,
) -> Optional[dict]:
    """Detect if sensor has gone silent beyond expected frequency."""
    from datetime import datetime
    now = now or datetime.utcnow()
    if not last_reading_timestamp:
        return {
            "anomaly_type": "NO_DATA",
            "description": "No readings have ever been received from this sensor",
            "severity": "HIGH",
        }
    age_hours = (now - last_reading_timestamp).total_seconds() / 3600
    if age_hours > expected_frequency_hours * 3:
        return {
            "anomaly_type": "MISSING_DATA",
            "description": (
                f"No reading received for {age_hours:.1f} hours "
                f"(expected every {expected_frequency_hours:.1f} hours). "
                f"Last successful reading: {last_reading_timestamp.strftime('%Y-%m-%d %H:%M UTC')}"
            ),
            "severity": "HIGH" if age_hours > expected_frequency_hours * 12 else "MEDIUM",
            "last_reading_at": last_reading_timestamp.isoformat(),
            "age_hours": round(age_hours, 1),
        }
    return None
