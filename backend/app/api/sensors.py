"""
Sensor API routes — Sensor inventory and time-series telemetry.
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Sensor, SensorReading
from app.engines.confidence_engine import calculate_freshness
from app.schemas import SensorOut, SensorReadingOut

router = APIRouter(prefix="/api/sensors", tags=["sensors"])


@router.get("", response_model=List[SensorOut])
async def list_sensors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all deployed environmental monitoring sensors."""
    sensors = db.query(Sensor).all()
    results = []
    for s in sensors:
        freshness_status = "MISSING"
        if s.last_reading_at:
            f_res = calculate_freshness(s.last_reading_at, "sensor", expected_interval_hours=s.expected_frequency_hours)
            freshness_status = f_res.status
        
        results.append(SensorOut(
            id=s.id,
            sensor_code=s.sensor_code,
            name=s.name,
            location=s.location,
            latitude=s.latitude,
            longitude=s.longitude,
            status=s.status.value if s.status else "ACTIVE",
            expected_frequency_hours=s.expected_frequency_hours,
            installed_at=s.installed_at,
            last_reading_at=s.last_reading_at,
            freshness_status=freshness_status,
        ))
    return results


@router.get("/{sensor_id}", response_model=SensorOut)
async def get_sensor(
    sensor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get metadata for a specific sensor."""
    s = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not s:
        raise HTTPException(404, f"Sensor {sensor_id} not found")
    
    freshness_status = "MISSING"
    if s.last_reading_at:
        f_res = calculate_freshness(s.last_reading_at, "sensor", expected_interval_hours=s.expected_frequency_hours)
        freshness_status = f_res.status

    return SensorOut(
        id=s.id,
        sensor_code=s.sensor_code,
        name=s.name,
        location=s.location,
        latitude=s.latitude,
        longitude=s.longitude,
        status=s.status.value if s.status else "ACTIVE",
        expected_frequency_hours=s.expected_frequency_hours,
        installed_at=s.installed_at,
        last_reading_at=s.last_reading_at,
        freshness_status=freshness_status,
    )


@router.get("/{sensor_id}/readings", response_model=List[SensorReadingOut])
async def get_sensor_readings(
    sensor_id: int,
    hours: Optional[int] = Query(None, description="Number of past hours to fetch"),
    days: Optional[int] = Query(None, description="Number of past days to fetch"),
    limit: int = Query(100, ge=1, le=1000),
    anomalies_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve time-series readings for a sensor with anomaly flags."""
    query = db.query(SensorReading).filter(SensorReading.sensor_id == sensor_id)
    
    if hours:
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        query = query.filter(SensorReading.timestamp >= cutoff)
    elif days:
        cutoff = datetime.utcnow() - timedelta(days=days)
        query = query.filter(SensorReading.timestamp >= cutoff)
    
    if anomalies_only:
        query = query.filter(SensorReading.is_anomaly == True)

    readings = query.order_by(desc(SensorReading.timestamp)).limit(limit).all()
    return readings
