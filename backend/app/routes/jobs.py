from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.utils.db import get_db
from app.models.job import JobDescription
from app.schemas.job import JobOut, JobCreate
from app.utils.token_utils import require_role

router = APIRouter()


@router.get("/jobs", response_model=List[JobOut])
def public_jobs(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(default=None, description="search by title or location"),
    location: Optional[str] = Query(default=None),
    skip: int = 0,
    limit: int = 20,
):
    query = db.query(JobDescription)
    if q:
        like = f"%{q}%"
        query = query.filter((JobDescription.JobTitle.ilike(like)) | (JobDescription.Location.ilike(like)))
    if location:
        query = query.filter(JobDescription.Location.ilike(f"%{location}%"))
    items = query.order_by(JobDescription.CreatedAt.desc().nullslast()).offset(skip).limit(limit).all()
    return items


@router.post("/jobs", response_model=JobOut)
def create_job_public(payload: JobCreate, current=Depends(require_role("hr")), db: Session = Depends(get_db)):
    prefix = (payload.JobTitle[:2] if payload.JobTitle else "JD").upper()
    last = (
        db.query(JobDescription.JDID)
        .filter(JobDescription.JDID.like(f"{prefix}%"))
        .order_by(JobDescription.JDID.desc())
        .first()
    )
    if last:
        try:
            next_num = int(last[0][2:]) + 1
        except ValueError:
            next_num = 1
    else:
        next_num = 1
    jdid = f"{prefix}{next_num:04d}"

    job = JobDescription(
        JDID=jdid,
        JobTitle=payload.JobTitle,
        Company=payload.Company,
        Location=payload.Location,
        Salary=payload.Salary,
        Description=payload.Description,
        ExperienceRange=payload.ExperienceRange,
    )
    db.add(job)
    db.commit()
    return job
