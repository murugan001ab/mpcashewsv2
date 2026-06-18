from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_NAME: str = "MPCashews"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-in-production"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/mpcashews_db"
    DATABASE_ECHO: bool = False

    # JWT
    JWT_SECRET_KEY: str = "jwt-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    # Razorpay
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # Shiprocket
    SHIPROCKET_EMAIL: str = ""
    SHIPROCKET_PASSWORD: str = ""
    SHIPROCKET_API_URL: str = "https://apiv2.shiprocket.in/v1/external"

    # File Upload
    UPLOAD_DIR: str = "static/uploads"
    MAX_FILE_SIZE_MB: int = 5

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # WhatsApp Business Cloud API (Meta)
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WA_TEMPLATE_ORDER_CONFIRMED: str = "order_confirmed"
    WA_TEMPLATE_ORDER_SHIPPED: str = "order_shipped"
    WA_TEMPLATE_ORDER_CANCELLED: str = "order_cancelled"
    WA_TEMPLATE_ORDER_DELIVERED: str = "order_delivered"
    WA_TEMPLATE_ORDER_OUT_DELIVERY: str = "order_out_for_delivery"
    WA_TEMPLATE_OTP: str = "otp_verification"
    WA_TEMPLATE_LANGUAGE: str = "en"
    OTP_EXPIRE_MINUTES: int = 10

    # Email (SMTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "MPCashews"
    EMAIL_VERIFY_EXPIRE_HOURS: int = 24
    FRONTEND_URL: str = "http://localhost:3000"

    # ---------------------------------------------------------------------------
    # CORS / Cookie
    #
    # FRONTEND_ORIGINS  — explicit list of allowed frontend origins.
    #                     Must be explicit (no "*") when allow_credentials=True.
    #
    # COOKIE_SECURE     — set True in production (HTTPS only).
    #                     Keep False only for local HTTP dev.
    #
    # COOKIE_SAMESITE   — "lax" works for same-site + top-level navigations.
    #                     Use "none" only if frontend and backend are on
    #                     different domains AND COOKIE_SECURE=True.
    #
    # COOKIE_DOMAIN     — leave empty for localhost dev; set to ".yourdomain.com"
    #                     in prod so the cookie is shared across subdomains.
    # ---------------------------------------------------------------------------
    FRONTEND_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]
    COOKIE_DOMAIN: str = ""          # empty = omit domain attr (correct for localhost)
    COOKIE_SECURE: bool = False       # set True in production
    COOKIE_SAMESITE: str = "lax"

    # Legacy alias kept so existing .env files don't break
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    @field_validator("FRONTEND_ORIGINS", mode="before")
    @classmethod
    def assemble_frontend_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        return v


settings = Settings()
