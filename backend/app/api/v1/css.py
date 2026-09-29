"""
CSS (Cyclic Steam Stimulation) API Router (FR-17..FR-20).
"""
from typing import List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Well, CSSCycle
from app.schemas.domain import CSSCycleBase, CSSCycleCreate, CSSCycleResponse
from app.optimization.joint.optimizer import optimize_joint_css_srp

router = APIRouter()


@router.get("/{well_id}/css", response_model=List[CSSCycleResponse])
def get_css_history(well_id: str, db: Session = Depends(get_db)):
    """Retrieve historical CSS cycles for a well."""
    from app.db.session import resolve_well
    well = resolve_well(well_id, db)
    if not well:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Well not found")

    w_id = well.well_id
    cycles = db.query(CSSCycle).filter(CSSCycle.well_id == w_id).order_by(CSSCycle.cycle_number.asc()).all()
    
    # Auto-seed representative CSS cycles if none exist
    if not cycles:
        sample_cycles = [
            CSSCycle(
                well_id=well_id,
                cycle_number=1,
                injection_volume_tonnes=1800.0,
                injection_pressure_bar=45.0,
                injection_temperature_c=258.0,
                steam_quality_fraction=0.80,
                injection_duration_days=18.0,
                soak_duration_days=10.0,
                production_duration_days=150.0,
                cumulative_oil_m3=680.0,
                cumulative_water_m3=1420.0,
                peak_oil_rate_m3_day=14.5,
                sor=2.65,
                energy_consumed_gj=4500.0,
                start_date=datetime.utcnow() - timedelta(days=400),
                end_date=datetime.utcnow() - timedelta(days=220),
                status="COMPLETED"
            ),
            CSSCycle(
                well_id=well_id,
                cycle_number=2,
                injection_volume_tonnes=1650.0,
                injection_pressure_bar=42.0,
                injection_temperature_c=255.0,
                steam_quality_fraction=0.82,
                injection_duration_days=16.0,
                soak_duration_days=8.0,
                production_duration_days=140.0,
                cumulative_oil_m3=540.0,
                cumulative_water_m3=1280.0,
                peak_oil_rate_m3_day=12.8,
                sor=3.05,
                energy_consumed_gj=4100.0,
                start_date=datetime.utcnow() - timedelta(days=210),
                end_date=datetime.utcnow() - timedelta(days=45),
                status="COMPLETED"
            ),
            CSSCycle(
                well_id=well_id,
                cycle_number=3,
                injection_volume_tonnes=1500.0,
                injection_pressure_bar=40.0,
                injection_temperature_c=252.0,
                steam_quality_fraction=0.80,
                injection_duration_days=15.0,
                soak_duration_days=7.0,
                production_duration_days=45.0,
                cumulative_oil_m3=290.0,
                cumulative_water_m3=620.0,
                peak_oil_rate_m3_day=11.2,
                sor=3.42,
                energy_consumed_gj=3750.0,
                start_date=datetime.utcnow() - timedelta(days=45),
                end_date=None,
                status="PRODUCING"
            ),
        ]
        for c in sample_cycles:
            db.add(c)
        db.commit()
        cycles = db.query(CSSCycle).filter(CSSCycle.well_id == well_id).order_by(CSSCycle.cycle_number.asc()).all()

    return cycles


@router.post("/{well_id}/css/cycle", response_model=CSSCycleResponse, status_code=status.HTTP_201_CREATED)
def record_css_cycle(well_id: str, cycle_in: CSSCycleBase, db: Session = Depends(get_db)):
    """Record a new or completed CSS cycle."""
    cycle = CSSCycle(well_id=well_id, **cycle_in.model_dump())
    db.add(cycle)
    db.commit()
    db.refresh(cycle)
    return cycle


from pydantic import BaseModel


class OptimizeCssRequest(BaseModel):
    current_spm: float = 4.2
    current_stroke_m: float = 2.2
    current_steam_tonnes: float = 1600.0
    days_into_cycle: float = 45.0
    w1_sor: float = 0.25
    w2_energy: float = 0.20
    w3_risk: float = 0.35
    w4_production: float = 0.20
    candidate_steam_tonnes: float | None = None
    soak_days: float = 7.0


@router.post("/{well_id}/css/optimize")
def optimize_css(
    well_id: str,
    payload: OptimizeCssRequest = None,
    db: Session = Depends(get_db)
):
    """Evaluate and optimize upcoming CSS injection and SRP parameters."""
    kwargs = {}
    if payload:
        kwargs = {k: v for k, v in payload.model_dump().items() if v is not None}
    res = optimize_joint_css_srp(well_id=well_id, **kwargs)
    return res
