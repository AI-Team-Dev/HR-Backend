from sqlalchemy import Column, String, DateTime
from .base import Base


class CandidateSignup(Base):
    __tablename__ = "CandidateSignup"

    SignupID = Column(String(20), primary_key=True, index=True)
    FullName = Column(String(255), nullable=False)
    Email = Column(String(255), unique=True, nullable=False)
    Password = Column(String(255), nullable=False)
    CreatedAt = Column(DateTime, nullable=True)
