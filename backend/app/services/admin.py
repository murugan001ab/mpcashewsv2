from decimal import Decimal

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.models.payment import Payment, PaymentStatus
from app.repositories.order import OrderRepository
from app.repositories.product import ProductRepository
from app.repositories.user import UserRepository
from app.repositories.payment import PaymentRepository
from app.schemas.admin import DashboardStats, InventoryReport
from app.utils.pagination import paginate, get_skip_limit


class AdminService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.order_repo = OrderRepository(db)
        self.product_repo = ProductRepository(db)
        self.payment_repo = PaymentRepository(db)

    async def get_dashboard_stats(self) -> DashboardStats:
        total_users = await self.user_repo.count()
        total_orders = await self.order_repo.count()
        total_products = await self.product_repo.count()
        total_revenue = await self.payment_repo.get_total_revenue()

        pending_result = await self.db.execute(
            select(func.count()).select_from(Order).where(Order.status == OrderStatus.PENDING)
        )
        pending_orders = pending_result.scalar_one()

        low_stock_result = await self.db.execute(
            select(func.count()).select_from(Product).where(Product.stock <= 10, Product.is_active == True)
        )
        low_stock_products = low_stock_result.scalar_one()

        return DashboardStats(
            total_users=total_users,
            total_orders=total_orders,
            total_revenue=Decimal(str(total_revenue)),
            total_products=total_products,
            pending_orders=pending_orders,
            low_stock_products=low_stock_products,
        )

    async def get_revenue_by_month(self) -> list:
        rows = await self.order_repo.get_revenue_stats()
        result = []
        for row in rows:
            result.append({
                "month": f"{int(row.year)}-{int(row.month):02d}",
                "revenue": Decimal(str(row.revenue or 0)),
                "orders": row.orders,
            })
        return result

    async def get_all_users(self, page: int = 1, page_size: int = 20) -> dict:
        skip, limit = get_skip_limit(page, page_size)
        users = await self.user_repo.get_all(skip, limit)
        total = await self.user_repo.count()
        return {"items": users, **paginate(total, page, page_size)}

    async def toggle_user_active(self, user_id) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="User not found")
        user.is_active = not user.is_active
        await self.db.flush()
        return user

    async def get_all_orders(self, status=None, page: int = 1, page_size: int = 20) -> dict:
        skip, limit = get_skip_limit(page, page_size)
        orders, total = await self.order_repo.get_all_orders(status, skip, limit)
        return {"items": orders, **paginate(total, page, page_size)}

    async def get_inventory_report(self) -> list:
        result = await self.db.execute(
            select(Product).where(Product.is_active == True).order_by(Product.stock.asc())
        )
        products = result.scalars().all()
        report = []
        for p in products:
            if p.stock == 0:
                status = "out"
            elif p.stock <= 10:
                status = "low"
            else:
                status = "ok"
            report.append(InventoryReport(
                product_id=str(p.id),
                name=p.name,
                sku=p.sku,
                stock=p.stock,
                status=status,
            ))
        return report

    async def get_top_products(self, limit: int = 10) -> list:
        from sqlalchemy import desc
        from app.models.order import OrderItem
        result = await self.db.execute(
            select(
                OrderItem.product_id,
                OrderItem.product_name,
                func.sum(OrderItem.quantity).label("total_sold"),
                func.sum(OrderItem.total_price).label("revenue"),
            )
            .group_by(OrderItem.product_id, OrderItem.product_name)
            .order_by(desc("total_sold"))
            .limit(limit)
        )
        rows = result.all()
        return [
            {
                "product_id": str(r.product_id),
                "product_name": r.product_name,
                "total_sold": r.total_sold,
                "revenue": Decimal(str(r.revenue or 0)),
            }
            for r in rows
        ]
