import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())[:8]
        start = time.perf_counter()

        logger.info(
            f"[{request_id}] → {request.method} {request.url.path} "
            f"client={request.client.host if request.client else 'unknown'}"
        )

        try:
            response = await call_next(request)
        except Exception as exc:
            logger.exception(f"[{request_id}] Unhandled exception: {exc}")
            raise

        duration_ms = (time.perf_counter() - start) * 1000
        logger.info(
            f"[{request_id}] ← {response.status_code} {request.method} "
            f"{request.url.path} {duration_ms:.1f}ms"
        )
        response.headers["X-Request-ID"] = request_id
        return response
