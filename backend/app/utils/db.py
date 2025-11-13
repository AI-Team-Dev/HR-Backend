from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from urllib.parse import quote_plus
from app.config import get_settings

settings = get_settings()

if settings.db_trusted_connection:
    # Windows Integrated Security (no username/password)
    connection_string = (
        f"mssql+pyodbc://@{settings.db_server}/{settings.db_name}?"
        f"driver={quote_plus(settings.db_driver)}&Trusted_Connection=yes&TrustServerCertificate=yes"
    )
else:
    # SQL Authentication
    connection_string = (
        f"mssql+pyodbc://{quote_plus(settings.db_user)}:{quote_plus(settings.db_password)}@"
        f"{settings.db_server}/{settings.db_name}?driver={quote_plus(settings.db_driver)}&TrustServerCertificate=yes"
    )

engine = create_engine(
    connection_string,
    pool_pre_ping=True,
    fast_executemany=True,
    use_setinputsizes=False,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
