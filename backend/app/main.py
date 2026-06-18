import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine, Base
from app.middleware.logging import LoggingMiddleware
from app.middleware.rate_limit import limiter, rate_limit_handler
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting MPCashews Backend...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified.")
    yield
    logger.info("Shutting down MPCashews Backend...")
    await engine.dispose()


def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.APP_NAME,
        description="Production-ready E-Commerce API for MPCashews",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # Rate limiter
    application.state.limiter = limiter
    application.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Session middleware (needed for OAuth state)
    application.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

    # ---------------------------------------------------------------------------
    # CORS
    #
    # allow_credentials=True is REQUIRED for the browser to include HttpOnly
    # cookies in cross-origin requests.  When this is True, allow_origins must
    # list explicit origins — the wildcard "*" is not allowed by the spec.
    # ---------------------------------------------------------------------------
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.FRONTEND_ORIGINS,
        allow_credentials=True,   # ← lets the browser send HttpOnly cookies
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Set-Cookie"],
    )

    # Custom logging middleware
    application.add_middleware(LoggingMiddleware)

    # Static files
    application.mount("/static", StaticFiles(directory="static"), name="static")

    # API Router
    application.include_router(api_router, prefix="/api/v1")

    @application.get("/health", tags=["Health"])
    async def health_check():
        return {"status": "healthy", "app": settings.APP_NAME}

    return application


app = create_application()
