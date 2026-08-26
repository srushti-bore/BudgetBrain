"""
BudgetBrain — Categories Router

Endpoints under /api/v1/categories (SRS §5.2).
All business logic is delegated to CategoryService.
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
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
    summary="List all categories",
)
async def list_categories(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-9: Return all user categories with their expense counts, paginated.
    """
    service = CategoryService(db)
    items, total = await service.list_categories(page=page, page_size=page_size)
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
    db: AsyncSession = Depends(get_db),
):
    """
    FR-6: Create a new user-defined category.
    Returns 409 if a category with the same name already exists.
    """
    service = CategoryService(db)
    category = await service.create_category(body)
    return DataResponse(data=category)


@router.get(
    "/{category_id}",
    response_model=DataResponse[CategoryOut],
    summary="Get a category by ID",
)
async def get_category(
    category_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return a single category. Returns 404 if not found."""
    service = CategoryService(db)
    category = await service.get_category(category_id)
    return DataResponse(data=category)


@router.patch(
    "/{category_id}",
    response_model=DataResponse[CategoryOut],
    summary="Rename a category",
)
async def update_category(
    category_id: str,
    body: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    FR-7: Rename an existing category.
    Returns 403 if it's a system category, 409 if name conflicts.
    """
    service = CategoryService(db)
    category = await service.update_category(category_id, body)
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
        description="If true, reassign linked expenses to 'Uncategorized' and delete.",
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-8: Delete a category.
    - Returns 403 for system categories.
    - Returns 409 with expense count if linked expenses exist and force=False.
    - If force=True, reassigns linked expenses to 'Uncategorized' then deletes.
    """
    service = CategoryService(db)
    await service.delete_category(category_id, force=force)
