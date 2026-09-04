"""
BudgetBrain — Expense Pydantic Schemas

Request/response shapes for /api/v1/expenses endpoints.
"""

from datetime import date as dt_date, datetime, timedelta
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.models.expense import ExpenseMood, PaymentMode


class ExpenseCreate(BaseModel):
    """Request body for POST /expenses."""
    title: str = Field(..., min_length=1, max_length=50)
    amount: Decimal = Field(..., gt=0, decimal_places=2, description="Must be > 0 (INR)")
    category_id: str = Field(..., description="UUID of an existing category")
    date: dt_date = Field(..., description="Expense date — cannot be in the future")
    notes: str | None = Field(default=None, max_length=1000)
    payment_mode: PaymentMode | None = Field(default=None)
    mood: ExpenseMood | None = Field(default=None, description="Optional emotional state: happy | normal | sad | stressed | excited")
    is_recurring: bool = Field(default=False)

    @field_validator("date")
    @classmethod
    def date_not_in_future(cls, v: dt_date) -> dt_date:
        max_allowed = dt_date.today() + timedelta(days=1)
        if v > max_allowed:
            raise ValueError("Expense date cannot be in the future.")
        return v

    @field_validator("title")
    @classmethod
    def format_and_strip_title(cls, v: str) -> str:
        s = v.strip()
        if not s:
            return s
        return s[0].upper() + s[1:]


class ExpenseUpdate(BaseModel):
    """Request body for PATCH /expenses/{id} — all fields optional."""
    title: str | None = Field(default=None, min_length=1, max_length=50)
    amount: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    category_id: str | None = Field(default=None)
    date: dt_date | None = Field(default=None)
    notes: str | None = Field(default=None, max_length=1000)
    payment_mode: PaymentMode | None = Field(default=None)
    mood: ExpenseMood | None = Field(default=None, description="Optional emotional state: happy | normal | sad | stressed | excited")
    is_recurring: bool | None = Field(default=None)

    @field_validator("title")
    @classmethod
    def format_and_strip_title(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if not s:
            return s
        return s[0].upper() + s[1:]

    @field_validator("date")
    @classmethod
    def date_not_in_future(cls, v: dt_date | None) -> dt_date | None:
        if v is not None:
            max_allowed = dt_date.today() + timedelta(days=1)
            if v > max_allowed:
                raise ValueError("Expense date cannot be in the future.")
        return v


class ExpenseOut(BaseModel):
    """Response schema for a single expense."""
    id: str
    title: str
    amount: Decimal
    category_id: str
    category_name: str | None = None   # Populated via join in service layer
    date: dt_date
    notes: str | None
    payment_mode: str | None
    mood: str | None = None
    is_recurring: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ExpenseFilters(BaseModel):
    """
    Query parameters for GET /expenses — search, filter, sort.
    All fields optional; they can be combined (SRS §3.4).
    """
    search: str | None = Field(default=None, description="Search in title and notes")
    category_id: str | None = Field(default=None)
    date_from: dt_date | None = Field(default=None)
    date_to: dt_date | None = Field(default=None)
    amount_min: Decimal | None = Field(default=None, ge=0)
    amount_max: Decimal | None = Field(default=None, ge=0)
    payment_mode: PaymentMode | None = Field(default=None)
    mood: ExpenseMood | None = Field(default=None)
    is_recurring: bool | None = Field(default=None)
    sort_by: str | None = Field(
        default="date",
        pattern="^(amount|date|category)$",
        description="Sort field: amount | date | category",
    )
    sort_order: str | None = Field(
        default="desc",
        pattern="^(asc|desc)$",
    )
