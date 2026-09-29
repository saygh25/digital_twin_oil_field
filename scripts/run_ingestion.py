"""
Script to trigger full ingestion of raw CSV datasets into the database.
"""
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path("backend").resolve()))

from app.db.session import SessionLocal, engine, Base
import app.db.models  # Register all models
from app.ingestion.importer import import_all_raw_datasets

def main():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("Starting data ingestion from data/raw/ ...")
        stats = import_all_raw_datasets(db, data_dir="data/raw")
        print("Ingestion results:")
        for k, v in stats.items():
            print(f"  - {k}: {v}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
