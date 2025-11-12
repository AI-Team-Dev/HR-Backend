from sqlalchemy import Column, Integer, String, ForeignKey
from .base import Base


class Experience(Base):
    __tablename__ = "Experience"

    id = Column(Integer, primary_key=True, index=True)
    ApplicationID = Column(String(20), ForeignKey("Applications.ApplicationID", ondelete="CASCADE"), nullable=False)
    CompanyName = Column(String(255), nullable=False)
    Role = Column(String(255), nullable=False)
    StartMonthYear = Column(String(20), nullable=True)
    EndMonthYear = Column(String(20), nullable=True)
