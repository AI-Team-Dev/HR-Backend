from pydantic import BaseModel, EmailStr
from typing import Optional


class SignupAdmin(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    company_name: Optional[str] = None


class SignupApplicant(BaseModel):
    FullName: str
    Email: EmailStr
    Password: str


class LoginSchema(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
