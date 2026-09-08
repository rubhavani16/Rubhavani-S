"""
FastAPI Application Entry Point — Community River Health Evidence Portal.
========================================================================
Integrates authentication, evidence scoring engine, telemetry, remote sensing,
citizen science observations, verification records, water metrics, and demo scenarios.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import create_tables
from app.api.auth import router as auth_router
from app.api.river_health import router as river_health_router
from app.api.evidence import router as evidence_router
from app.api.sensors import router as sensors_router
from app.api.satellite import router as satellite_router
from app.api.citizen import router as citizen_router
from app.api.water_consumption import router as water_router
from app.api.alerts import router as alerts_router
from app.api.questions import router as questions_router

# Ensure tables are created
create_tables()

app = FastAPI(
    title="Community River Health Evidence Portal API",
    description="""
    Transparent, traceable, and questionable environmental evidence API for community residents,
    volunteers, analysts, and administrators.
    Transforms environmental observations into explainable, confidence-weighted evidence.
    """,
    version="1.0.0",
)

# CORS configuration for local React / Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all feature routers
app.include_router(auth_router)
app.include_router(river_health_router)
app.include_router(evidence_router)
app.include_router(sensors_router)
app.include_router(satellite_router)
app.include_router(citizen_router)
app.include_router(water_router)
app.include_router(alerts_router)
app.include_router(questions_router)

@app.get("/")
async def root():
    return {
        "portal": "Community River Health Evidence Portal",
        "version": "1.0.0",
        "status": "online",
        "docs_url": "/docs",
        "health_check": "/api/health",
    }
