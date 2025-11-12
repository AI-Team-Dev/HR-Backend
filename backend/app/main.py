from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.utils.db import engine
from app.models import base  # noqa: F401
from app import models  # noqa: F401
from app.routes import auth as auth_routes
from app.routes import candidate as candidate_routes
from app.routes import hr as hr_routes
from app.routes import jobs as jobs_routes

app = FastAPI(title="HR ATS Backend", version="1.0.0", openapi_url="/openapi.json")

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables if not present
base.Base.metadata.create_all(bind=engine)

# Routers
app.include_router(auth_routes.router, prefix="/api/auth", tags=["auth"]) 
app.include_router(candidate_routes.router, prefix="/api/candidate", tags=["candidate"]) 
app.include_router(hr_routes.router, prefix="/api/hr", tags=["hr"]) 
app.include_router(jobs_routes.router, prefix="/api", tags=["jobs"]) 


@app.get("/", tags=["health"]) 
async def root():
    return {"status": "ok", "service": "hr-ats-backend"}
