from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.utils.db import get_db
from app.models.candidate_signup import CandidateSignup
from app.models.admin_signup import AdminSignup

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_token(token)
    user_sub = payload.get("sub")
    role: str = payload.get("role")
    if role == "applicant":
        # Applicant sub is SignupID (string)
        user = db.query(CandidateSignup).filter(CandidateSignup.SignupID == str(user_sub)).first()
    elif role == "hr":
        # HR sub is SignupID (string)
        user = db.query(AdminSignup).filter(AdminSignup.SignupID == str(user_sub)).first()
    else:
        user = None
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return {"role": role, "user": user}


def require_role(required: str):
    async def _dependency(ctx = Depends(get_current_user)):
        if ctx["role"] != required:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return ctx["user"]
    return _dependency
