import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Unified DB Path at project root
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
DB_FILE = ROOT_DIR / "baghewala_twin.db"

db_url = settings.database_url
if "baghewala_twin.db" in db_url or "sqlite" in db_url:
    db_url = f"sqlite:///{DB_FILE.as_posix()}"

connect_args = {}
if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

try:
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        pool_pre_ping=True
    )
    with engine.connect() as conn:
        pass
except Exception:
    sqlite_url = f"sqlite:///{DB_FILE.as_posix()}"
    engine = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a SQLAlchemy database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def resolve_well(well_id: str, db):
    """
    Flexibly resolves well by exact ID, exact name, case-insensitive,
    or short aliases like B-17 -> BGW-SYN-017, B-03 -> BGW-03, etc.
    """
    import re
    from sqlalchemy import or_
    from app.db.models import Well
    if not well_id:
        return db.query(Well).first()
    well = db.query(Well).filter(or_(Well.well_id == well_id, Well.well_name == well_id)).first()
    if well:
        return well
    # Try case-insensitive
    well = db.query(Well).filter(or_(Well.well_id.ilike(well_id), Well.well_name.ilike(well_id))).first()
    if well:
        return well
    # Try matching digits (e.g. B-17 -> 17)
    digits = re.findall(r'\d+', str(well_id))
    if digits:
        target_num = int(digits[-1])
        all_wells = db.query(Well).all()
        for w in all_wells:
            w_digits = re.findall(r'\d+', w.well_id) or re.findall(r'\d+', w.well_name or '')
            if w_digits and int(w_digits[-1]) == target_num:
                return w
    # Fallback: substring match
    clean = str(well_id).replace("-", "").lower()
    for w in db.query(Well).all():
        if clean in w.well_id.replace("-", "").lower() or (w.well_name and clean in w.well_name.replace("-", "").lower()):
            return w
    return db.query(Well).first()

