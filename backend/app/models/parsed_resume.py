from sqlalchemy import Column, String, Integer, DateTime
from .base import Base


class ParsedResume(Base):
    __tablename__ = "ParsedResume"

    # Not specifying a PK since the table may not have one defined; SQLAlchemy can still map it.
    # If an identity/PK exists, add it here later.
    JDID = Column(String(20), nullable=True, index=True)
    candidate_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    linkedin = Column(String(512), nullable=True)
    github = Column(String(512), nullable=True)
    match_id = Column(String(50), nullable=True)
    timestamp = Column(DateTime, nullable=True)
    overall_match_score = Column(Integer, nullable=True)
    match_percentage = Column(Integer, nullable=True)
    match_level = Column(String(50), nullable=True)
    recommendation = Column(String(255), nullable=True)
    matched_skills = Column(String(1024), nullable=True)
    missing_skills = Column(String(1024), nullable=True)
    final_recommendation_status = Column(String(100), nullable=True)
