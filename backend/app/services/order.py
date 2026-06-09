from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, OrderItem, OrderStatus
from app.repositories.order import OrderRepository
from app.repositories.cart import CartRepository
from app.repositories.product import ProductRepository
from app.repositories.address import AddressRepository
from app.schemas.order import OrderCreate
from app.utils.order_number import generate_order_number
from app.utils.pagination import paginate, get_skip_limit

TAX_RATE = Decimal("0.18")
FREE_SHIPPING_THRESHOLD = Decimal("500")
SHIPPING_FEE = Decimal("50")


class OrderService:
    def __init__(self, db: AsyncSession):
        self.order_repo = OrderRepository(db)
        self.cart_repo = CartRepository(db)
        self.product_repo = ProductRepository(db)
        self.address_repo = AddressRepository(db)

    async def create_order(self, user_id: UUID, data: OrderCreate) -> Order:
        # Validate address
        address = await self.address_repo.get_by_id(data.address_id)
        if not address or address.user_id != user_id:
            raise HTTPException(status_code=404, detail="Address not found")

        # Get cart
        cart = await self.cart_repo.get_by_user(user_id)
        if not cart or not cart.items:
            raise HTTPException(status_code=400, detail="Cart is empty")

        subtotal = Decimal("0")
        order_items = []

        for cart_item in cart.items:
            product = await self.product_repo.get_with_relations(cart_item.product_id)
            if not product or not product.is_active:
                raise HTTPException(status_code=400, detail=f"Product {cart_item.product_id} unavailable")
            if product.stock < cart_item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for {product.name}. Available: {product.stock}",
                )

            unit_price = product.discounted_price or product.price
            total_price = unit_price * cart_item.quantity
            subtotal += total_price

            order_items.append(OrderItem(
                product_id=product.id,
                quantity=cart_item.quantity,
                unit_price=unit_price,
                total_price=total_price,
                product_name=product.name,
                product_sku=product.sku,
            ))

        tax_amount = (subtotal * TAX_RATE).quantize(Decimal("0.01"))
        shipping_amount = Decimal("0") if subtotal >= FREE_SHIPPING_THRESHOLD else SHIPPING_FEE
        total_amount = subtotal + tax_amount + shipping_amount

        order = Order(
            order_number=generate_order_number(),
            user_id=user_id,
            address_id=data.address_id,
            subtotal=subtotal,
            tax_amount=tax_amount,
            shipping_amount=shipping_amount,
            discount_amount=Decimal("0"),
            total_amount=total_amount,
            notes=data.notes,
        )
        order = await self.order_repo.create(order)

        # Attach items and deduct stock
        for item in order_items:
            item.order_id = order.id
            self.order_repo.db.add(item)
            await self.product_repo.update_stock(item.product_id, -item.quantity)

        # Clear cart
        for cart_item in cart.items:
            await self.cart_repo.db.delete(cart_item)

        await self.order_repo.db.flush()
        return await self.order_repo.get_with_relations(order.id)

    async def get_order(self, user_id: UUID, order_id: UUID) -> Order:
        order = await self.order_repo.get_with_relations(order_id)
        if not order or order.user_id != user_id:
            raise HTTPException(status_code=404, detail="Order not found")
        return order

    async def get_user_orders(self, user_id: UUID, page: int = 1, page_size: int = 10) -> dict:
        skip, limit = get_skip_limit(page, page_size)
        orders, total = await self.order_repo.get_user_orders(user_id, skip, limit)
        return {"items": orders, **paginate(total, page, page_size)}

    async def cancel_order(self, user_id: UUID, order_id: UUID) -> Order:
        order = await self.get_order(user_id, order_id)
        if order.status not in (OrderStatus.PENDING, OrderStatus.CONFIRMED):
            raise HTTPException(status_code=400, detail=f"Cannot cancel order in status: {order.status}")

        order.status = OrderStatus.CANCELLED
        # Restore stock
        for item in order.items:
            await self.product_repo.update_stock(item.product_id, item.quantity)
        await self.order_repo.db.flush()
        return order

    async def update_status(self, order_id: UUID, new_status: OrderStatus) -> Order:
        order = await self.order_repo.get_with_relations(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        order.status = new_status
        await self.order_repo.db.flush()
        return order
