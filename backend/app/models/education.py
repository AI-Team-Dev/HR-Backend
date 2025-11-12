from sqlalchemy import Column, Integer, String, Date, ForeignKey, Numeric
from .base import Base


class Education(Base):
    __tablename__ = "Education"

    id = Column(Integer, primary_key=True, index=True)
    ApplicationID = Column(String(20), ForeignKey("Applications.ApplicationID", ondelete="CASCADE"), nullable=False)
    Institute = Column(String(255), nullable=False)
    Level = Column(String(100), nullable=True)
    CGPA_Percentage = Column(Numeric(5, 2), nullable=True)
    StartDate = Column(Date, nullable=True)
    EndDate = Column(Date, nullable=True)
