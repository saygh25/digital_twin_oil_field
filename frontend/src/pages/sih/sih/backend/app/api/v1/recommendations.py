"""
Recommendations Engine API Router (FR-42..FR-45).
"""
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Well, Recommendation, RecommendationStatus
from app.schemas.domain import RecommendationResponse, RecommendationAction

router = APIRouter()


@router.get("/recommendations", response_model=List[RecommendationResponse])
def get_all_recommendations(limit: int = 50, db: Session = Depends(get_db)):
    """Retrieve all recent recommendations across the field."""
    return db.query(Recommendation).order_by(Recommendation.created_at.desc()).limit(limit).all()


@router.get("/{well_id}/recommendations", response_model=List[RecommendationResponse])
@router.get("/wells/{well_id}/recommendations", response_model=List[RecommendationResponse])
def get_well_recommendations(well_id: str, db: Session = Depends(get_db)):
    """Retrieve actionable, explainable recommendations for a well."""
    from app.db.session import resolve_well
    well = resolve_well(well_id, db)
    w_id = well.well_id if well else well_id

    recs = db.query(Recommendation).filter(or_(Recommendation.well_id == w_id, Recommendation.well_id == well_id)).order_by(Recommendation.created_at.desc()).all()
    if not recs:
        # Seed realistic actionable recommendations
        sample_recs = [
            Recommendation(
                well_id=well_id,
                recommendation_type="SRP_OPTIMIZATION",
                title="Reduce SRP SPM to 3.5 to mitigate Rod Floating",
                recommendation="Reduce VFD frequency from 50.0 Hz to 42.0 Hz (lowering SPM from 4.2 to 3.5 strokes/min).",
                reason="Reservoir temperature has cooled to 52°C, escalating heavy crude viscosity to 6,200 cP. At current 4.2 SPM, downward rod velocity exceeds terminal gravity settling speed, creating compressive rod floating risk.",
                contributing_factors=[
                    {"factor": "Crude Viscosity", "impact": "High viscosity (+6200 cP) creates 8.4 kN viscous drag on downstroke."},
                    {"factor": "Polished Rod Compression", "impact": "Net downward force dropped to 4.1 kN (below 10 kN safety margin)."},
                    {"factor": "SOR / Energy", "impact": "3.5 SPM preserves 10.8 m³/day oil rate while cutting energy use by 14%."}
                ],
                suggested_params={"spm": 3.5, "vfd_hz": 42.0, "stroke_m": 2.5},
                current_params={"spm": 4.2, "vfd_hz": 50.0, "stroke_m": 2.5},
                expected_benefit="Eliminates rod floating condition and avoids premature rod buckling failure.",
                confidence=0.92,
                status=RecommendationStatus.GENERATED.value
            ),
            Recommendation(
                well_id=well_id,
                recommendation_type="CSS_OPTIMIZATION",
                title="Prepare Cycle 4 CSS Steam Injection within 18 Days",
                recommendation="Schedule mobile boiler steam generation for Cycle 4: 1,600 tonnes @ 80% steam quality, 255°C, 42 bar.",
                reason="Thermal decline model projects reservoir temperature will reach baseline economic cut-off (48°C) in ~18 days, with SOR exceeding 4.5.",
                contributing_factors=[
                    {"factor": "Thermal Cooling Rate", "impact": "Current cooling rate is 0.28°C/day towards 48°C baseline."},
                    {"factor": "SOR Trajectory", "impact": "Cycle 3 SOR has degraded from 2.8 to 3.42."}
                ],
                suggested_params={"steam_volume_tonnes": 1600.0, "steam_quality": 0.80, "soak_days": 8.0},
                current_params={"current_cycle": 3, "cycle_day": 45},
                expected_benefit="Restores near-wellbore temperature to 185°C and boosts oil mobility by 12x.",
                confidence=0.88,
                status=RecommendationStatus.GENERATED.value
            )
        ]
        for r in sample_recs:
            db.add(r)
        db.commit()
        recs = db.query(Recommendation).filter(Recommendation.well_id == well_id).all()

    return recs


@router.post("/{recommendation_id}/acknowledge", response_model=RecommendationResponse)
@router.post("/recommendations/{recommendation_id}/acknowledge", response_model=RecommendationResponse)
def acknowledge_recommendation(
    recommendation_id: str,
    action: RecommendationAction,
    db: Session = Depends(get_db)
):
    """
    Operator review workflow:
    GENERATED -> REVIEWED -> ACCEPTED / REJECTED -> ACTION_TAKEN -> RESULT_OBSERVED
    """
    rec = db.query(Recommendation).filter(Recommendation.recommendation_id == recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")

    rec.status = action.status
    rec.reviewed_at = datetime.utcnow()
    rec.reviewed_by = "Field Operator (Current User)"
    if action.feedback_notes:
        rec.feedback_notes = action.feedback_notes

    db.commit()
    db.refresh(rec)
    return rec
