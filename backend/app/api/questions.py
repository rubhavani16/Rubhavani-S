"""
Questions & Evidence Challenge API routes.
Empowers community residents to question, challenge, or seek clarification on any piece of evidence.
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models import (
    User, UserRole, Question, QuestionType, QuestionStatus, AuditLog,
)
from app.schemas import QuestionCreate, QuestionRespond, QuestionOut

router = APIRouter(prefix="/api/questions", tags=["questions"])


@router.get("", response_model=List[QuestionOut])
async def list_questions(
    evidence_type: Optional[str] = Query(None),
    evidence_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve community questions and challenges."""
    query = db.query(Question)
    if evidence_type:
        query = query.filter(Question.evidence_type == evidence_type)
    if evidence_id:
        query = query.filter(Question.evidence_id == evidence_id)
    if status:
        query = query.filter(Question.status == status)

    questions = query.order_by(desc(Question.created_at)).limit(limit).all()
    results = []
    for q in questions:
        u = db.query(User).filter(User.id == q.user_id).first()
        results.append(QuestionOut(
            id=q.id,
            user_id=q.user_id,
            username=u.username if u else f"User #{q.user_id}",
            evidence_type=q.evidence_type,
            evidence_id=q.evidence_id,
            question_type=q.question_type.value if q.question_type else "OTHER",
            comment=q.comment,
            supporting_observation=q.supporting_observation,
            status=q.status.value if q.status else "OPEN",
            admin_response=q.admin_response,
            created_at=q.created_at,
            resolved_at=q.resolved_at,
        ))
    return results


@router.post("", response_model=QuestionOut)
async def create_question(
    payload: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a question or challenge about any environmental evidence."""
    try:
        q_type = QuestionType(payload.question_type)
    except ValueError:
        q_type = QuestionType.OTHER

    q = Question(
        user_id=current_user.id,
        evidence_type=payload.evidence_type,
        evidence_id=payload.evidence_id,
        question_type=q_type,
        comment=payload.comment,
        supporting_observation=payload.supporting_observation,
        status=QuestionStatus.OPEN,
        created_at=datetime.utcnow(),
    )
    db.add(q)
    db.commit()
    db.refresh(q)

    db.add(AuditLog(
        user_id=current_user.id,
        action="CREATE_QUESTION",
        resource_type="question",
        resource_id=q.id,
        details=f"User {current_user.username} submitted question type {q_type.value} on {payload.evidence_type}",
    ))
    db.commit()

    return QuestionOut(
        id=q.id,
        user_id=q.user_id,
        username=current_user.username,
        evidence_type=q.evidence_type,
        evidence_id=q.evidence_id,
        question_type=q.question_type.value,
        comment=q.comment,
        supporting_observation=q.supporting_observation,
        status=q.status.value,
        admin_response=q.admin_response,
        created_at=q.created_at,
        resolved_at=q.resolved_at,
    )


@router.patch("/{question_id}/respond", response_model=QuestionOut)
async def respond_to_question(
    question_id: int,
    payload: QuestionRespond,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.VOLUNTEER, UserRole.ANALYST)),
):
    """Provide administrative or expert response to a community challenge. Requires ADMIN, VOLUNTEER, or ANALYST."""
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(404, f"Question {question_id} not found")

    try:
        new_status = QuestionStatus(payload.status)
    except ValueError:
        new_status = QuestionStatus.RESOLVED

    q.admin_response = payload.admin_response
    q.status = new_status
    if new_status in [QuestionStatus.RESOLVED, QuestionStatus.REJECTED]:
        q.resolved_at = datetime.utcnow()

    db.commit()
    db.refresh(q)

    db.add(AuditLog(
        user_id=current_user.id,
        action="RESPOND_TO_QUESTION",
        resource_type="question",
        resource_id=q.id,
        details=f"Question {q.id} responded to by {current_user.username} with status {new_status.value}",
    ))
    db.commit()

    u = db.query(User).filter(User.id == q.user_id).first()
    return QuestionOut(
        id=q.id,
        user_id=q.user_id,
        username=u.username if u else f"User #{q.user_id}",
        evidence_type=q.evidence_type,
        evidence_id=q.evidence_id,
        question_type=q.question_type.value,
        comment=q.comment,
        supporting_observation=q.supporting_observation,
        status=q.status.value,
        admin_response=q.admin_response,
        created_at=q.created_at,
        resolved_at=q.resolved_at,
    )
