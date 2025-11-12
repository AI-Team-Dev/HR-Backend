from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.utils.db import get_db
from app.utils.token_utils import require_role
from app.schemas.job import JobCreate, JobOut
from app.models.job import JobDescription

router = APIRouter()


@router.post("/post-job", response_model=JobOut)
def post_job(payload: JobCreate, current=Depends(require_role("hr")), db: Session = Depends(get_db)):
    # Generate JDID from first two letters of JobTitle + zero-padded sequence
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


@router.get("/jobs", response_model=List[JobOut])
def my_jobs(current=Depends(require_role("hr")), db: Session = Depends(get_db), skip: int = 0, limit: int = 20):
    items = (
        db.query(JobDescription)
        .order_by(JobDescription.CreatedAt.desc().nullslast())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return items


# Old application-link endpoints removed; Applications are standalone records keyed by ApplicationID.


# Status management for Applications can be added later if required by your DB schema.
