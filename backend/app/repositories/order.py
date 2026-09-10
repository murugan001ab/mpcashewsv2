from typing import Optional, List, Tuple
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, OrderItem, OrderStatus, OrderStatusHistory
from app.models.product import Product
from app.repositories.base import BaseRepository


class OrderRepository(BaseRepository[Order]):
    def __init__(self, db: AsyncSession):
        super().__init__(Order, db)

    def _order_item_product_options(self):
        # Every field ProductListResponse serializes must be eager-loaded
        # here — accessing an un-loaded relationship during Pydantic's
        # from_attributes serialization raises MissingGreenlet in async
        # SQLAlchemy (no implicit lazy-load in an async context), which
        # surfaces to the client as an unhandled 500.
        return (
            selectinload(Order.items).selectinload(OrderItem.product).selectinload(Product.images),
            selectinload(Order.items).selectinload(OrderItem.product).selectinload(Product.category),
            selectinload(Order.items).selectinload(OrderItem.product).selectinload(Product.variants),
        )

    async def get_with_relations(self, order_id: UUID) -> Optional[Order]:
        result = await self.db.execute(
            select(Order)
            .options(
                *self._order_item_product_options(),
                selectinload(Order.address),
                selectinload(Order.payment),
                selectinload(Order.delivery),
                selectinload(Order.user),
            )
            .where(Order.id == order_id)
        )
        return result.scalar_one_or_none()

    async def get_by_order_number(self, order_number: str) -> Optional[Order]:
        result = await self.db.execute(select(Order).where(Order.order_number == order_number))
        return result.scalar_one_or_none()

    async def get_user_orders(
        self, user_id: UUID, skip: int = 0, limit: int = 20
    ) -> Tuple[List[Order], int]:
        count_result = await self.db.execute(
            select(func.count()).select_from(Order).where(Order.user_id == user_id)
        )
        total = count_result.scalar_one()

        result = await self.db.execute(
            select(Order)
            .options(
                *self._order_item_product_options(),
                selectinload(Order.address),
            )
            .where(Order.user_id == user_id)
            .order_by(Order.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all()), total

    async def get_all_orders(
        self, status: Optional[OrderStatus] = None, skip: int = 0, limit: int = 20
    ) -> Tuple[List[Order], int]:
        stmt = select(Order).options(
            *self._order_item_product_options(),
            selectinload(Order.address),
        )
        count_stmt = select(func.count()).select_from(Order)
        if status:
            stmt = stmt.where(Order.status == status)
            count_stmt = count_stmt.where(Order.status == status)

        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        result = await self.db.execute(stmt.order_by(Order.created_at.desc()).offset(skip).limit(limit))
        return list(result.scalars().all()), total

    async def add_status_history(
        self, order_id: UUID, status: OrderStatus, note: Optional[str] = None
    ) -> OrderStatusHistory:
        entry = OrderStatusHistory(order_id=order_id, status=status, note=note)
        self.db.add(entry)
        await self.db.flush()
        return entry

    async def get_status_history(self, order_id: UUID) -> List[OrderStatusHistory]:
        result = await self.db.execute(
            select(OrderStatusHistory)
            .where(OrderStatusHistory.order_id == order_id)
            .order_by(OrderStatusHistory.created_at)
        )
        return list(result.scalars().all())

    async def get_revenue_stats(self):
        from sqlalchemy import extract
        result = await self.db.execute(
            select(
                extract("year", Order.created_at).label("year"),
                extract("month", Order.created_at).label("month"),
                func.sum(Order.total_amount).label("revenue"),
                func.count(Order.id).label("orders"),
            )
            .where(Order.status.not_in([OrderStatus.CANCELLED, OrderStatus.REFUNDED]))
            .group_by("year", "month")
            .order_by("year", "month")
        )
        return result.all()
