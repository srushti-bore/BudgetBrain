"""
BudgetBrain — Budget Pydantic Schemas

Request/response shapes for /api/v1/budgets endpoints.
"""

import enum
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.models.budget import PeriodType


class BudgetCreate(BaseModel):
    """
    Request body for POST /budgets.
    category_id = None → overall monthly budget.
    category_id = UUID → per-category budget.
    """
    category_id: str | None = Field(
        default=None,
        description="Category UUID for per-category budget; null for overall budget.",
    )
    period_type: PeriodType = Field(default=PeriodType.MONTHLY)
    period_start: date | None = Field(
        default=None,
        description="Start date of the budget period (defaults to 1st of current month).",
    )
    limit_amount: Decimal = Field(..., gt=0, decimal_places=2)

    @field_validator("period_start", mode="before")
    @classmethod
    def default_period_start(cls, v):
        if v is None or v == "":
            today = date.today()
            return date(today.year, today.month, 1)
        return v


class BudgetUpdate(BaseModel):
    """Request body for PATCH /budgets/{id}."""
    limit_amount: Decimal = Field(..., gt=0, decimal_places=2)


class BudgetStatus(str, enum.Enum):
    ON_TRACK = "on_track"
    NEAR_LIMIT = "near_limit"
    OVER_BUDGET = "over_budget"


class BudgetOut(BaseModel):
    """Response schema for a single budget, including live tracking fields."""
    id: str
    category_id: str | None
    category_name: str | None = None   # Populated via join
    period_type: str
    period_start: date
    limit_amount: Decimal
    # Live tracking — computed in service layer
    spent_amount: Decimal = Decimal("0.00")
    remaining_amount: Decimal = Decimal("0.00")
    status: str = BudgetStatus.ON_TRACK   # on_track | near_limit | over_budget
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
