"""
Entry point for the Baghewala Heavy-Oil Digital Twin Backend API.
(CSS + SRP Well-to-Surface Optimization System)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine, Base
import app.db.models  # Ensure all SQLAlchemy models are registered
from app.api.v1 import (
    auth,
    wells,
    digital_twin,
    css,
    srp,
    production,
    predictions,
    anomalies,
    failure_risk,
    recommendations,
    advanced_twin,
)

# Initialize database schema tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Baghewala Heavy-Oil Digital Twin API",
    description="Well-to-surface Digital Twin for Joint CSS and SRP Optimization (Baghewala Field, Jodhpur Sandstone)",
    version="1.0.0",
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication & RBAC"])
app.include_router(wells.router, prefix="/api/wells", tags=["Wells Management"])
app.include_router(digital_twin.router, prefix="/api/wells", tags=["Digital Twin State"])
app.include_router(css.router, prefix="/api/wells", tags=["CSS Management & Optimization"])
app.include_router(srp.router, prefix="/api/wells", tags=["SRP Monitoring & Optimization"])
app.include_router(production.router, prefix="/api/wells", tags=["Production & Forecasting"])
app.include_router(predictions.router, prefix="/api", tags=["Predictions"])
app.include_router(anomalies.router, prefix="/api", tags=["Anomaly Detection"])
app.include_router(failure_risk.router, prefix="/api/wells", tags=["Failure Risk"])
app.include_router(recommendations.router, prefix="/api", tags=["Recommendations & Feedback Loop"])
app.include_router(advanced_twin.router, prefix="/api", tags=["Oil India Advanced Twin"])


@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
def health_check():
    """Liveness probe endpoint."""
    return {
        "status": "healthy",
        "service": "baghewala-digital-twin-backend",
        "field": "Baghewala Field (Rajasthan)",
        "reservoir": "Jodhpur Sandstone (~17-19° API)",
        "version": "1.0.0"
    }
