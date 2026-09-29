"""
SRP (Sucker Rod Pump) API Router (FR-21..FR-23, FR-36..FR-38).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Well, SRP
from app.schemas.domain import SRPResponse, SRPBase
from app.optimization.joint.optimizer import optimize_joint_css_srp

router = APIRouter()


@router.get("/{well_id}/srp", response_model=SRPResponse)
def get_srp_config(well_id: str, db: Session = Depends(get_db)):
    """Get active SRP configuration for a well."""
    from app.db.session import resolve_well
    well = resolve_well(well_id, db)
    w_id = well.well_id if well else well_id

    srp = db.query(SRP).filter(SRP.well_id == w_id).first()
    if not srp:
        srp = SRP(
            well_id=w_id,
            stroke_length_m=2.5,
            spm=4.2,
            vfd_frequency_hz=50.0,
            pump_depth_m=1100.0,
            pump_diameter_mm=57.0,
            motor_rating_kw=30.0,
            motor_load_percent=68.0
        )
        db.add(srp)
        db.commit()
        db.refresh(srp)
    return srp


@router.post("/{well_id}/srp/optimize")
def optimize_srp(well_id: str, db: Session = Depends(get_db)):
    """Run constrained optimization on SRP stroke, SPM, and VFD setting."""
    from app.db.session import resolve_well
    well = resolve_well(well_id, db)
    w_id = well.well_id if well else well_id

    srp = db.query(SRP).filter(SRP.well_id == w_id).first()
    spm = srp.spm if srp else 4.2
    stroke = srp.stroke_length_m if srp else 2.5
    result = optimize_joint_css_srp(well_id=w_id, current_spm=spm, current_stroke_m=stroke)
    return result
