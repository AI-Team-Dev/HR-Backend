from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Body
from sqlalchemy.orm import Session

from app.utils.db import get_db
from app.utils.file_utils import file_to_bytes
from app.utils.token_utils import require_role
from app.models.candidate_signup import CandidateSignup
from app.models.job import JobDescription
from app.models.application import Application
from app.models.education import Education
from app.models.experience import Experience
from app.models.certification import Certification
from app.schemas.job import JobOut

router = APIRouter()


@router.get("/jobs", response_model=List[JobOut])
def list_jobs(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(default=None, description="search by title/location"),
    skip: int = 0,
    limit: int = 20,
):
    query = db.query(JobDescription)
    if q:
        like = f"%{q}%"
        query = query.filter((JobDescription.JobTitle.ilike(like)) | (JobDescription.Location.ilike(like)))
    items = query.order_by(JobDescription.CreatedAt.desc().nullslast()).offset(skip).limit(limit).all()
    return items


@router.get("/applications")
def my_applications(current=Depends(require_role("applicant")), db: Session = Depends(get_db)):
    user: CandidateSignup = current
    apps = db.query(Application).filter(Application.Email == user.Email).all()
    return [
        {
            "ApplicationID": a.ApplicationID,
            "FullName": a.FullName,
            "Email": a.Email,
            "SubmissionDate": a.SubmissionDate,
        }
        for a in apps
    ]


def _next_application_id(db: Session) -> str:
    last = (
        db.query(Application.ApplicationID)
        .filter(Application.ApplicationID.like("AP%"))
        .order_by(Application.ApplicationID.desc())
        .first()
    )
    if last and last[0][2:].isdigit():
        next_num = int(last[0][2:]) + 1
    else:
        next_num = 1
    return f"AP{next_num:04d}"


@router.post("/applications")
async def create_application(
    FullName: str = Form(...),
    Email: str = Form(...),
    LinkedInURL: Optional[str] = Form(None),
    WebsitePortfolio: Optional[str] = Form(None),
    Phone: Optional[str] = Form(None),
    ServingDays: Optional[int] = Form(None),
    HasExperience: Optional[str] = Form(None),
    NoticePeriod: Optional[int] = Form(None),
    LastWorkingDay: Optional[str] = Form(None),  # YYYY-MM-DD
    CurrentLocation: Optional[str] = Form(None),
    PreferredLocation: Optional[str] = Form(None),
    ResumeFile: Optional[UploadFile] = File(None),
    current=Depends(require_role("applicant")),
    db: Session = Depends(get_db),
):
    user: CandidateSignup = current
    if Email.lower() != user.Email.lower():
        raise HTTPException(status_code=400, detail="Email must match logged-in user")

    resume_bytes = await file_to_bytes(ResumeFile) if ResumeFile else None

    app_id = _next_application_id(db)
    obj = Application(
        ApplicationID=app_id,
        FullName=FullName,
        Email=Email.lower(),
        LinkedInURL=LinkedInURL,
        WebsitePortfolio=WebsitePortfolio,
        Phone=Phone,
        ServingDays=ServingDays,
        HasExperience=HasExperience,
        NoticePeriod=NoticePeriod,
        LastWorkingDay=LastWorkingDay,  # SQLAlchemy Date handled if ISO format
        CurrentLocation=CurrentLocation,
        PreferredLocation=PreferredLocation,
        Resume=resume_bytes,
    )
    db.add(obj)
    db.commit()
    return {"ApplicationID": app_id}


# Old save/apply endpoints removed; Applications are standalone records.


# Candidate profile endpoints were tied to Candidate table; skipped in this schema.


# Candidate profile CRUD via Applications/Education/Experience/Certification can be added later as needed.


def _assert_app_ownership(db: Session, email: str, application_id: str) -> Application:
    app = db.query(Application).filter(Application.ApplicationID == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if app.Email.lower() != email.lower():
        raise HTTPException(status_code=403, detail="Forbidden")
    return app


# Education endpoints
@router.get("/applications/{application_id}/education")
def list_education(application_id: str, current=Depends(require_role("applicant")), db: Session = Depends(get_db)):
    user: CandidateSignup = current
    _assert_app_ownership(db, user.Email, application_id)
    rows = db.query(Education).filter(Education.ApplicationID == application_id).all()
    return [
        {
            "id": r.id,
            "ApplicationID": r.ApplicationID,
            "Institute": r.Institute,
            "Level": r.Level,
            "CGPA_Percentage": float(r.CGPA_Percentage) if r.CGPA_Percentage is not None else None,
            "StartDate": r.StartDate,
            "EndDate": r.EndDate,
        }
        for r in rows
    ]


@router.post("/applications/{application_id}/education/bulk")
def upsert_education_bulk(
    application_id: str,
    payload: dict = Body(..., description="{""items"": [education objects]}"),
    current=Depends(require_role("applicant")),
    db: Session = Depends(get_db),
):
    user: CandidateSignup = current
    _assert_app_ownership(db, user.Email, application_id)
    items = payload.get("items") or []
    db.query(Education).filter(Education.ApplicationID == application_id).delete()
    for e in items:
        db.add(Education(
            ApplicationID=application_id,
            Institute=e.get("Institute"),
            Level=e.get("Level"),
            CGPA_Percentage=e.get("CGPA_Percentage"),
            StartDate=e.get("StartDate"),
            EndDate=e.get("EndDate"),
        ))
    db.commit()
    return {"message": "Education updated"}


# Experience endpoints
@router.get("/applications/{application_id}/experience")
def list_experience(application_id: str, current=Depends(require_role("applicant")), db: Session = Depends(get_db)):
    user: CandidateSignup = current
    _assert_app_ownership(db, user.Email, application_id)
    rows = db.query(Experience).filter(Experience.ApplicationID == application_id).all()
    return [
        {
            "id": r.id,
            "ApplicationID": r.ApplicationID,
            "CompanyName": r.CompanyName,
            "Role": r.Role,
            "StartMonthYear": r.StartMonthYear,
            "EndMonthYear": r.EndMonthYear,
        }
        for r in rows
    ]


@router.post("/applications/{application_id}/experience/bulk")
def upsert_experience_bulk(
    application_id: str,
    payload: dict = Body(..., description="{""items"": [experience objects]}"),
    current=Depends(require_role("applicant")),
    db: Session = Depends(get_db),
):
    user: CandidateSignup = current
    _assert_app_ownership(db, user.Email, application_id)
    items = payload.get("items") or []
    db.query(Experience).filter(Experience.ApplicationID == application_id).delete()
    for ex in items:
        db.add(Experience(
            ApplicationID=application_id,
            CompanyName=ex.get("CompanyName"),
            Role=ex.get("Role"),
            StartMonthYear=ex.get("StartMonthYear"),
            EndMonthYear=ex.get("EndMonthYear"),
        ))
    db.commit()
    return {"message": "Experience updated"}


# Certification endpoints
@router.get("/applications/{application_id}/certification")
def list_certification(application_id: str, current=Depends(require_role("applicant")), db: Session = Depends(get_db)):
    user: CandidateSignup = current
    _assert_app_ownership(db, user.Email, application_id)
    rows = db.query(Certification).filter(Certification.ApplicationID == application_id).all()
    return [
        {
            "id": r.id,
            "ApplicationID": r.ApplicationID,
            "Issuer": r.Issuer,
            "CertificationName": r.CertificationName,
            "EndDate": r.EndDate,
        }
        for r in rows
    ]


@router.post("/applications/{application_id}/certification/bulk")
def upsert_certification_bulk(
    application_id: str,
    payload: dict = Body(..., description="{""items"": [certification objects]}"),
    current=Depends(require_role("applicant")),
    db: Session = Depends(get_db),
):
    user: CandidateSignup = current
    _assert_app_ownership(db, user.Email, application_id)
    items = payload.get("items") or []
    db.query(Certification).filter(Certification.ApplicationID == application_id).delete()
    for c in items:
        db.add(Certification(
            ApplicationID=application_id,
            Issuer=c.get("Issuer"),
            CertificationName=c.get("CertificationName"),
            EndDate=c.get("EndDate"),
        ))
    db.commit()
    return {"message": "Certification updated"}


@router.post("/applications/{application_id}/resume")
async def upload_resume(
    application_id: str,
    file: UploadFile = File(...),
    current=Depends(require_role("applicant")),
    db: Session = Depends(get_db),
):
    user: CandidateSignup = current
    app = db.query(Application).filter(Application.ApplicationID == application_id, Application.Email == user.Email).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    content = await file_to_bytes(file)
    app.Resume = content
    db.commit()
    return {"message": "Resume uploaded"}


@router.get("/applications/{application_id}/resume")
def download_resume(application_id: str, current=Depends(require_role("applicant")), db: Session = Depends(get_db)):
    user: CandidateSignup = current
    app = db.query(Application).filter(Application.ApplicationID == application_id, Application.Email == user.Email).first()
    if not app or not app.Resume:
        raise HTTPException(status_code=404, detail="No resume uploaded")
    return {
        "ApplicationID": application_id,
        "ResumeSize": len(app.Resume)
    }
