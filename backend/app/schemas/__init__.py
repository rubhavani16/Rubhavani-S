"""Pydantic schemas for the River Health Evidence Portal."""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# ─── Auth Schemas ─────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    full_name: str
    preferred_language: str

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    role: str
    preferred_language: str
    created_at: datetime
    model_config = {"from_attributes": True}

# ─── Sensor Schemas ───────────────────────────────────────────────────────────

class SensorOut(BaseModel):
    id: int
    sensor_code: str
    name: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str
    expected_frequency_hours: float
    installed_at: Optional[datetime] = None
    last_reading_at: Optional[datetime] = None
    freshness_status: Optional[str] = None
    model_config = {"from_attributes": True}

class SensorReadingOut(BaseModel):
    id: int
    sensor_id: int
    timestamp: datetime
    temperature: Optional[float] = None
    ph: Optional[float] = None
    turbidity: Optional[float] = None
    dissolved_oxygen: Optional[float] = None
    conductivity: Optional[float] = None
    water_level: Optional[float] = None
    is_anomaly: bool = False
    anomaly_type: Optional[str] = None
    is_missing: bool = False
    data_quality: float = 1.0
    model_config = {"from_attributes": True}

# ─── Satellite Schemas ────────────────────────────────────────────────────────

class SatelliteOut(BaseModel):
    id: int
    observation_date: datetime
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    water_surface_area: Optional[float] = None
    ndvi: Optional[float] = None
    ndwi: Optional[float] = None
    turbidity_proxy: Optional[float] = None
    cloud_cover: Optional[float] = None
    satellite_source: str
    is_usable: bool
    quality_flag: str
    is_simulated: bool
    freshness_status: Optional[str] = None
    model_config = {"from_attributes": True}

# ─── Citizen Observation Schemas ──────────────────────────────────────────────

class CitizenObservationCreate(BaseModel):
    location: str
    latitude: Optional[float] = 11.0050
    longitude: Optional[float] = 76.9700
    water_color: Optional[str] = "CLEAR"
    smell: Optional[str] = "NONE"
    visible_waste: bool = False
    algae_presence: bool = False
    fish_activity: Optional[str] = "ACTIVE"
    photo_reference: Optional[str] = None
    user_comment: str
    overall_condition: str = "GOOD"
    confidence: float = Field(default=0.8, ge=0.0, le=1.0)

class CitizenObservationOut(BaseModel):
    id: int
    user_id: int
    username: Optional[str] = None
    timestamp: datetime
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    water_color: Optional[str] = None
    smell: Optional[str] = None
    visible_waste: bool = False
    algae_presence: bool = False
    fish_activity: Optional[str] = None
    photo_reference: Optional[str] = None
    user_comment: Optional[str] = None
    overall_condition: Optional[str] = None
    confidence: float = 0.7
    verification_status: str
    model_config = {"from_attributes": True}

# ─── Validation Schemas ───────────────────────────────────────────────────────

class ValidationCreate(BaseModel):
    observation_id: int
    validation_status: str  # VALIDATED / PARTIALLY_VALIDATED / REJECTED
    validation_score: float = Field(default=80.0, ge=0.0, le=100.0)
    notes: Optional[str] = ""

class ValidationOut(BaseModel):
    id: int
    observation_id: int
    validator_id: int
    validator_name: Optional[str] = None
    validation_date: datetime
    validation_status: str
    validation_score: Optional[float] = None
    notes: Optional[str] = None
    model_config = {"from_attributes": True}

# ─── Water Consumption Schemas ────────────────────────────────────────────────

class WaterConsumptionOut(BaseModel):
    id: int
    date: datetime
    building: str
    consumption_liters: float
    occupancy: Optional[int] = None
    baseline_consumption: Optional[float] = None
    target_consumption: Optional[float] = None
    model_config = {"from_attributes": True}

class WaterConsumptionSummary(BaseModel):
    current_daily_average: float
    baseline_daily_average: float
    target_daily_average: float
    percentage_saved: float
    target_percentage: float
    total_saved_liters: float
    trend: str
    by_building: Dict[str, Dict[str, float]]

# ─── Alert Schemas ────────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id: int
    created_at: datetime
    alert_type: str
    severity: str
    title: str
    message: str
    source_type: Optional[str] = None
    source_id: Optional[int] = None
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    model_config = {"from_attributes": True}

# ─── Question Schemas ─────────────────────────────────────────────────────────

class QuestionCreate(BaseModel):
    evidence_type: Optional[str] = "composite"
    evidence_id: Optional[int] = None
    question_type: str  # ACCURACY, FRESHNESS, SOURCE_RELIABILITY, INTERPRETATION, MISSING_DATA, OTHER
    comment: str
    supporting_observation: Optional[str] = None

class QuestionRespond(BaseModel):
    admin_response: str
    status: str = "RESOLVED"  # UNDER_REVIEW / RESOLVED / REJECTED

class QuestionOut(BaseModel):
    id: int
    user_id: int
    username: Optional[str] = None
    evidence_type: Optional[str] = None
    evidence_id: Optional[int] = None
    question_type: str
    comment: str
    supporting_observation: Optional[str] = None
    status: str
    admin_response: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    model_config = {"from_attributes": True}

# ─── Evidence & Provenance Schemas ────────────────────────────────────────────

class EvidenceItem(BaseModel):
    id: str
    source_type: str  # sensor / satellite / citizen / validation / composite
    source_name: str
    location: str
    timestamp: datetime
    freshness_status: str
    confidence_level: str
    confidence_score: float
    health_assessment: str
    raw_metric_summary: str
    has_anomaly: bool = False
    has_conflict: bool = False
    verified: bool = False
    question_count: int = 0
    details: Dict[str, Any] = {}

class EvidenceDetailOut(BaseModel):
    id: str
    title: str
    claim: str
    source_type: str
    source_identity: str
    collection_time: datetime
    age_description: str
    freshness_status: str
    methodology: str
    confidence_score: float
    confidence_level: str
    confidence_factors: Dict[str, Any]
    rules_applied: List[str]
    supporting_evidence: List[Dict[str, Any]]
    conflicting_evidence: List[Dict[str, Any]]
    anomalies: List[Dict[str, Any]]
    questions: List[Dict[str, Any]]
    validation_record: Optional[Dict[str, Any]] = None
    action_guidance: str
    simulation_disclaimer: str

class ProvenanceStep(BaseModel):
    stage: str
    timestamp: datetime
    agent: str
    action: str
    description: str
    status: str
    metadata: Dict[str, Any] = {}

class ProvenanceChainOut(BaseModel):
    evidence_id: str
    source_type: str
    generated_at: datetime
    steps: List[ProvenanceStep]
