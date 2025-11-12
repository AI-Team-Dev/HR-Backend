import os
from pydantic import Field
from pydantic_settings import BaseSettings
from functools import lru_cache
from pydantic import ValidationError
from pydantic import model_validator


class Settings(BaseSettings):
    app_name: str = "HR ATS Backend"

    db_server: str = Field(..., env="DB_SERVER")
    db_name: str = Field(..., env="DB_NAME")
    db_user: str | None = Field(default=None, env="DB_USER")
    db_password: str | None = Field(default=None, env="DB_PASSWORD")
    db_driver: str = Field(default="ODBC Driver 17 for SQL Server", env="DB_DRIVER")
    db_trusted_connection: bool = Field(default=False, env="DB_TRUSTED_CONNECTION")

    jwt_secret_key: str = Field(..., env="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=60 * 24, env="ACCESS_TOKEN_EXPIRE_MINUTES")

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
        env_file_encoding = "utf-8"

    @model_validator(mode="after")
    def validate_auth_mode(self):
        if not self.db_trusted_connection:
            # SQL auth required
            if not self.db_user or not self.db_password:
                raise ValidationError(
                    [
                        {
                            "loc": ("db_user",),
                            "msg": "db_user is required when DB_TRUSTED_CONNECTION is false",
                            "type": "missing",
                        },
                        {
                            "loc": ("db_password",),
                            "msg": "db_password is required when DB_TRUSTED_CONNECTION is false",
                            "type": "missing",
                        },
                    ],
                    type(self),
                )
        return self


@lru_cache()
def get_settings() -> Settings:
    return Settings()
