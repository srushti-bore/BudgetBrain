"""
BudgetBrain — Generic Base Repository

Provides common CRUD operations shared by all repositories.
All DB access lives in repositories — no business logic here.
"""

from typing import Any, Generic, TypeVar
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    """
    Generic async repository with common CRUD helpers.
    Subclass and set `model` to the SQLAlchemy model class.
    """

    model: type[ModelT]

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, id: str) -> ModelT | None:
        """Fetch a single record by primary key. Returns None if not found."""
        result = await self.session.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalar_one_or_none()

    async def list_all(
        self,
        *,
        offset: int = 0,
        limit: int = 20,
        **filters: Any,
    ) -> tuple[list[ModelT], int]:
        """
        List records with optional offset/limit.
        Returns (items, total_count).
        Subclasses should override for complex filtering.
        """
        base_query = select(self.model)
        count_query = select(func.count()).select_from(self.model)

        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        result = await self.session.execute(
            base_query.offset(offset).limit(limit)
        )
        items = list(result.scalars().all())

        return items, total

    async def create(self, **kwargs: Any) -> ModelT:
        """Create a new record and flush to DB (not committed yet)."""
        if "id" not in kwargs:
            kwargs["id"] = str(uuid4())
        instance = self.model(**kwargs)
        self.session.add(instance)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def update(self, instance: ModelT, **kwargs: Any) -> ModelT:
        """Update fields on an existing instance and flush."""
        for key, value in kwargs.items():
            setattr(instance, key, value)
        self.session.add(instance)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def delete(self, instance: ModelT) -> None:
        """Delete an instance and flush."""
        await self.session.delete(instance)
        await self.session.flush()
