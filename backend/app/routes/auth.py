from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from app.schemas.auth import SignupAdmin, SignupApplicant, LoginSchema, TokenResponse
from app.utils.db import get_db
from app.utils.auth_utils import hash_password, verify_password
from app.utils.token_utils import create_access_token
from app.models.admin_signup import AdminSignup
from app.models.admin_login import AdminLogin
from app.models.candidate_signup import CandidateSignup
from app.models.candidate_login import CandidateLogin

router = APIRouter()


@router.post("/signup/admin", response_model=TokenResponse)
def signup_admin(payload: SignupAdmin, db: Session = Depends(get_db)):
    # Check if email already exists in AdminSignup
    existing = db.query(AdminSignup).filter(AdminSignup.Email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate sequential SignupID like SID001 based on max existing
    last = (
        db.query(AdminSignup.SignupID)
        .filter(AdminSignup.SignupID.like("SID%"))
        .order_by(AdminSignup.SignupID.desc())
        .first()
    )
    if last and last[0][3:].isdigit():
        next_num = int(last[0][3:]) + 1
    else:
        next_num = 1
    signup_id = f"SID{next_num:03d}"

    obj = AdminSignup(
        SignupID=signup_id,
        FullName=f"{payload.first_name} {payload.last_name}".strip(),
        Email=payload.email.lower(),
        Password=payload.password,  # per your schema; plaintext here
        CreatedAt=datetime.utcnow(),
    )
    db.add(obj)
    db.commit()
    token = create_access_token({"sub": signup_id, "role": "hr"})
    return TokenResponse(access_token=token)


# Frontend compatibility: POST /api/signup expects { fullName, email, password, company }
@router.post("/signup", tags=["auth-compat"])
def signup_admin_compat(body: dict, db: Session = Depends(get_db)):
    payload = SignupAdmin(
        first_name=(body.get("fullName") or "").split(" ")[0] or "Admin",
        last_name=" ".join((body.get("fullName") or "").split(" ")[1:]) or "",
        email=body.get("email"),
        password=body.get("password"),
        company_name=body.get("company"),
    )
    token_resp = signup_admin(payload, db)
    return {"token": token_resp.access_token, "user": {"email": payload.email, "role": "HR"}}


@router.post("/signup/applicant", response_model=TokenResponse)
def signup_applicant(payload: SignupApplicant, db: Session = Depends(get_db)):
    # Check if email already exists in CandidateSignup
    existing = db.query(CandidateSignup).filter(CandidateSignup.Email == payload.Email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate sequential SignupID like SID001 based on max existing
    last = (
        db.query(CandidateSignup.SignupID)
        .filter(CandidateSignup.SignupID.like("SID%"))
        .order_by(CandidateSignup.SignupID.desc())
        .first()
    )
    if last and last[0][3:].isdigit():
        next_num = int(last[0][3:]) + 1
    else:
        next_num = 1
    signup_id = f"SID{next_num:03d}"

    obj = CandidateSignup(
        SignupID=signup_id,
        FullName=payload.FullName,
        Email=payload.Email.lower(),
        Password=payload.Password,  # per your schema; stored as plaintext here
        CreatedAt=datetime.utcnow(),
    )
    db.add(obj)
    db.commit()
    
    token = create_access_token({"sub": signup_id, "role": "applicant"})
    return TokenResponse(access_token=token)


@router.post("/login/admin", response_model=TokenResponse)
def login_admin(payload: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(AdminSignup).filter(AdminSignup.Email == payload.email.lower()).first()
    if not user or user.Password != payload.password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    # Log login
    db.add(
        AdminLogin(
            SignupID=user.SignupID,
            EmailID=user.Email,
            PasswordHash=hash_password(payload.password),
            LoginDateTime=datetime.utcnow(),
        )
    )
    db.commit()
    token = create_access_token({"sub": user.SignupID, "role": "hr"})
    return TokenResponse(access_token=token)


@router.post("/login/applicant", response_model=TokenResponse)
def login_applicant(payload: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(CandidateSignup).filter(CandidateSignup.Email == payload.email.lower()).first()
    if not user or user.Password != payload.password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Log login
    db.add(
        CandidateLogin(
            SignupID=user.SignupID,
            EmailID=user.Email,
            PasswordHash=hash_password(payload.password),
            LoginDateTime=datetime.utcnow(),
        )
    )
    db.commit()

    token = create_access_token({"sub": user.SignupID, "role": "applicant"})
    return TokenResponse(access_token=token)
