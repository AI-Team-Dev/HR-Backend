from sqlalchemy import Column, String, DateTime
from .base import Base


class AdminLogin(Base):
    __tablename__ = "AdminLogin"

    SignupID = Column(String(20), nullable=False, index=True)
    EmailID = Column(String(255), nullable=False)
    PasswordHash = Column(String(255), nullable=False)
    LoginDateTime = Column(DateTime, nullable=False)
