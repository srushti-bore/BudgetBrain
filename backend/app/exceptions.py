"""
BudgetBrain — Custom Exceptions & Global Error Handlers

All exceptions use the SRS-defined error envelope:
  { "error": { "code": str, "message": str, "field": str | None } }
"""

from decimal import Decimal

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


# ─────────────────────────────────────────────────────────────────────────────
# Custom Exception Classes
# ─────────────────────────────────────────────────────────────────────────────

class BudgetBrainException(Exception):
    """Base exception for all BudgetBrain application errors."""

    def __init__(
        self,
        code: str,
        message: str,
        field: str | None = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
    ):
        self.code = code
        self.message = message
        self.field = field
        self.status_code = status_code
        super().__init__(message)


class NotFoundException(BudgetBrainException):
    """Raised when a requested resource does not exist."""

    def __init__(self, resource: str, field: str | None = None):
        super().__init__(
            code="NOT_FOUND",
            message=f"{resource} not found.",
            field=field,
            status_code=status.HTTP_404_NOT_FOUND,
        )


class ConflictException(BudgetBrainException):
    """Raised when an operation conflicts with existing data (e.g. duplicate name)."""

    def __init__(self, message: str, field: str | None = None):
        super().__init__(
            code="CONFLICT",
            message=message,
            field=field,
            status_code=status.HTTP_409_CONFLICT,
        )


class ValidationException(BudgetBrainException):
    """Raised when business-rule validation fails (beyond Pydantic schema validation)."""

    def __init__(self, message: str, field: str | None = None):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            field=field,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )


class SystemCategoryException(BudgetBrainException):
    """Raised when a mutation is attempted on a protected system category."""

    def __init__(self):
        super().__init__(
            code="SYSTEM_CATEGORY",
            message="System categories cannot be modified or deleted.",
            status_code=status.HTTP_403_FORBIDDEN,
        )


class CategoryHasExpensesException(BudgetBrainException):
    """Raised when a category with linked expenses is about to be deleted."""

    def __init__(self, category_name: str, expense_count: int):
        super().__init__(
            code="CATEGORY_HAS_EXPENSES",
            message=(
                f"Category '{category_name}' has {expense_count} linked expense(s). "
                "Confirm to reassign them to 'Uncategorized' and delete the category."
            ),
            status_code=status.HTTP_409_CONFLICT,
        )
        self.expense_count = expense_count


class BudgetExceededException(BudgetBrainException):
    """Raised when an expense would cause monthly spending to exceed the active budget limit."""

    def __init__(self, expense_amount: Decimal, remaining_budget: Decimal, budget_limit: Decimal):
        super().__init__(
            code="BUDGET_EXCEEDED",
            message=(
                f"Transaction blocked: This expense of ₹{expense_amount:,.2f} exceeds your monthly budget. "
                f"Your remaining budget is only ₹{remaining_budget:,.2f} (Budget Cap: ₹{budget_limit:,.2f})."
            ),
            field="amount",
            status_code=status.HTTP_400_BAD_REQUEST,
        )
        self.expense_amount = expense_amount
        self.remaining_budget = remaining_budget
        self.budget_limit = budget_limit


# ─────────────────────────────────────────────────────────────────────────────
# Error Response Helper
# ─────────────────────────────────────────────────────────────────────────────

def error_response(
    code: str,
    message: str,
    field: str | None = None,
    status_code: int = status.HTTP_400_BAD_REQUEST,
) -> JSONResponse:
    """Build a standard SRS error envelope JSON response."""
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message, "field": field}},
    )


# ─────────────────────────────────────────────────────────────────────────────
# Global Exception Handlers — registered in main.py
# ─────────────────────────────────────────────────────────────────────────────

async def budgetbrain_exception_handler(
    request: Request, exc: BudgetBrainException
) -> JSONResponse:
    return error_response(
        code=exc.code,
        message=exc.message,
        field=exc.field,
        status_code=exc.status_code,
    )


async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Catch-all handler — never expose internal details to users."""
    return error_response(
        code="INTERNAL_ERROR",
        message="An unexpected error occurred. Please try again.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the FastAPI app."""
    app.add_exception_handler(BudgetBrainException, budgetbrain_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
