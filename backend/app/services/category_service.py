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
    Handles all business logic for categories with multi-tenant isolation.
    Delegates DB access to CategoryRepository.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = CategoryRepository(session)

    async def list_categories(
        self, user_id: str, *, page: int = 1, page_size: int = 20
    ) -> tuple[list[CategoryWithCountOut], int]:
        """
        Return paginated categories with their expense counts for user (FR-9).
        """
        offset = (page - 1) * page_size
        raw_items, total = await self.repo.list_with_expense_counts(
            user_id, offset=offset, limit=page_size
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

    async def get_category(self, category_id: str, user_id: str) -> CategoryOut:
        """
        Return a single category by ID for user.
        Raises NotFoundException if not found.
        """
        cat = await self.repo.get_by_id_and_user(category_id, user_id)
        if not cat:
            raise NotFoundException("Category")
        return CategoryOut.model_validate(cat)

    async def create_category(self, data: CategoryCreate, user_id: str) -> CategoryOut:
        """
        Create a new category for user.
        Raises ConflictException if a category with the same name already exists for this user.
        """
        existing = await self.repo.get_by_name(data.name, user_id)
        if existing:
            raise ConflictException(
                f"Category '{data.name}' already exists.", field="name"
            )
        cat = await self.repo.create(user_id=user_id, name=data.name, is_system=False)
        await self.session.commit()
        return CategoryOut.model_validate(cat)

    async def update_category(
        self, category_id: str, data: CategoryUpdate, user_id: str
    ) -> CategoryOut:
        """
        Rename a user-owned category.
        - Cannot rename system categories (is_system=True) → raises SystemCategoryException
        - New name must not conflict with an existing category for this user → raises ConflictException
        """
        cat = await self.repo.get_by_id_and_user(category_id, user_id)
        if not cat:
            raise NotFoundException("Category")
        if cat.is_system:
            raise SystemCategoryException()

        if data.name.strip().lower() != cat.name.strip().lower():
            existing = await self.repo.get_by_name(data.name, user_id)
            if existing and existing.id != category_id:
                raise ConflictException(
                    f"Category '{data.name}' already exists.", field="name"
                )

        updated = await self.repo.update(cat, name=data.name)
        await self.session.commit()
        return CategoryOut.model_validate(updated)

    async def delete_category(
        self, category_id: str, user_id: str, *, force: bool = False
    ) -> None:
        """
        Delete a category following the SRS §3.3 deletion flow:
          1. Check is_system → reject if true.
          2. Count linked expenses for user.
          3. If linked and not forced → raise CategoryHasExpensesException (409).
          4. If forced → reassign linked expenses to Uncategorized, then delete.
        """
        cat = await self.repo.get_by_id_and_user(category_id, user_id)
        if not cat:
            raise NotFoundException("Category")

        if cat.is_system:
            raise SystemCategoryException()

        linked_count = await self.repo.count_linked_expenses(category_id, user_id)

        if linked_count > 0:
            if not force:
                raise CategoryHasExpensesException(
                    category_name=cat.name, expense_count=linked_count
                )
            # Reassign to Uncategorized for this user
            uncategorized = await self.repo.get_uncategorized(user_id)
            if not uncategorized:
                # If uncategorized missing, create it
                uncategorized = await self.repo.create(
                    user_id=user_id, name="Uncategorized", is_system=True
                )
            await self.repo.reassign_expenses_to_uncategorized(
                from_category_id=category_id,
                uncategorized_id=uncategorized.id,
                user_id=user_id,
            )

        await self.repo.delete(cat)
        await self.session.commit()
