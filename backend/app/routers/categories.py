"""
BudgetBrain — Categories Router (Multi-Tenant)

Endpoints under /api/v1/categories (SRS §5.2).
Protected by JWT authentication; business logic delegated to CategoryService.
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.category import (
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    CategoryWithCountOut,
)
from app.schemas.common import DataResponse, PaginatedMeta, PaginatedResponse
from app.services.category_service import CategoryService

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get(
    "",
    response_model=PaginatedResponse[CategoryWithCountOut],
    summary="List all categories for current user",
)
async def list_categories(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-9: Return all categories for the authenticated user with expense counts.
    """
    service = CategoryService(db)
    items, total = await service.list_categories(
        user_id=current_user.id, page=page, page_size=page_size
    )
    return PaginatedResponse(
        data=items,
        meta=PaginatedMeta(page=page, page_size=page_size, total=total),
    )


@router.post(
    "",
    response_model=DataResponse[CategoryOut],
    status_code=status.HTTP_201_CREATED,
    summary="Create a category",
)
async def create_category(
    body: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-6: Create a new category for the authenticated user.
    """
    service = CategoryService(db)
    category = await service.create_category(body, user_id=current_user.id)
    return DataResponse(data=category)


@router.get(
    "/{category_id}",
    response_model=DataResponse[CategoryOut],
    summary="Get a category by ID",
)
async def get_category(
    category_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return a single category belonging to the authenticated user."""
    service = CategoryService(db)
    category = await service.get_category(category_id, user_id=current_user.id)
    return DataResponse(data=category)


@router.patch(
    "/{category_id}",
    response_model=DataResponse[CategoryOut],
    summary="Rename a category",
)
async def update_category(
    category_id: str,
    body: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-7: Rename an existing user category.
    """
    service = CategoryService(db)
    category = await service.update_category(
        category_id, body, user_id=current_user.id
    )
    return DataResponse(data=category)


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a category",
)
async def delete_category(
    category_id: str,
    force: bool = Query(
        default=False,
        description="Set to true to reassign linked expenses to 'Uncategorized'",
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-8: Delete a category with the warn-and-reassign flow.
    """
    service = CategoryService(db)
    await service.delete_category(
        category_id, user_id=current_user.id, force=force
    )
