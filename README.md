# Community River Health Evidence Portal

A community-facing web application for monitoring river health through transparent, traceable, and multi-source environmental evidence.

## Features
- 🌊 Real-time river health dashboard with confidence scoring
- 📡 Multi-source evidence: IoT sensors, satellite imagery, citizen observations, validation records
- 🔍 Evidence drill-down with full source provenance
- ❓ Evidence questioning and challenge workflow
- 💧 Water conservation analytics
- 🌐 English / Tamil (தமிழ்) language support
- 👥 Role-based views: Resident, Volunteer, Admin, Analyst
- 🎭 7 demo failure scenarios (missing data, conflicts, anomalies)
- ♿ Accessible design (WCAG AA)

## Tech Stack
- **Backend**: FastAPI (Python), SQLite, SQLAlchemy
- **Frontend**: React + TypeScript + Vite
- **Evidence Engine**: Custom weighted scoring with anomaly detection

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
python ../scripts/seed_database.py
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API: http://127.0.0.1:8000
- API Docs: http://127.0.0.1:8000/docs

## Demo Credentials
| Role | Username | Password |
|------|----------|----------|
| Resident | `resident` | `resident123` |
| Volunteer | `volunteer` | `volunteer123` |
| Admin | `admin` | `admin123` |
| Analyst | `analyst` | `analyst123` |

## Community
Kovai River Enclave — Community Evidence Network
