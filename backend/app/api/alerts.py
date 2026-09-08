"""
Alerts API routes.
Surfaces data freshness warnings, sensor anomalies, evidence conflicts, and community achievements.
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models import User, UserRole, Alert, AuditLog
from app.schemas import AlertOut

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=List[AlertOut])
async def list_alerts(
    unresolved_only: bool = Query(False),
    severity: Optional[str] = Query(None, description="INFO, WARNING, CRITICAL"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List system and environmental alerts."""
    query = db.query(Alert)
    if unresolved_only:
        query = query.filter(Alert.is_resolved == False)
    if severity:
        query = query.filter(Alert.severity == severity)
    return query.order_by(desc(Alert.created_at)).limit(limit).all()


@router.patch("/{alert_id}/resolve", response_model=AlertOut)
async def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.VOLUNTEER, UserRole.ADMIN, UserRole.ANALYST)),
):
    """Mark an alert as resolved. Requires VOLUNTEER, ADMIN, or ANALYST role."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(404, f"Alert {alert_id} not found")

    alert.is_resolved = True
    alert.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)

    db.add(AuditLog(
        user_id=current_user.id,
        action="RESOLVE_ALERT",
        resource_type="alert",
        resource_id=alert.id,
        details=f"Alert '{alert.title}' resolved by {current_user.username}",
    ))
    db.commit()

    return alert
