import math
from typing import TypeVar, Generic, List
from pydantic import BaseModel

T = TypeVar("T")


def paginate(total: int, page: int, page_size: int) -> dict:
    pages = math.ceil(total / page_size) if page_size else 1
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


def get_skip_limit(page: int, page_size: int):
    skip = (page - 1) * page_size
    return skip, page_size
