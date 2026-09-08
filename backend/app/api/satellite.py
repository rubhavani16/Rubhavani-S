"""
Satellite API routes — Remote sensing Earth observation data.
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, SatelliteObservation
from app.engines.confidence_engine import calculate_freshness
from app.schemas import SatelliteOut

router = APIRouter(prefix="/api/satellite", tags=["satellite"])


@router.get("", response_model=Optional[SatelliteOut])
async def get_latest_satellite(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve the latest usable satellite observation."""
    sat = (
        db.query(SatelliteObservation)
        .filter(SatelliteObservation.is_usable == True)
        .order_by(desc(SatelliteObservation.observation_date))
        .first()
    )
    if not sat:
        return None
    
    f_res = calculate_freshness(sat.observation_date, "satellite")
    res = SatelliteOut.model_validate(sat)
    res.freshness_status = f_res.status
    return res


@router.get("/history", response_model=List[SatelliteOut])
async def list_satellite_history(
    days: int = Query(60, ge=1, le=365),
    usable_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List historical satellite passes."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    query = db.query(SatelliteObservation).filter(SatelliteObservation.observation_date >= cutoff)
    if usable_only:
        query = query.filter(SatelliteObservation.is_usable == True)

    records = query.order_by(desc(SatelliteObservation.observation_date)).all()
    results = []
    for r in records:
        f_res = calculate_freshness(r.observation_date, "satellite")
        out = SatelliteOut.model_validate(r)
        out.freshness_status = f_res.status
        results.append(out)
    return results
