/**
 * API client service for the River Health Portal.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('river_health_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      errorDetail = err.detail || JSON.stringify(err);
    } catch {
      errorDetail = await res.text();
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(username: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const res = await fetch(`${API_BASE}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });
    return handleResponse<any>(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },

  // River Health
  async getRiverHealth() {
    const res = await fetch(`${API_BASE}/api/river-health`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },

  async setDemoScenario(scenario: string) {
    const res = await fetch(`${API_BASE}/api/demo/scenario`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ scenario }),
    });
    return handleResponse<any>(res);
  },

  async getDemoScenarios() {
    const res = await fetch(`${API_BASE}/api/demo/scenarios`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },

  // Evidence
  async listEvidence(params?: {
    source_type?: string;
    freshness?: string;
    confidence?: string;
    health_level?: string;
    has_anomaly?: boolean;
    has_conflict?: boolean;
    search?: string;
  }) {
    const url = new URL(`${API_BASE}/api/evidence`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.append(k, String(v));
        }
      });
    }
    const res = await fetch(url.toString(), {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  async getEvidenceDetail(id: string) {
    const res = await fetch(`${API_BASE}/api/evidence/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },

  async getProvenanceChain(id: string) {
    const res = await fetch(`${API_BASE}/api/provenance/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },

  // Sensors
  async listSensors() {
    const res = await fetch(`${API_BASE}/api/sensors`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  async getSensorReadings(sensorId: number, days = 7) {
    const res = await fetch(`${API_BASE}/api/sensors/${sensorId}/readings?days=${days}&limit=100`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  // Satellite
  async getLatestSatellite() {
    const res = await fetch(`${API_BASE}/api/satellite`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },

  async listSatelliteHistory(days = 60) {
    const res = await fetch(`${API_BASE}/api/satellite/history?days=${days}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  // Citizen Observations
  async listCitizenObservations(condition?: string, status?: string) {
    const url = new URL(`${API_BASE}/api/citizen-observations`);
    if (condition) url.searchParams.append('condition', condition);
    if (status) url.searchParams.append('status', status);
    const res = await fetch(url.toString(), {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  async createCitizenObservation(payload: any) {
    const res = await fetch(`${API_BASE}/api/citizen-observations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<any>(res);
  },

  async listValidations() {
    const res = await fetch(`${API_BASE}/api/validation`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  async createValidation(payload: { observation_id: number; validation_status: string; validation_score: number; notes: string }) {
    const res = await fetch(`${API_BASE}/api/validation`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<any>(res);
  },

  // Water Consumption
  async listWaterConsumption(days = 42, building?: string) {
    const url = new URL(`${API_BASE}/api/water-consumption?days=${days}`);
    if (building) url.searchParams.append('building', building);
    const res = await fetch(url.toString(), {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  async getWaterSummary() {
    const res = await fetch(`${API_BASE}/api/water-consumption/summary`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },

  // Alerts
  async listAlerts(unresolvedOnly = false) {
    const url = new URL(`${API_BASE}/api/alerts`);
    if (unresolvedOnly) url.searchParams.append('unresolved_only', 'true');
    const res = await fetch(url.toString(), {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  async resolveAlert(alertId: number) {
    const res = await fetch(`${API_BASE}/api/alerts/${alertId}/resolve`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },

  // Questions
  async listQuestions(evidenceType?: string, evidenceId?: number) {
    const url = new URL(`${API_BASE}/api/questions`);
    if (evidenceType) url.searchParams.append('evidence_type', evidenceType);
    if (evidenceId) url.searchParams.append('evidence_id', String(evidenceId));
    const res = await fetch(url.toString(), {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  async createQuestion(payload: { evidence_type: string; evidence_id?: number; question_type: string; comment: string; supporting_observation?: string }) {
    const res = await fetch(`${API_BASE}/api/questions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<any>(res);
  },

  async respondToQuestion(questionId: number, adminResponse: string, status = 'RESOLVED') {
    const res = await fetch(`${API_BASE}/api/questions/${questionId}/respond`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ admin_response: adminResponse, status }),
    });
    return handleResponse<any>(res);
  },

  // Metrics
  async getMetrics() {
    const res = await fetch(`${API_BASE}/api/metrics`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
};
