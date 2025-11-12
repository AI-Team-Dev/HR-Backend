from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.utils.db import get_db
from app.models.job import JobDescription
from app.schemas.job import JobOut

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
