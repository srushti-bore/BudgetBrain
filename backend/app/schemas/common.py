"""
BudgetBrain — Common Pydantic Schemas

SRS §5.2 response envelope:
  Success: { "data": ..., "meta": { "page", "page_size", "total" } }
  Error:   { "error": { "code", "message", "field" } }
"""

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


# ─────────────────────────────────────────────────────────────────────────────
# Pagination
# ─────────────────────────────────────────────────────────────────────────────

class PaginationParams(BaseModel):
    """Query parameters for paginated list endpoints."""
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class PaginatedMeta(BaseModel):
    """Metadata included in paginated list responses."""
    page: int
    page_size: int
    total: int

    @property
    def total_pages(self) -> int:
        if self.page_size == 0:
            return 0
        return (self.total + self.page_size - 1) // self.page_size


# ─────────────────────────────────────────────────────────────────────────────
# Response Envelopes
# ─────────────────────────────────────────────────────────────────────────────

class DataResponse(BaseModel, Generic[T]):
    """
    Standard success response for single-item endpoints.
    { "data": <item> }
    """
    data: T


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Standard success response for list endpoints.
    { "data": [...], "meta": { "page", "page_size", "total" } }
    """
    data: list[T]
    meta: PaginatedMeta


# ─────────────────────────────────────────────────────────────────────────────
# Error Envelope
# ─────────────────────────────────────────────────────────────────────────────

class ErrorDetail(BaseModel):
    code: str
    message: str
    field: str | None = None


class ErrorResponse(BaseModel):
    """
    Standard error response envelope.
    { "error": { "code", "message", "field" } }
    """
    error: ErrorDetail
