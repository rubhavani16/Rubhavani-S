"""
Seed Script — Generates 6 weeks of realistic demonstration data
================================================================
Run: python scripts/seed_database.py

Data includes:
- 4 users (one per role)
- 3 sensors with readings (every hour, 6 weeks)
- Satellite observations (every 3 days)
- Citizen observations (3-5 per week)
- Validation records
- Water consumption data
- Alerts
- Experiment results
- Validation dataset
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

import random
import math
from datetime import datetime, timedelta
from passlib.context import CryptContext

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.chdir(os.path.join(os.path.dirname(__file__), '..'))

from backend.app.core.database import engine, SessionLocal, create_tables
from backend.app.models import (
    Base, User, UserRole, Sensor, SensorReading, SatelliteObservation,
    CitizenObservation, ValidationRecord, EvidenceScore, WaterConsumption,
    Alert, Question, ExperimentResult, ValidationDataset,
    VerificationStatus, FreshnessStatus, HealthLevel, ConfidenceLevel,
    QuestionType, QuestionStatus, AlertSeverity, SensorStatus,
)

import bcrypt

pwd_context = None
random.seed(42)

NOW = datetime.utcnow()
START = NOW - timedelta(weeks=6)

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def clamp(val, lo, hi):
    return max(lo, min(hi, val))

def add_noise(val, std):
    return val + random.gauss(0, std)

# ─── Create tables ─────────────────────────────────────────────────────────────
print("Creating tables...")
create_tables()
db = SessionLocal()

# Clear existing data
for model in [
    ValidationDataset, ExperimentResult, Question, Alert,
    WaterConsumption, EvidenceScore, ValidationRecord,
    CitizenObservation, SatelliteObservation, SensorReading,
    Sensor, User,
]:
    db.query(model).delete()
db.commit()

# ─── Users ─────────────────────────────────────────────────────────────────────
print("Creating users...")
users = [
    User(username="resident", email="resident@community.local", full_name="Priya Kumar",
         hashed_password=hash_pw("resident123"), role=UserRole.RESIDENT, preferred_language="en"),
    User(username="resident_ta", email="resident_ta@community.local", full_name="முருகன் செல்வம்",
         hashed_password=hash_pw("resident123"), role=UserRole.RESIDENT, preferred_language="ta"),
    User(username="volunteer", email="volunteer@community.local", full_name="Ravi Shankar",
         hashed_password=hash_pw("volunteer123"), role=UserRole.VOLUNTEER),
    User(username="admin", email="admin@community.local", full_name="Admin User",
         hashed_password=hash_pw("admin123"), role=UserRole.ADMIN),
    User(username="analyst", email="analyst@community.local", full_name="Dr. Meena Nair",
         hashed_password=hash_pw("analyst123"), role=UserRole.ANALYST),
]
db.add_all(users)
db.commit()
for u in users:
    db.refresh(u)

resident = users[0]
volunteer = users[2]
admin = users[3]
analyst = users[4]

# ─── Sensors ───────────────────────────────────────────────────────────────────
print("Creating sensors...")
sensors = [
    Sensor(sensor_code="SENSOR-001", name="Upstream Monitor", location="Upstream Station A",
           latitude=11.0168, longitude=76.9558, expected_frequency_hours=1.0,
           installed_at=START - timedelta(days=180), status=SensorStatus.ACTIVE),
    Sensor(sensor_code="SENSOR-002", name="Midstream Monitor", location="Midstream Station B",
           latitude=11.0050, longitude=76.9701, expected_frequency_hours=1.0,
           installed_at=START - timedelta(days=90), status=SensorStatus.ACTIVE),
    Sensor(sensor_code="SENSOR-003", name="Downstream Monitor", location="Downstream Station C",
           latitude=10.9940, longitude=76.9820, expected_frequency_hours=2.0,
           installed_at=START - timedelta(days=60), status=SensorStatus.ACTIVE),
]
db.add_all(sensors)
db.commit()
for s in sensors:
    db.refresh(s)

# ─── Sensor Readings (hourly, 6 weeks) ────────────────────────────────────────
print("Creating sensor readings (~3024 records)...")
all_readings = []
current = START

# Simulate a slow degradation over weeks 3-5 then partial recovery
def get_baseline_quality(days_from_start: float) -> float:
    """Returns a quality multiplier 0-1 based on temporal trend."""
    if days_from_start < 14:
        return 0.9   # Initially good
    elif days_from_start < 28:
        return 0.75  # Degrading
    elif days_from_start < 35:
        return 0.55  # Concerning period
    elif days_from_start < 38:
        return 0.45  # Worst period
    else:
        return 0.70  # Partial recovery

hour_count = 0
while current <= NOW:
    days = (current - START).total_seconds() / 86400
    quality = get_baseline_quality(days)

    for sensor in sensors:
        # Introduce 5% missing data
        if random.random() < 0.05:
            all_readings.append(SensorReading(
                sensor_id=sensor.id,
                timestamp=current,
                is_missing=True,
                data_quality=0.0,
            ))
            continue

        # Base values depend on quality
        ph_base = 7.2 - (1 - quality) * 1.5
        turbidity_base = 5.0 + (1 - quality) * 30.0
        do_base = 9.0 - (1 - quality) * 4.0
        conductivity_base = 300.0 + (1 - quality) * 350.0
        temp_base = 24.0 + (1 - quality) * 4.0

        # Add sensor-specific offsets
        if sensor.sensor_code == "SENSOR-002":
            turbidity_base *= 1.2  # Midstream slightly higher turbidity
        elif sensor.sensor_code == "SENSOR-003":
            ph_base -= 0.1  # Downstream slightly lower pH

        # Add realistic noise
        ph = clamp(add_noise(ph_base, 0.15), 4.0, 11.0)
        turbidity = clamp(add_noise(turbidity_base, 2.0), 0.5, 150.0)
        do = clamp(add_noise(do_base, 0.5), 0.5, 14.0)
        conductivity = clamp(add_noise(conductivity_base, 20.0), 50.0, 1200.0)
        temp = clamp(add_noise(temp_base, 0.8), 18.0, 38.0)
        water_level = clamp(add_noise(1.8 + math.sin(days / 7 * math.pi) * 0.3, 0.1), 0.5, 4.0)

        # Inject anomalies (1% chance)
        is_anomaly = False
        anomaly_type = None
        if random.random() < 0.01:
            is_anomaly = True
            anomaly_choice = random.choice(["ph_spike", "turbidity_spike", "do_crash"])
            if anomaly_choice == "ph_spike":
                ph = random.choice([2.5, 11.5])
                anomaly_type = "pH_SPIKE"
            elif anomaly_choice == "turbidity_spike":
                turbidity = random.uniform(80, 150)
                anomaly_type = "TURBIDITY_SPIKE"
            elif anomaly_choice == "do_crash":
                do = random.uniform(0.5, 2.0)
                anomaly_type = "DO_CRASH"

        all_readings.append(SensorReading(
            sensor_id=sensor.id,
            timestamp=current,
            temperature=round(temp, 2),
            ph=round(ph, 2),
            turbidity=round(turbidity, 2),
            dissolved_oxygen=round(do, 2),
            conductivity=round(conductivity, 1),
            water_level=round(water_level, 3),
            is_anomaly=is_anomaly,
            anomaly_type=anomaly_type,
            data_quality=round(random.uniform(0.85, 1.0), 2),
        ))

    current += timedelta(hours=1)
    hour_count += 1
    if hour_count % 100 == 0:
        db.add_all(all_readings)
        db.commit()
        all_readings = []

if all_readings:
    db.add_all(all_readings)
    db.commit()

# Update sensor last_reading_at
for sensor in sensors:
    last = db.query(SensorReading).filter(
        SensorReading.sensor_id == sensor.id,
        SensorReading.is_missing == False,
    ).order_by(SensorReading.timestamp.desc()).first()
    if last:
        sensor.last_reading_at = last.timestamp
db.commit()

# ─── Satellite Observations (every 3 days) ────────────────────────────────────
print("Creating satellite observations...")
sat_current = START
while sat_current <= NOW:
    days = (sat_current - START).total_seconds() / 86400
    quality = get_baseline_quality(days)
    cloud = random.uniform(5, 95)
    is_usable = cloud < 80

    ndvi = clamp(add_noise(0.5 * quality + 0.1, 0.05), 0.0, 1.0)
    ndwi = clamp(add_noise(0.3 * quality - 0.05, 0.05), -0.5, 0.8)
    turbidity_proxy = clamp(add_noise((1 - quality) * 20 + 3, 2.0), 0.0, 50.0)
    water_surface = clamp(add_noise(12000 + (quality - 0.5) * 2000, 200), 5000, 20000)

    db.add(SatelliteObservation(
        observation_date=sat_current,
        location="Kovai River Catchment",
        latitude=11.0050,
        longitude=76.9650,
        water_surface_area=round(water_surface, 0),
        ndvi=round(ndvi, 3),
        ndwi=round(ndwi, 3),
        turbidity_proxy=round(turbidity_proxy, 2),
        cloud_cover=round(cloud, 1),
        satellite_source="SIMULATED_SENTINEL2",
        is_usable=is_usable,
        quality_flag="CLOUD_COVERED" if not is_usable else "GOOD",
        is_simulated=True,
    ))
    sat_current += timedelta(days=3)

db.commit()

# ─── Citizen Observations ─────────────────────────────────────────────────────
print("Creating citizen observations...")
locations = [
    ("River Bend Park", 11.0100, 76.9600),
    ("Community Ghat", 11.0050, 76.9700),
    ("Old Bridge", 10.9980, 76.9750),
    ("Upstream Walk", 11.0200, 76.9500),
]
water_colors = ["CLEAR", "CLEAR", "SLIGHTLY_TURBID", "TURBID", "GREEN_TINT", "BROWN"]
smells = ["NONE", "NONE", "SLIGHT", "MODERATE", "STRONG"]
fish_activities = ["ACTIVE", "ACTIVE", "LOW", "VERY_LOW", "NONE"]
conditions = ["GOOD", "GOOD", "MODERATE", "POOR"]

cit_obs_list = []
obs_current = START
while obs_current <= NOW:
    days = (obs_current - START).total_seconds() / 86400
    quality = get_baseline_quality(days)

    # 2-5 observations per week, concentrated on weekends
    if obs_current.weekday() in [5, 6] or random.random() < 0.3:
        for _ in range(random.randint(1, 3)):
            loc = random.choice(locations)
            condition_idx = min(int((1 - quality) * 4), 3)
            condition = random.choices(conditions, weights=[
                quality * 100, 30, (1 - quality) * 50, (1 - quality) * 20
            ])[0]
            obs = CitizenObservation(
                user_id=resident.id if random.random() > 0.4 else users[1].id,
                timestamp=obs_current + timedelta(hours=random.uniform(6, 18)),
                location=loc[0],
                latitude=loc[1] + random.uniform(-0.002, 0.002),
                longitude=loc[2] + random.uniform(-0.002, 0.002),
                water_color=random.choices(
                    water_colors,
                    weights=[quality * 80, quality * 60, 20, (1-quality)*30, (1-quality)*20, (1-quality)*10]
                )[0],
                smell=random.choices(smells, weights=[quality*80, quality*40, 20, (1-quality)*25, (1-quality)*10])[0],
                visible_waste=random.random() < (1 - quality) * 0.4,
                algae_presence=random.random() < (1 - quality) * 0.5,
                fish_activity=random.choices(fish_activities, weights=[quality*80, quality*50, 20, (1-quality)*30, (1-quality)*15])[0],
                user_comment=random.choice([
                    "Water looks clear today", "Noticed some floating debris",
                    "Strange smell near the bank", "Many birds present — good sign",
                    "Water level seems lower than usual", "Algae bloom near the reeds",
                    "Fish visible — healthy", "Water colour looks off",
                ]),
                overall_condition=condition,
                confidence=round(random.uniform(0.6, 0.95), 2),
                verification_status=random.choices(
                    [VerificationStatus.PENDING, VerificationStatus.VALIDATED,
                     VerificationStatus.PARTIALLY_VALIDATED, VerificationStatus.REJECTED],
                    weights=[40, 40, 15, 5]
                )[0],
            )
            cit_obs_list.append(obs)

    obs_current += timedelta(days=1)

db.add_all(cit_obs_list)
db.commit()
for obs in cit_obs_list:
    db.refresh(obs)

# ─── Validation Records ────────────────────────────────────────────────────────
print("Creating validation records...")
validated_obs = [o for o in cit_obs_list if o.verification_status in [
    VerificationStatus.VALIDATED, VerificationStatus.PARTIALLY_VALIDATED, VerificationStatus.REJECTED
]]
for obs in validated_obs:
    score = 80.0 if obs.verification_status == VerificationStatus.VALIDATED else 50.0
    db.add(ValidationRecord(
        observation_id=obs.id,
        validator_id=volunteer.id,
        validation_date=obs.timestamp + timedelta(days=random.randint(1, 5)),
        validation_status=obs.verification_status,
        validation_score=round(add_noise(score, 10), 1),
        notes=random.choice([
            "Verified on-site — consistent with sensor data",
            "Photos reviewed — report appears credible",
            "GPS location matches reported site",
            "Minor discrepancy in colour description but overall accurate",
            "Unable to fully verify — observation partially accepted",
        ]),
    ))
db.commit()

# ─── Water Consumption ────────────────────────────────────────────────────────
print("Creating water consumption data...")
buildings = ["Block A", "Block B", "Block C", "Block D"]
wc_current = START.date()
end_date = NOW.date()

while wc_current <= end_date:
    for bldg in buildings:
        baseline = 30000.0  # L/day per block
        target = baseline * 0.80  # 20% reduction target
        # Gradual reduction trend
        days_elapsed = (wc_current - START.date()).days
        reduction_factor = min(0.18, days_elapsed / 42 * 0.20)  # up to 18% by week 6
        actual = baseline * (1 - reduction_factor) + add_noise(0, 800)
        actual = max(actual, target * 0.9)

        db.add(WaterConsumption(
            date=datetime.combine(wc_current, datetime.min.time()),
            building=bldg,
            consumption_liters=round(actual, 0),
            occupancy=random.randint(85, 120),
            baseline_consumption=baseline,
            target_consumption=target,
        ))
    wc_current += timedelta(days=1)
db.commit()

# ─── Alerts ───────────────────────────────────────────────────────────────────
print("Creating alerts...")
alerts = [
    Alert(alert_type="SENSOR_ANOMALY", severity=AlertSeverity.WARNING,
          title="pH Anomaly Detected — SENSOR-002",
          message="Sensor SENSOR-002 reported pH=2.3 at 2026-08-15 14:30 UTC. This value is outside the physically possible range. Sensor reading excluded from evidence score. Validation required.",
          source_type="sensor", is_resolved=False,
          created_at=NOW - timedelta(days=5)),
    Alert(alert_type="STALE_DATA", severity=AlertSeverity.WARNING,
          title="Satellite Data Aging",
          message="Most recent usable satellite observation is 5 days old. Cloud coverage prevented more recent acquisition. Confidence score reduced. Next satellite pass expected within 2 days.",
          source_type="satellite", is_resolved=False,
          created_at=NOW - timedelta(hours=12)),
    Alert(alert_type="SOURCE_CONFLICT", severity=AlertSeverity.WARNING,
          title="Evidence Conflict: Sensor vs Citizen Reports",
          message="Sensor data indicates GOOD water quality (score: 82/100) but recent citizen observations report POOR conditions (score: 35/100). Difference of 47 points exceeds conflict threshold. Field validation recommended.",
          source_type="evidence", is_resolved=False,
          created_at=NOW - timedelta(days=2)),
    Alert(alert_type="WATER_CONSUMPTION", severity=AlertSeverity.INFO,
          title="Community Water Reduction: 15% Achieved",
          message="Community water consumption is 15% below baseline. Target is 20% reduction. Good progress — keep it up!",
          source_type="consumption", is_resolved=False,
          created_at=NOW - timedelta(days=1)),
    Alert(alert_type="NO_CITIZEN_DATA", severity=AlertSeverity.INFO,
          title="Low Citizen Observation Activity",
          message="Only 2 citizen observations submitted in the last 14 days. Citizen evidence weight is reduced. Please encourage community members to submit observations.",
          source_type="citizen", is_resolved=True, resolved_at=NOW - timedelta(days=3),
          created_at=NOW - timedelta(days=10)),
]
db.add_all(alerts)
db.commit()

# ─── Questions ────────────────────────────────────────────────────────────────
print("Creating sample questions...")
questions = [
    Question(user_id=resident.id, evidence_type="sensor", evidence_id=1,
             question_type=QuestionType.ACCURACY,
             comment="The sensor shows good water quality but I can clearly see the water is murky today near the community ghat. I don't trust this reading.",
             status=QuestionStatus.UNDER_REVIEW,
             admin_response="Thank you for your report. We are investigating the discrepancy. Your citizen observation has been flagged for priority validation.",
             created_at=NOW - timedelta(days=2)),
    Question(user_id=users[1].id, evidence_type="satellite", evidence_id=1,
             question_type=QuestionType.FRESHNESS,
             comment="The satellite data is 5 days old. How can we trust the current water surface indicator based on old data?",
             status=QuestionStatus.OPEN,
             created_at=NOW - timedelta(hours=8)),
    Question(user_id=resident.id, evidence_type="evidence", evidence_id=None,
             question_type=QuestionType.MISSING_DATA,
             comment="Why are citizen observations showing such a low weight? There are many of us who observe the river daily. Our reports should matter more.",
             status=QuestionStatus.RESOLVED,
             admin_response="Citizen observations currently have a 20% weight in our evidence model. This is because we cannot verify all reports. As more observations get validated by volunteers, the effective weight increases. We appreciate your engagement.",
             created_at=NOW - timedelta(days=7), resolved_at=NOW - timedelta(days=5)),
]
db.add_all(questions)
db.commit()

# ─── Experiment Results ────────────────────────────────────────────────────────
print("Creating experiment results...")
exp_results = [
    ExperimentResult(metric_name="Correct Interpretation of River Health",
                     baseline_value=55.0, target_value=80.0, measured_value=78.0,
                     category="interpretation", is_simulated=True,
                     description="% of users correctly identifying river health status (Good/Moderate/Concerning/Poor)"),
    ExperimentResult(metric_name="Source Identification Accuracy",
                     baseline_value=40.0, target_value=80.0, measured_value=82.0,
                     category="interpretation", is_simulated=True,
                     description="% of users correctly identifying which source supports a conclusion"),
    ExperimentResult(metric_name="Uncertainty Recognition",
                     baseline_value=30.0, target_value=75.0, measured_value=71.0,
                     category="interpretation", is_simulated=True,
                     description="% of users correctly identifying uncertainty or confidence limitations"),
    ExperimentResult(metric_name="Stale Data Identification",
                     baseline_value=35.0, target_value=80.0, measured_value=85.0,
                     category="freshness", is_simulated=True,
                     description="% of users correctly identifying when data is stale or missing"),
    ExperimentResult(metric_name="Appropriate Evidence Challenge",
                     baseline_value=20.0, target_value=60.0, measured_value=58.0,
                     category="questioning", is_simulated=True,
                     description="% of users appropriately questioning conflicting or uncertain evidence"),
    ExperimentResult(metric_name="Average Task Completion Time (seconds)",
                     baseline_value=120.0, target_value=90.0, measured_value=95.0,
                     category="usability", is_simulated=True,
                     description="Average seconds to complete one interpretation task"),
]
db.add_all(exp_results)
db.commit()

# ─── Validation Dataset ────────────────────────────────────────────────────────
print("Creating validation dataset...")
vd_entries = [
    ValidationDataset(evidence_id=1, evidence_type="composite",
                      actual_condition="GOOD", sensor_condition="GOOD",
                      satellite_condition="GOOD", citizen_condition="GOOD",
                      validation_status="VALIDATED", expected_interpretation="GOOD",
                      expected_confidence="HIGH", actual_system_interpretation="GOOD",
                      is_correct=True, error_type=None),
    ValidationDataset(evidence_id=2, evidence_type="composite",
                      actual_condition="MODERATE", sensor_condition="GOOD",
                      satellite_condition="MODERATE", citizen_condition="POOR",
                      validation_status="PARTIALLY_VALIDATED",
                      expected_interpretation="MODERATE", expected_confidence="MEDIUM",
                      actual_system_interpretation="MODERATE",
                      is_correct=True, error_type=None),
    ValidationDataset(evidence_id=3, evidence_type="composite",
                      actual_condition="CONCERNING", sensor_condition="CONCERNING",
                      satellite_condition="MODERATE", citizen_condition="CONCERNING",
                      validation_status="VALIDATED", expected_interpretation="CONCERNING",
                      expected_confidence="HIGH", actual_system_interpretation="MODERATE",
                      is_correct=False, error_type="MISINTERPRETED_CONFIDENCE"),
    ValidationDataset(evidence_id=4, evidence_type="composite",
                      actual_condition="POOR", sensor_condition="MISSING",
                      satellite_condition="STALE", citizen_condition="POOR",
                      validation_status="PENDING", expected_interpretation="CONCERNING",
                      expected_confidence="LOW", actual_system_interpretation="CONCERNING",
                      is_correct=True, error_type=None),
    ValidationDataset(evidence_id=5, evidence_type="composite",
                      actual_condition="GOOD", sensor_condition="ANOMALY",
                      satellite_condition="GOOD", citizen_condition="GOOD",
                      validation_status="VALIDATED", expected_interpretation="MODERATE",
                      expected_confidence="MEDIUM", actual_system_interpretation="MODERATE",
                      is_correct=True, error_type=None),
]
db.add_all(vd_entries)
db.commit()

print("\n✅ Seed complete!")
print(f"   Users: {db.query(User).count()}")
print(f"   Sensors: {db.query(Sensor).count()}")
print(f"   Sensor Readings: {db.query(SensorReading).count()}")
print(f"   Satellite Observations: {db.query(SatelliteObservation).count()}")
print(f"   Citizen Observations: {db.query(CitizenObservation).count()}")
print(f"   Validation Records: {db.query(ValidationRecord).count()}")
print(f"   Water Consumption: {db.query(WaterConsumption).count()}")
print(f"   Alerts: {db.query(Alert).count()}")
print(f"   Questions: {db.query(Question).count()}")
db.close()
