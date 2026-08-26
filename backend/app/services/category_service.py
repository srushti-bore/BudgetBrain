from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import (
    CategoryHasExpensesException,
    ConflictException,
    NotFoundException,
    SystemCategoryException,
)
from app.repositories.category_repository import CategoryRepository
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate, CategoryWithCountOut


class CategoryService:
    """
    Handles all business logic for categories.
    Delegates DB access to CategoryRepository.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.repo = CategoryRepository(session)

    async def list_categories(
        self, *, page: int = 1, page_size: int = 20
    ) -> tuple[list[CategoryWithCountOut], int]:
        """
        Return paginated categories with their expense counts (FR-9).
        """
        offset = (page - 1) * page_size
        raw_items, total = await self.repo.list_with_expense_counts(
            offset=offset, limit=page_size
        )
        items = [
            CategoryWithCountOut(
                id=cat.id,
                name=cat.name,
                is_system=cat.is_system,
                created_at=cat.created_at,
                updated_at=cat.updated_at,
                expense_count=count,
            )
            for cat, count in raw_items
        ]
        return items, total

    async def get_category(self, category_id: str) -> CategoryOut:
        """
        Return a single category by ID.
        Raises NotFoundException if not found.
        """
        cat = await self.repo.get_by_id(category_id)
        if not cat:
            raise NotFoundException("Category")
        return CategoryOut.model_validate(cat)

    async def create_category(self, data: CategoryCreate) -> CategoryOut:
        """
        Create a new category.
        Raises ConflictException if a category with the same name already exists.
        """
        existing = await self.repo.get_by_name(data.name)
        if existing:
            raise ConflictException(
                f"Category '{data.name}' already exists.", field="name"
            )
        cat = await self.repo.create(name=data.name, is_system=False)
        return CategoryOut.model_validate(cat)

    async def update_category(self, category_id: str, data: CategoryUpdate) -> CategoryOut:
        """
        Rename a category.
        - Cannot rename system categories (is_system=True) → raises SystemCategoryException
        - New name must not conflict with an existing category → raises ConflictException
        """
        cat = await self.repo.get_by_id(category_id)
        if not cat:
            raise NotFoundException("Category")
        if cat.is_system:
            raise SystemCategoryException()

        if data.name != cat.name:
            existing = await self.repo.get_by_name(data.name)
            if existing and existing.id != category_id:
                raise ConflictException(
                    f"Category '{data.name}' already exists.", field="name"
                )

        updated = await self.repo.update(cat, name=data.name)
        return CategoryOut.model_validate(updated)

    async def delete_category(self, category_id: str, *, force: bool = False) -> None:
        """
        Delete a category following the SRS §3.3 deletion flow:
          1. Check is_system → reject if true.
          2. Count linked expenses.
          3. If linked and not forced → raise CategoryHasExpensesException (409).
          4. If forced → reassign linked expenses to Uncategorized, then delete.
        """
        cat = await self.repo.get_by_id(category_id)
        if not cat:
            raise NotFoundException("Category")
        if cat.is_system:
            raise SystemCategoryException()

        count = await self.repo.count_linked_expenses(category_id)
        if count > 0:
            if not force:
                raise CategoryHasExpensesException(
                    category_name=cat.name, expense_count=count
                )
            # Safe deletion flow: get or create Uncategorized system category
            uncat = await self.repo.get_uncategorized()
            if not uncat:
                uncat = await self.repo.create(name="Uncategorized", is_system=True)
            await self.repo.reassign_expenses_to_uncategorized(category_id, uncat.id)

        await self.repo.delete(cat)

