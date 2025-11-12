from sqlalchemy import Column, String, DateTime, Text
from .base import Base


class JobDescription(Base):
    __tablename__ = "JobDescription"

    JDID = Column(String(20), primary_key=True, index=True)
    JobTitle = Column(String(255), nullable=False)
    Company = Column(String(255), nullable=True)
    Location = Column(String(255), nullable=True)
    Salary = Column(String(255), nullable=True)
    Description = Column(Text, nullable=True)
    CreatedAt = Column(DateTime, nullable=True)
    ExperienceRange = Column(String(50), nullable=True)
