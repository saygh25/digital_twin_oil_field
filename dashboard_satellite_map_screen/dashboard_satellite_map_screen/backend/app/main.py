from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.gis import router as gis_router

app = FastAPI(
    title="Baghewala Satellite GIS Digital Twin Microservice",
    version="1.0.0",
    description="Standalone GIS, Field Facilities, Pipelines, and Subsurface Telemetry API"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(gis_router)

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": "Baghewala GIS Satellite Twin API",
        "field": "Baghewala Heavy Oil Field (Rajasthan)",
        "wells_count": 30
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8003, reload=True)
