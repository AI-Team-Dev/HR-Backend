from sqlalchemy import Column, String, DateTime, Integer
from .base import Base


class AdminLogin(Base):
    __tablename__ = "AdminLogin"

    id = Column(Integer, primary_key=True, autoincrement=True)
    SignupID = Column(String(20), nullable=False, index=True)
    EmailID = Column(String(255), nullable=False)
    PasswordHash = Column(String(255), nullable=False)
    LoginDateTime = Column(DateTime, nullable=False)
