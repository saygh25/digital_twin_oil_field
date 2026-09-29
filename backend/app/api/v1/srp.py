"""
SRP (Sucker Rod Pump) API Router (FR-21..FR-23, FR-36..FR-38).
"""
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Body
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
def optimize_srp(well_id: str, payload: Optional[Dict[str, Any]] = Body(default={}), db: Session = Depends(get_db)):
    """Run constrained optimization on SRP stroke, SPM, and VFD setting."""
    from app.db.session import resolve_well
    well = resolve_well(well_id, db)
    w_id = well.well_id if well else well_id

    srp = db.query(SRP).filter(SRP.well_id == w_id).first()
    p = payload or {}
    spm = float(p.get("current_spm", srp.spm if srp else 4.2))
    stroke = float(p.get("current_stroke_m", srp.stroke_length_m if srp else 2.5))

    # weights (sor, energy, failure risk, production)
    w1 = float(p.get("w1_sor", p.get("w_sor", 0.25)))
    w2 = float(p.get("w2_energy", p.get("w_energy", 0.20)))
    w3 = float(p.get("w3_risk", p.get("w_risk", 0.35)))
    w4 = float(p.get("w4_production", p.get("w_production", 0.20)))

    spm_min = float(p.get("spm_min", 2.0))
    spm_max = float(p.get("spm_max", 7.5))
    stroke_min = float(p.get("stroke_min", 1.0))
    stroke_max = float(p.get("stroke_max", 2.6))

    spm_bounds = tuple(p.get("spm_bounds", [spm_min, spm_max]))
    stroke_bounds = tuple(p.get("stroke_bounds", [stroke_min, stroke_max]))

    result = optimize_joint_css_srp(
        well_id=w_id,
        current_spm=spm,
        current_stroke_m=stroke,
        w1_sor=w1,
        w2_energy=w2,
        w3_risk=w3,
        w4_production=w4,
        spm_bounds=spm_bounds,
        stroke_bounds=stroke_bounds
    )
    return result


@router.post("/{well_id}/srp/apply")
def apply_srp_setpoint(well_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    """Deploy optimized SPM, stroke length, or VFD frequency to well SRP unit in database & SCADA."""
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

    if "spm" in payload and payload["spm"] is not None:
        srp.spm = round(float(payload["spm"]), 2)
    if "stroke_length_m" in payload and payload["stroke_length_m"] is not None:
        srp.stroke_length_m = round(float(payload["stroke_length_m"]), 2)
    elif "stroke_m" in payload and payload["stroke_m"] is not None:
        srp.stroke_length_m = round(float(payload["stroke_m"]), 2)
    elif "stroke_in" in payload and payload["stroke_in"] is not None:
        srp.stroke_length_m = round(float(payload["stroke_in"]) * 0.0254, 2)
    elif "stroke_length_in" in payload and payload["stroke_length_in"] is not None:
        srp.stroke_length_m = round(float(payload["stroke_length_in"]) * 0.0254, 2)
    if "vfd_frequency_hz" in payload and payload["vfd_frequency_hz"] is not None:
        srp.vfd_frequency_hz = round(float(payload["vfd_frequency_hz"]), 1)
    elif "vfd_hz" in payload and payload["vfd_hz"] is not None:
        srp.vfd_frequency_hz = round(float(payload["vfd_hz"]), 1)

    db.commit()
    db.refresh(srp)
    return {
        "status": "DEPLOYED",
        "well_id": w_id,
        "message": f"Successfully applied setpoints to SRP unit at Well {w_id}: {srp.spm} SPM, {srp.stroke_length_m} m stroke, {srp.vfd_frequency_hz} Hz VFD.",
        "srp": {
            "spm": srp.spm,
            "stroke_length_m": srp.stroke_length_m,
            "vfd_frequency_hz": srp.vfd_frequency_hz,
            "pump_diameter_mm": srp.pump_diameter_mm,
            "motor_rating_kw": srp.motor_rating_kw
        }
    }
