# Community River Health Evidence Portal — API Reference

Base URL: `http://127.0.0.1:8000`  
Interactive OpenAPI Documentation: `http://127.0.0.1:8000/docs`

---

## Authentication Endpoints

### `POST /api/auth/token`
Authenticate with OAuth2 form credentials (`username`, `password`) and receive a JWT access token.

**Response**:
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "role": "RESIDENT",
  "username": "resident",
  "full_name": "Priya Kumar",
  "preferred_language": "en"
}
```

### `GET /api/auth/me`
Retrieve profile of currently authenticated user. Requires Bearer token header.

---

## River Health & Composite Evidence

### `GET /api/river-health`
Returns the aggregated composite river health score, confidence score, freshness matrix, source contributions, and anomaly/conflict flags.

### `POST /api/demo/scenario`
Sets active demonstration scenario.
**Payload**: `{"scenario": "MISSING_SENSOR"}`  
Supported values: `NORMAL`, `MISSING_SENSOR`, `STALE_SATELLITE`, `CONFLICTING`, `ANOMALY`, `NO_CITIZENS`, `LOW_SATELLITE`.

### `GET /api/demo/scenarios`
Lists all available demo scenarios with descriptions.

---

## Evidence Explorer & Drill-Down

### `GET /api/evidence`
Search and filter evidence across all environmental sources.
**Query Parameters**:
- `source_type`: `composite`, `sensor`, `satellite`, `citizen`, `validation`
- `freshness`: `FRESH`, `AGING`, `STALE`, `MISSING`
- `confidence`: `HIGH`, `MEDIUM`, `LOW`
- `health_level`: `GOOD`, `MODERATE`, `CONCERNING`, `POOR`
- `has_anomaly`: boolean
- `has_conflict`: boolean
- `search`: search keyword

### `GET /api/evidence/{evidence_id}`
Returns full 12-question drill-down metadata for an evidence item:
- Claim & Source identification
- Collection methodology & timestamps
- Freshness & Confidence factor breakdown
- Corroborating and conflicting evidence
- Transparent rules applied & threshold checks
- Anomalies, community challenges, validations, and conservation actions

### `GET /api/provenance/{evidence_id}`
Returns step-by-step 5-stage provenance audit chain.

---

## Telemetry & Remote Sensing

### `GET /api/sensors`
List all deployed IoT sensors with status, coordinates, and freshness.

### `GET /api/sensors/{id}/readings`
Time-series readings for a sensor with optional filters (`days`, `hours`, `anomalies_only`).

### `GET /api/satellite`
Latest usable Sentinel-2 remote sensing observation.

### `GET /api/satellite/history`
Historical satellite observations with NDWI, NDVI, turbidity proxy, and cloud cover.

---

## Citizen Science & Field Validation

### `GET /api/citizen-observations`
List community-submitted visual river observations.

### `POST /api/citizen-observations`
Submit a new ground observation (water color, odor, waste, algae, fish activity, comments).

### `GET /api/validation`
List ground truth validation records.

### `POST /api/validation`
Submit validation record for a citizen observation (Requires `VOLUNTEER`, `ADMIN`, or `ANALYST` role).

---

## Water Conservation & Challenges

### `GET /api/water-consumption`
Time-series daily water consumption per apartment block.

### `GET /api/water-consumption/summary`
Aggregated savings %, total liters conserved, and progress toward 20% target.

### `GET /api/alerts`
List system alerts (anomalies, stale data, conflicts).

### `PATCH /api/alerts/{id}/resolve`
Mark alert as resolved (Requires `VOLUNTEER` or `ADMIN` role).

### `GET /api/questions`
List community evidence questions and challenges.

### `POST /api/questions`
Submit challenge against any environmental evidence finding.

### `PATCH /api/questions/{id}/respond`
Admin response to community challenge (Requires `ADMIN` or `VOLUNTEER` role).

### `GET /api/metrics`
Operational metrics, experiment benchmarks, and error analysis.

### `GET /api/health`
Health check status endpoint.
