"""Database models for the River Health Evidence Portal."""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text,
    ForeignKey, Enum as SAEnum, Index, create_engine
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
import enum

Base = declarative_base()

# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    RESIDENT = "RESIDENT"
    VOLUNTEER = "VOLUNTEER"
    ADMIN = "ADMIN"
    ANALYST = "ANALYST"

class FreshnessStatus(str, enum.Enum):
    FRESH = "FRESH"
    AGING = "AGING"
    STALE = "STALE"
    MISSING = "MISSING"

class HealthLevel(str, enum.Enum):
    GOOD = "GOOD"
    MODERATE = "MODERATE"
    CONCERNING = "CONCERNING"
    POOR = "POOR"

class ConfidenceLevel(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class VerificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    VALIDATED = "VALIDATED"
    PARTIALLY_VALIDATED = "PARTIALLY_VALIDATED"
    REJECTED = "REJECTED"

class QuestionType(str, enum.Enum):
    ACCURACY = "ACCURACY"
    FRESHNESS = "FRESHNESS"
    SOURCE_RELIABILITY = "SOURCE_RELIABILITY"
    INTERPRETATION = "INTERPRETATION"
    MISSING_DATA = "MISSING_DATA"
    OTHER = "OTHER"

class QuestionStatus(str, enum.Enum):
    OPEN = "OPEN"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"

class AlertSeverity(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

class SensorStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ANOMALY = "ANOMALY"

# ─── Tables ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    full_name = Column(String(100))
    hashed_password = Column(String(200), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.RESIDENT, nullable=False)
    is_active = Column(Boolean, default=True)
    preferred_language = Column(String(10), default="en")
    created_at = Column(DateTime, default=datetime.utcnow)
    observations = relationship("CitizenObservation", back_populates="user")
    questions = relationship("Question", back_populates="user")
    validations = relationship("ValidationRecord", back_populates="validator")
    audit_logs = relationship("AuditLog", back_populates="user")

class Sensor(Base):
    __tablename__ = "sensors"
    id = Column(Integer, primary_key=True, index=True)
    sensor_code = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    location = Column(String(100), nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    status = Column(SAEnum(SensorStatus), default=SensorStatus.ACTIVE)
    expected_frequency_hours = Column(Float, default=1.0)
    installed_at = Column(DateTime)
    last_reading_at = Column(DateTime)
    readings = relationship("SensorReading", back_populates="sensor")

class SensorReading(Base):
    __tablename__ = "sensor_readings"
    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(Integer, ForeignKey("sensors.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    temperature = Column(Float)
    ph = Column(Float)
    turbidity = Column(Float)
    dissolved_oxygen = Column(Float)
    conductivity = Column(Float)
    water_level = Column(Float)
    is_anomaly = Column(Boolean, default=False)
    anomaly_type = Column(String(50))
    is_missing = Column(Boolean, default=False)
    data_quality = Column(Float, default=1.0)  # 0-1
    sensor = relationship("Sensor", back_populates="readings")

    __table_args__ = (
        Index("ix_sensor_readings_sensor_timestamp", "sensor_id", "timestamp"),
    )

class SatelliteObservation(Base):
    __tablename__ = "satellite_observations"
    id = Column(Integer, primary_key=True, index=True)
    observation_date = Column(DateTime, nullable=False, index=True)
    location = Column(String(100), nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    water_surface_area = Column(Float)
    ndvi = Column(Float)
    ndwi = Column(Float)
    turbidity_proxy = Column(Float)
    cloud_cover = Column(Float)
    satellite_source = Column(String(50), default="SIMULATED_SENTINEL2")
    is_usable = Column(Boolean, default=True)
    quality_flag = Column(String(20), default="GOOD")
    is_simulated = Column(Boolean, default=True)

class CitizenObservation(Base):
    __tablename__ = "citizen_observations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    location = Column(String(100), nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    water_color = Column(String(50))
    smell = Column(String(50))
    visible_waste = Column(Boolean, default=False)
    algae_presence = Column(Boolean, default=False)
    fish_activity = Column(String(50))
    photo_reference = Column(String(200))
    user_comment = Column(Text)
    overall_condition = Column(String(30))  # GOOD/MODERATE/POOR
    confidence = Column(Float, default=0.7)  # user's own confidence 0-1
    verification_status = Column(
        SAEnum(VerificationStatus), default=VerificationStatus.PENDING
    )
    user = relationship("User", back_populates="observations")
    validations = relationship("ValidationRecord", back_populates="observation")

class ValidationRecord(Base):
    __tablename__ = "validation_records"
    id = Column(Integer, primary_key=True, index=True)
    observation_id = Column(
        Integer, ForeignKey("citizen_observations.id"), nullable=False, index=True
    )
    validator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    validation_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    validation_status = Column(SAEnum(VerificationStatus), default=VerificationStatus.PENDING)
    validation_score = Column(Float)  # 0-100
    notes = Column(Text)
    observation = relationship("CitizenObservation", back_populates="validations")
    validator = relationship("User", back_populates="validations")

class EvidenceScore(Base):
    __tablename__ = "evidence_scores"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    # Component scores (0-100 scale contribution)
    sensor_score = Column(Float)
    satellite_score = Column(Float)
    citizen_score = Column(Float)
    validation_score = Column(Float)
    # Final
    final_score = Column(Float)
    health_level = Column(SAEnum(HealthLevel))
    # Confidence
    confidence_score = Column(Float)
    confidence_level = Column(SAEnum(ConfidenceLevel))
    confidence_explanation = Column(Text)
    # Freshness
    sensor_freshness = Column(SAEnum(FreshnessStatus))
    satellite_freshness = Column(SAEnum(FreshnessStatus))
    citizen_freshness = Column(SAEnum(FreshnessStatus))
    validation_freshness = Column(SAEnum(FreshnessStatus))
    # Flags
    has_conflict = Column(Boolean, default=False)
    has_anomaly = Column(Boolean, default=False)
    missing_sources = Column(String(200))
    demo_scenario = Column(String(50))

class WaterConsumption(Base):
    __tablename__ = "water_consumption"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False, index=True)
    building = Column(String(20), nullable=False)
    consumption_liters = Column(Float, nullable=False)
    occupancy = Column(Integer)
    baseline_consumption = Column(Float)
    target_consumption = Column(Float)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    alert_type = Column(String(50), nullable=False)
    severity = Column(SAEnum(AlertSeverity), default=AlertSeverity.INFO)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    source_type = Column(String(50))
    source_id = Column(Integer)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    evidence_type = Column(String(50))
    evidence_id = Column(Integer)
    question_type = Column(SAEnum(QuestionType), nullable=False)
    comment = Column(Text, nullable=False)
    supporting_observation = Column(Text)
    status = Column(SAEnum(QuestionStatus), default=QuestionStatus.OPEN)
    admin_response = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime)
    user = relationship("User", back_populates="questions")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50))
    resource_id = Column(Integer)
    details = Column(Text)
    ip_address = Column(String(50))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    user = relationship("User", back_populates="audit_logs")

class ExperimentResult(Base):
    __tablename__ = "experiment_results"
    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String(100), nullable=False)
    baseline_value = Column(Float)
    target_value = Column(Float)
    measured_value = Column(Float)
    is_simulated = Column(Boolean, default=True)
    description = Column(Text)
    category = Column(String(50))

class ValidationDataset(Base):
    __tablename__ = "validation_dataset"
    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(Integer)
    evidence_type = Column(String(50))
    actual_condition = Column(String(30))
    sensor_condition = Column(String(30))
    satellite_condition = Column(String(30))
    citizen_condition = Column(String(30))
    validation_status = Column(String(30))
    expected_interpretation = Column(String(30))
    expected_confidence = Column(String(20))
    actual_system_interpretation = Column(String(30))
    is_correct = Column(Boolean)
    error_type = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
