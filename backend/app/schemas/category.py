"""
BudgetBrain — Category Pydantic Schemas

Request/response shapes for /api/v1/categories endpoints.
"""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class CategoryCreate(BaseModel):
    """Request body for POST /categories."""
    name: str = Field(..., min_length=1, max_length=50, description="Category name")

    @field_validator("name")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()


class CategoryUpdate(BaseModel):
    """Request body for PATCH /categories/{id}."""
    name: str = Field(..., min_length=1, max_length=50, description="New category name")

    @field_validator("name")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()


class CategoryOut(BaseModel):
    """Response schema for a single category."""
    id: str
    name: str
    is_system: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CategoryWithCountOut(CategoryOut):
    """
    Category response that includes the number of linked expenses.
    Used for FR-9: list categories with expense counts.
    """
    expense_count: int = 0


class CategoryDeleteConflict(BaseModel):
    """
    Returned (409) when deleting a category that has linked expenses.
    The client should display a warning and confirm before force-deleting.
    """
    expense_count: int
    message: str
