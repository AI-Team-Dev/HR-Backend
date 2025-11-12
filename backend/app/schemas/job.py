from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class JobCreate(BaseModel):
    JobTitle: str
    Company: Optional[str] = None
    Location: Optional[str] = None
    Salary: Optional[str] = None
    Description: Optional[str] = None
    ExperienceRange: Optional[str] = None


class JobOut(BaseModel):
    JDID: str
    JobTitle: str
    Company: Optional[str]
    Location: Optional[str]
    Salary: Optional[str]
    Description: Optional[str]
    CreatedAt: Optional[datetime]
    ExperienceRange: Optional[str]

    class Config:
        from_attributes = True
