from sqlalchemy import Column, String, DateTime, Integer
from .base import Base


class CandidateLogin(Base):
    __tablename__ = "CandidateLogin"

    # multiple logins per SignupID
    id = Column(Integer, primary_key=True, autoincrement=True)
    SignupID = Column(String(20), nullable=False, index=True)
    EmailID = Column(String(255), nullable=False)
    PasswordHash = Column(String(255), nullable=False)
    LoginDateTime = Column(DateTime, nullable=False)

    # Optional synthetic PK if needed by SQLAlchemy; not enforcing here to match DB
    # Consider adding an identity column if required later
