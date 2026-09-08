export type UserRole = 'RESIDENT' | 'VOLUNTEER' | 'ADMIN' | 'ANALYST';

export type HealthLevel = 'GOOD' | 'MODERATE' | 'CONCERNING' | 'POOR';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type FreshnessStatus = 'FRESH' | 'AGING' | 'STALE' | 'MISSING';
export type VerificationStatus = 'PENDING' | 'VALIDATED' | 'PARTIALLY_VALIDATED' | 'REJECTED';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  role: UserRole;
  preferred_language: string;
  created_at?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  role: UserRole;
  language: string;
  simpleLanguage: boolean;
}

export interface FreshnessItem {
  status: FreshnessStatus;
  description: string;
  score: number;
  last_update?: string | null;
}

export interface EvidenceContribution {
  contribution: number;
  max: number;
  score: number;
  weight_pct: number;
  rules?: string[];
  [key: string]: any;
}

export interface RiverHealthData {
  timestamp: string;
  demo_scenario: string;
  is_demo: boolean;
  final_score: number;
  health_level: HealthLevel;
  health_label: string;
  confidence_score: number;
  confidence_level: ConfidenceLevel;
  confidence_explanation: string;
  confidence_factors: Record<string, any>;
  freshness: {
    sensor: FreshnessItem;
    satellite: FreshnessItem;
    citizen: FreshnessItem;
    validation: FreshnessItem;
  };
  evidence_contributions: {
    sensor: EvidenceContribution;
    satellite: EvidenceContribution;
    citizen: EvidenceContribution;
    validation: EvidenceContribution;
  };
  has_conflict: boolean;
  conflict_description?: string;
  has_anomaly: boolean;
  anomaly_description?: string;
  anomaly_count: number;
  missing_sources: string[];
  active_sources: number;
  total_sources: number;
  explanation: string;
  citizen_observation_count: number;
  validation_count: number;
  open_questions: number;
}

export interface EvidenceItem {
  id: string;
  source_type: 'sensor' | 'satellite' | 'citizen' | 'validation' | 'composite';
  source_name: string;
  location: string;
  timestamp: string;
  freshness_status: FreshnessStatus;
  confidence_level: ConfidenceLevel;
  confidence_score: number;
  health_assessment: HealthLevel;
  raw_metric_summary: string;
  has_anomaly: boolean;
  has_conflict: boolean;
  verified: boolean;
  question_count: number;
  details: Record<string, any>;
}

export interface EvidenceDetail {
  id: string;
  title: string;
  claim: string;
  source_type: string;
  source_identity: string;
  collection_time: string;
  age_description: string;
  freshness_status: FreshnessStatus;
  methodology: string;
  confidence_score: number;
  confidence_level: ConfidenceLevel;
  confidence_factors: Record<string, any>;
  rules_applied: string[];
  supporting_evidence: Array<{ source: string; status: string; detail: string }>;
  conflicting_evidence: Array<{ source: string; status: string; detail: string }>;
  anomalies: Array<{ type: string; status?: string; detail?: string }>;
  questions: Array<{ user: string; question: string; status: string; response?: string }>;
  validation_record?: Record<string, any>;
  action_guidance: string;
  simulation_disclaimer: string;
}

export interface ProvenanceStep {
  stage: string;
  timestamp: string;
  agent: string;
  action: string;
  description: string;
  status: string;
  metadata: Record<string, any>;
}

export interface ProvenanceChain {
  evidence_id: string;
  source_type: string;
  generated_at: string;
  steps: ProvenanceStep[];
}

export interface Sensor {
  id: number;
  sensor_code: string;
  name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  status: string;
  expected_frequency_hours: number;
  installed_at?: string;
  last_reading_at?: string;
  freshness_status?: FreshnessStatus;
}

export interface SensorReading {
  id: number;
  sensor_id: number;
  timestamp: string;
  temperature?: number;
  ph?: number;
  turbidity?: number;
  dissolved_oxygen?: number;
  conductivity?: number;
  water_level?: number;
  is_anomaly: boolean;
  anomaly_type?: string;
  is_missing: boolean;
  data_quality: number;
}

export interface SatelliteObservation {
  id: number;
  observation_date: string;
  location: string;
  water_surface_area?: number;
  ndvi?: number;
  ndwi?: number;
  turbidity_proxy?: number;
  cloud_cover?: number;
  satellite_source: string;
  is_usable: boolean;
  quality_flag: string;
  is_simulated: boolean;
  freshness_status?: FreshnessStatus;
}

export interface CitizenObservation {
  id: number;
  user_id: number;
  username?: string;
  timestamp: string;
  location: string;
  latitude?: number;
  longitude?: number;
  water_color?: string;
  smell?: string;
  visible_waste: boolean;
  algae_presence: boolean;
  fish_activity?: string;
  photo_reference?: string;
  user_comment?: string;
  overall_condition?: HealthLevel;
  confidence: number;
  verification_status: VerificationStatus;
}

export interface ValidationRecord {
  id: number;
  observation_id: number;
  validator_id: number;
  validator_name?: string;
  validation_date: string;
  validation_status: VerificationStatus;
  validation_score?: number;
  notes?: string;
}

export interface WaterConsumption {
  id: number;
  date: string;
  building: string;
  consumption_liters: number;
  baseline_consumption?: number;
  target_consumption?: number;
}

export interface WaterSummary {
  current_daily_average: number;
  baseline_daily_average: number;
  target_daily_average: number;
  percentage_saved: number;
  target_percentage: number;
  total_saved_liters: number;
  trend: string;
  by_building: Record<string, {
    current_liters: number;
    baseline_liters: number;
    target_liters: number;
    saved_percentage: number;
  }>;
}

export interface Alert {
  id: number;
  created_at: string;
  alert_type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  source_type?: string;
  source_id?: number;
  is_resolved: boolean;
  resolved_at?: string;
}

export interface Question {
  id: number;
  user_id: number;
  username?: string;
  evidence_type?: string;
  evidence_id?: number;
  question_type: string;
  comment: string;
  supporting_observation?: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';
  admin_response?: string;
  created_at: string;
  resolved_at?: string;
}

export interface SystemMetrics {
  system: {
    total_sensor_readings: number;
    missing_data_rate: number;
    anomaly_rate: number;
    satellite_availability: number;
    citizen_validation_coverage: number;
    total_citizen_observations: number;
    total_satellite_observations: number;
    open_questions: number;
    total_questions: number;
  };
  experiment: {
    results: Array<{
      metric: string;
      category: string;
      baseline: number;
      target: number;
      measured: number;
      improvement?: number;
      passes: boolean;
      is_simulated: boolean;
      description: string;
    }>;
  };
  validation_dataset: {
    total: number;
    correct: number;
    accuracy: number;
    entries: Array<{
      id: number;
      evidence_type: string;
      actual_condition: string;
      expected_interpretation: string;
      actual_system_interpretation: string;
      is_correct: boolean;
      error_type?: string;
    }>;
  };
  error_analysis: Array<{
    error_type: string;
    count: number;
    percentage: number;
    example_task: string;
    likely_reason: string;
    ui_improvement: string;
  }>;
}
