"""
Wells API endpoints (FR-03, FR-04).
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Well, Reservoir, SRP
from app.schemas.domain import WellCreate, WellUpdate, WellResponse

router = APIRouter()


@router.get("", response_model=List[WellResponse])
def list_wells(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Retrieve all registered wells."""
    wells = db.query(Well).offset(skip).limit(limit).all()
    # Seed default demonstration wells if empty
    if not wells:
        default_reservoir = db.query(Reservoir).filter(Reservoir.name == "Baghewala-Jodhpur-Main").first()
        if not default_reservoir:
            default_reservoir = Reservoir(
                name="Baghewala-Jodhpur-Main",
                field_name="Baghewala",
                formation="Jodhpur Sandstone",
                initial_temperature=48.0,
                initial_pressure=110.0,
                current_temperature=52.0,
                current_pressure=105.0,
                api_gravity=18.2,
                fluid_properties={"dead_oil_viscosity_48c_cp": 8200, "asphaltene_pct": 14.5}
            )
            db.add(default_reservoir)
            db.commit()
            db.refresh(default_reservoir)

        seed_wells = [
            Well(
                well_name="BGW-01",
                location="Baghewala Pad-1",
                latitude=27.5124,
                longitude=71.8902,
                reservoir_id=default_reservoir.reservoir_id,
                status="PRODUCING",
                lift_type="SRP",
                depth_m=1140.0,
                perforation_interval="1115-1138 m",
                completion_data={"casing_od_in": 7.0, "tubing_od_in": 2.875, "pump_depth_m": 1100.0},
                operating_limits={"max_spm": 6.0, "min_spm": 1.5, "max_pprl_kn": 120.0, "max_steam_tonnes": 2500.0}
            ),
            Well(
                well_name="BGW-02",
                location="Baghewala Pad-1",
                latitude=27.5140,
                longitude=71.8918,
                reservoir_id=default_reservoir.reservoir_id,
                status="PRODUCING",
                lift_type="SRP",
                depth_m=1160.0,
                perforation_interval="1130-1155 m",
                completion_data={"casing_od_in": 7.0, "tubing_od_in": 2.875, "pump_depth_m": 1120.0},
                operating_limits={"max_spm": 6.0, "min_spm": 1.5, "max_pprl_kn": 120.0, "max_steam_tonnes": 2500.0}
            ),
            Well(
                well_name="BGW-03",
                location="Baghewala Pad-2",
                latitude=27.5210,
                longitude=71.9012,
                reservoir_id=default_reservoir.reservoir_id,
                status="SOAKING",
                lift_type="SRP",
                depth_m=1155.0,
                perforation_interval="1125-1148 m",
                completion_data={"casing_od_in": 7.0, "tubing_od_in": 2.875, "pump_depth_m": 1110.0},
                operating_limits={"max_spm": 6.0, "min_spm": 1.5, "max_pprl_kn": 120.0, "max_steam_tonnes": 2500.0}
            ),
        ]
        for w in seed_wells:
            db.add(w)
        db.commit()
        wells = db.query(Well).all()

        # Seed default SRP for seed wells
        for w in wells:
            if not w.srp_config:
                srp = SRP(
                    well_id=w.well_id,
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

    return wells


@router.get("/{well_id}", response_model=WellResponse)
def get_well(well_id: str, db: Session = Depends(get_db)):
    """Get single well details by well_id or well_name."""
    from sqlalchemy import or_
    well = db.query(Well).filter(or_(Well.well_id == well_id, Well.well_name == well_id)).first()
    if not well:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Well with ID {well_id} not found")
    return well


@router.post("", response_model=WellResponse, status_code=status.HTTP_201_CREATED)
def create_well(well_in: WellCreate, db: Session = Depends(get_db)):
    """Register a new well."""
    existing = db.query(Well).filter(Well.well_name == well_in.well_name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Well with name {well_in.well_name} already exists")
    
    well = Well(**well_in.model_dump())
    db.add(well)
    db.commit()
    db.refresh(well)
    return well


@router.put("/{well_id}", response_model=WellResponse)
def update_well(well_id: str, well_in: WellUpdate, db: Session = Depends(get_db)):
    """Update well configuration or operating limits."""
    from sqlalchemy import or_
    well = db.query(Well).filter(or_(Well.well_id == well_id, Well.well_name == well_id)).first()
    if not well:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Well with ID {well_id} not found")

    update_data = well_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(well, field, val)

    db.commit()
    db.refresh(well)
    return well
