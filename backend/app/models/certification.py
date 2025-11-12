from sqlalchemy import Column, Integer, String, Date, ForeignKey
from .base import Base


class Certification(Base):
    __tablename__ = "Certification"

    id = Column(Integer, primary_key=True, index=True)
    ApplicationID = Column(String(20), ForeignKey("Applications.ApplicationID", ondelete="CASCADE"), nullable=False)
    Issuer = Column(String(255), nullable=True)
    CertificationName = Column(String(255), nullable=False)
    EndDate = Column(Date, nullable=True)
