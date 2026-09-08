"""
Citizen Observation & Validation API routes.
Allows community residents to submit ground observations and volunteers to validate them.
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models import (
    User, UserRole, CitizenObservation, ValidationRecord,
    VerificationStatus, AuditLog,
)
from app.schemas import (
    CitizenObservationCreate, CitizenObservationOut,
    ValidationCreate, ValidationOut,
)

router = APIRouter(prefix="/api", tags=["citizen-observations"])


@router.get("/citizen-observations", response_model=List[CitizenObservationOut])
async def list_citizen_observations(
    status: Optional[str] = Query(None, description="PENDING, VALIDATED, PARTIALLY_VALIDATED, REJECTED"),
    condition: Optional[str] = Query(None, description="GOOD, MODERATE, POOR"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve community-submitted environmental observations."""
    query = db.query(CitizenObservation)
    if status:
        query = query.filter(CitizenObservation.verification_status == status)
    if condition:
        query = query.filter(CitizenObservation.overall_condition == condition)

    observations = query.order_by(desc(CitizenObservation.timestamp)).limit(limit).all()
    results = []
    for o in observations:
        user = db.query(User).filter(User.id == o.user_id).first()
        results.append(CitizenObservationOut(
            id=o.id,
            user_id=o.user_id,
            username=user.username if user else f"User #{o.user_id}",
            timestamp=o.timestamp,
            location=o.location,
            latitude=o.latitude,
            longitude=o.longitude,
            water_color=o.water_color,
            smell=o.smell,
            visible_waste=o.visible_waste,
            algae_presence=o.algae_presence,
            fish_activity=o.fish_activity,
            photo_reference=o.photo_reference,
            user_comment=o.user_comment,
            overall_condition=o.overall_condition,
            confidence=o.confidence or 0.7,
            verification_status=o.verification_status.value if o.verification_status else "PENDING",
        ))
    return results


@router.post("/citizen-observations", response_model=CitizenObservationOut)
async def create_citizen_observation(
    payload: CitizenObservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a new citizen environmental observation."""
    obs = CitizenObservation(
        user_id=current_user.id,
        timestamp=datetime.utcnow(),
        location=payload.location,
        latitude=payload.latitude,
        longitude=payload.longitude,
        water_color=payload.water_color,
        smell=payload.smell,
        visible_waste=payload.visible_waste,
        algae_presence=payload.algae_presence,
        fish_activity=payload.fish_activity,
        photo_reference=payload.photo_reference,
        user_comment=payload.user_comment,
        overall_condition=payload.overall_condition,
        confidence=payload.confidence,
        verification_status=VerificationStatus.PENDING,
    )
    db.add(obs)
    db.commit()
    db.refresh(obs)

    # Log audit entry
    db.add(AuditLog(
        user_id=current_user.id,
        action="CREATE_CITIZEN_OBSERVATION",
        resource_type="citizen_observation",
        resource_id=obs.id,
        details=f"Observation submitted for {obs.location}: condition={obs.overall_condition}",
    ))
    db.commit()

    return CitizenObservationOut(
        id=obs.id,
        user_id=obs.user_id,
        username=current_user.username,
        timestamp=obs.timestamp,
        location=obs.location,
        latitude=obs.latitude,
        longitude=obs.longitude,
        water_color=obs.water_color,
        smell=obs.smell,
        visible_waste=obs.visible_waste,
        algae_presence=obs.algae_presence,
        fish_activity=obs.fish_activity,
        photo_reference=obs.photo_reference,
        user_comment=obs.user_comment,
        overall_condition=obs.overall_condition,
        confidence=obs.confidence,
        verification_status=obs.verification_status.value,
    )


@router.get("/validation", response_model=List[ValidationOut])
async def list_validations(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List validation ground-truth records."""
    records = db.query(ValidationRecord).order_by(desc(ValidationRecord.validation_date)).limit(limit).all()
    results = []
    for r in records:
        val_user = db.query(User).filter(User.id == r.validator_id).first()
        results.append(ValidationOut(
            id=r.id,
            observation_id=r.observation_id,
            validator_id=r.validator_id,
            validator_name=val_user.full_name or val_user.username if val_user else f"Volunteer #{r.validator_id}",
            validation_date=r.validation_date,
            validation_status=r.validation_status.value if r.validation_status else "VALIDATED",
            validation_score=r.validation_score,
            notes=r.notes,
        ))
    return results


@router.post("/validation", response_model=ValidationOut)
async def create_validation(
    payload: ValidationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.VOLUNTEER, UserRole.ADMIN, UserRole.ANALYST)),
):
    """
    Validate a citizen observation. Requires VOLUNTEER, ADMIN, or ANALYST role.
    """
    obs = db.query(CitizenObservation).filter(CitizenObservation.id == payload.observation_id).first()
    if not obs:
        raise HTTPException(404, f"Citizen observation {payload.observation_id} not found")

    try:
        new_status = VerificationStatus(payload.validation_status)
    except ValueError:
        raise HTTPException(400, f"Invalid status {payload.validation_status}. Choose from VALIDATED, PARTIALLY_VALIDATED, REJECTED")

    # Update observation status
    obs.verification_status = new_status

    val_record = ValidationRecord(
        observation_id=obs.id,
        validator_id=current_user.id,
        validation_date=datetime.utcnow(),
        validation_status=new_status,
        validation_score=payload.validation_score,
        notes=payload.notes,
    )
    db.add(val_record)
    db.commit()
    db.refresh(val_record)

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="VALIDATE_OBSERVATION",
        resource_type="validation_record",
        resource_id=val_record.id,
        details=f"Observation {obs.id} marked as {new_status.value} by {current_user.username}",
    ))
    db.commit()

    return ValidationOut(
        id=val_record.id,
        observation_id=val_record.observation_id,
        validator_id=val_record.validator_id,
        validator_name=current_user.full_name or current_user.username,
        validation_date=val_record.validation_date,
        validation_status=val_record.validation_status.value,
        validation_score=val_record.validation_score,
        notes=val_record.notes,
    )
