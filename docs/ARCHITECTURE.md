# Community River Health Evidence Portal — System Architecture

## 1. Overview & Core Philosophy

The Community River Health Evidence Portal transforms raw, fragmented environmental telemetry into understandable, transparent, traceable, and questionable **evidence** for apartment residents and community volunteers.

### Key Capabilities
- **Composite Scoring**: Combines physical sensors, satellite spectral indices, citizen ground truth, and volunteer validations.
- **Explainable Confidence**: Five-factor uncertainty calculation explaining *why* confidence is high, medium, or low.
- **Temporal Freshness**: Source-aware aging logic with automatic uncertainty penalties for stale or missing streams.
- **Anomaly & Discrepancy Detection**: Hard physical bounds checking, rolling 3-sigma statistical spike detection, and cross-source conflict flagging.
- **Full Traceability**: 5-stage provenance audit chain from raw sampling to portal display.
- **Bidirectional Questioning**: Residents can question or challenge any evidence item directly in the UI.

---

## 2. Multi-Source Evidence Scoring Engine

The master composite river health score is calculated as a weighted synthesis of 4 distinct environmental streams:

$$\text{River Health Score} = 0.35 \times \text{Sensor} + 0.25 \times \text{Satellite} + 0.20 \times \text{Citizen} + 0.20 \times \text{Validation}$$

| Source | Default Weight | Key Parameters / Methodology |
|---|---|---|
| **In-situ Telemetry** | 35% | pH, dissolved oxygen (DO), turbidity, electrical conductivity, water level, temperature |
| **Sentinel-2 Satellite** | 25% | NDWI (Normalized Difference Water Index), NDVI, turbidity proxy, cloud mask |
| **Citizen Science** | 20% | Water color, odor, visible surface waste, macro-algae presence, fish activity |
| **Ground Truth Validation**| 20% | Volunteer field inspections, photographic review, GPS location confirmation |

### Health Classification Standard
- **GOOD (80–100)**: All parameters within healthy environmental thresholds. Biodiversity is supported.
- **MODERATE (60–79)**: Minor parameter degradation detected in select reaches. Active monitoring recommended.
- **CONCERNING (40–59)**: Significant parameter violation or hypoxia risk. Field validation prioritized.
- **POOR (0–39)**: Critical parameter crash (e.g. DO $<4.0$ mg/L or pH $<5.5$). High alert triggered.

---

## 3. Five-Factor Confidence & Uncertainty Model

Confidence is computed dynamically from 5 independent factors:

$$\text{Confidence} = 0.30 \times \text{Reliability} + 0.20 \times \text{Freshness} + 0.25 \times \text{Agreement} + 0.15 \times \text{Coverage} + 0.10 \times \text{Completeness}$$

- **High Confidence ($\ge 75\%$)**: Multiple sources active, fresh data, strong cross-source agreement, and validated observations.
- **Medium Confidence ($50\% - 74\%$)**: One source aging or minor divergence between sources.
- **Low Confidence ($< 50\%$)**: Critical source missing (e.g. sensor offline), stale satellite data ($>7$ days), or conflicting evidence.

---

## 4. Freshness Windows

| Source | Fresh Threshold | Aging Threshold | Stale Threshold | Missing Threshold |
|---|---|---|---|---|
| **Sensor** | $\le 2$ hours | $2 - 6$ hours | $6 - 24$ hours | $> 24$ hours |
| **Satellite** | $\le 3$ days | $3 - 7$ days | $7 - 30$ days | $> 30$ days |
| **Citizen** | $\le 7$ days | $7 - 14$ days | $14 - 30$ days | $> 30$ days |
| **Validation** | $\le 7$ days | $7 - 14$ days | $14 - 30$ days | $> 30$ days |

---

## 5. Five-Stage Provenance Audit Chain

Every piece of evidence maintains a traceable provenance chain:
1. **Stage 1: Collection** — Raw sensor telemetry, Sentinel-2 spectral acquisition, or mobile observation capture.
2. **Stage 2: Ingestion & Verification** — Payload schema validation and SHA-256 integrity verification.
3. **Stage 3: Quality Control & Anomaly Filter** — Physical boundary checking and rolling 3-sigma statistical z-score evaluation.
4. **Stage 4: Normalization & Weighting** — Score mapping (0–100 scale) and weighted aggregation.
5. **Stage 5: Portal Publication** — Displayed in portal with 12 drill-down answers and challenge capability.
