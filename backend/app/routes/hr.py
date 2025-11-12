from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.utils.db import get_db
from app.utils.token_utils import require_role
from app.schemas.job import JobCreate, JobOut
from app.models.job import JobDescription
from app.models.application import Application
from app.models.education import Education
from app.models.experience import Experience
from app.models.certification import Certification
from app.models.parsed_resume import ParsedResume

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


# ----- Read-only access for HR to Applications and related tables -----
@router.get("/applications")
def list_applications(email: Optional[str] = Query(None), db: Session = Depends(get_db), current=Depends(require_role("hr"))):
    query = db.query(Application)
    if email:
        query = query.filter(Application.Email == email.lower())
    items = query.order_by(Application.SubmissionDate.desc().nullslast()).all()
    return [
        {
            "ApplicationID": a.ApplicationID,
            "FullName": a.FullName,
            "Email": a.Email,
            "SubmissionDate": a.SubmissionDate,
            "HasExperience": a.HasExperience,
            "CurrentLocation": a.CurrentLocation,
            "PreferredLocation": a.PreferredLocation,
        }
        for a in items
    ]


@router.get("/applications/{application_id}")
def get_application(application_id: str, db: Session = Depends(get_db), current=Depends(require_role("hr"))):
    a = db.query(Application).filter(Application.ApplicationID == application_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Application not found")
    return {
        "ApplicationID": a.ApplicationID,
        "FullName": a.FullName,
        "Email": a.Email,
        "LinkedInURL": a.LinkedInURL,
        "WebsitePortfolio": a.WebsitePortfolio,
        "Phone": a.Phone,
        "ServingDays": a.ServingDays,
        "SubmissionDate": a.SubmissionDate,
        "HasExperience": a.HasExperience,
        "NoticePeriod": a.NoticePeriod,
        "LastWorkingDay": a.LastWorkingDay,
        "CurrentLocation": a.CurrentLocation,
        "PreferredLocation": a.PreferredLocation,
        "HasResume": bool(a.Resume),
    }


@router.get("/applications/{application_id}/education")
def hr_list_education(application_id: str, db: Session = Depends(get_db), current=Depends(require_role("hr"))):
    rows = db.query(Education).filter(Education.ApplicationID == application_id).all()
    return [
        {
            "id": r.id,
            "Institute": r.Institute,
            "Level": r.Level,
            "CGPA_Percentage": float(r.CGPA_Percentage) if r.CGPA_Percentage is not None else None,
            "StartDate": r.StartDate,
            "EndDate": r.EndDate,
        }
        for r in rows
    ]


@router.get("/applications/{application_id}/experience")
def hr_list_experience(application_id: str, db: Session = Depends(get_db), current=Depends(require_role("hr"))):
    rows = db.query(Experience).filter(Experience.ApplicationID == application_id).all()
    return [
        {
            "id": r.id,
            "CompanyName": r.CompanyName,
            "Role": r.Role,
            "StartMonthYear": r.StartMonthYear,
            "EndMonthYear": r.EndMonthYear,
        }
        for r in rows
    ]


@router.get("/applications/{application_id}/certification")
def hr_list_certification(application_id: str, db: Session = Depends(get_db), current=Depends(require_role("hr"))):
    rows = db.query(Certification).filter(Certification.ApplicationID == application_id).all()
    return [
        {
            "id": r.id,
            "Issuer": r.Issuer,
            "CertificationName": r.CertificationName,
            "EndDate": r.EndDate,
        }
        for r in rows
    ]


@router.get("/parsed-resume")
def list_parsed_resume(JDID: Optional[str] = Query(None), db: Session = Depends(get_db), current=Depends(require_role("hr"))):
    query = db.query(ParsedResume)
    if JDID:
        query = query.filter(ParsedResume.JDID == JDID)
    rows = query.all()
    return [
        {
            "JDID": r.JDID,
            "candidate_name": r.candidate_name,
            "email": r.email,
            "phone": r.phone,
            "linkedin": r.linkedin,
            "github": r.github,
            "match_id": r.match_id,
            "timestamp": r.timestamp,
            "overall_match_score": r.overall_match_score,
            "match_percentage": r.match_percentage,
            "match_level": r.match_level,
            "recommendation": r.recommendation,
            "matched_skills": r.matched_skills,
            "missing_skills": r.missing_skills,
            "final_recommendation_status": r.final_recommendation_status,
        }
        for r in rows
    ]
