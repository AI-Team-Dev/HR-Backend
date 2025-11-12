from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Optional
from datetime import date


class EducationIn(BaseModel):
    degree: str
    institution: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ExperienceIn(BaseModel):
    company: str
    role: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None


class CertificationIn(BaseModel):
    name: str
    issuing_org: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None


class CandidateProfileIn(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    skills: Optional[str] = None
    educations: Optional[List[EducationIn]] = None
    experiences: Optional[List[ExperienceIn]] = None
    certifications: Optional[List[CertificationIn]] = None


class CandidateOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str]
    address: Optional[str]
    skills: Optional[str]
    model_config = ConfigDict(from_attributes=True)
