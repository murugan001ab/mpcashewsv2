import logging
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, OrderItem, OrderStatus
from app.repositories.order import OrderRepository
from app.repositories.cart import CartRepository
from app.repositories.product import ProductRepository, ProductVariantRepository
from app.repositories.address import AddressRepository
from app.repositories.user import UserRepository
from app.schemas.order import OrderCreate
from app.services.coupon import CouponService
from app.services.whatsapp import WhatsAppService
from app.utils.order_number import generate_order_number
from app.utils.pagination import paginate, get_skip_limit

logger = logging.getLogger(__name__)

TAX_RATE = Decimal("0.18")
FREE_SHIPPING_THRESHOLD = Decimal("500")
SHIPPING_FEE = Decimal("50")

# Statuses shown, in order, on the user-facing tracking timeline. Terminal
# exception statuses (cancelled/refunded) are appended separately.
TRACKING_FLOW = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
]

TRACKING_LABELS = {
    OrderStatus.PENDING: "Order Placed",
    OrderStatus.CONFIRMED: "Order Confirmed",
    OrderStatus.PROCESSING: "Processing",
    OrderStatus.OUT_FOR_DELIVERY: "Out for Delivery",
    OrderStatus.SHIPPED: "Shipped",
    OrderStatus.DELIVERED: "Delivered",
    OrderStatus.CANCELLED: "Cancelled",
    OrderStatus.REFUNDED: "Refunded",
}


class OrderService:
    def __init__(self, db: AsyncSession):
        self.order_repo = OrderRepository(db)
        self.cart_repo = CartRepository(db)
        self.product_repo = ProductRepository(db)
        self.variant_repo = ProductVariantRepository(db)
        self.address_repo = AddressRepository(db)
        self.user_repo = UserRepository(db)
        self.coupon_service = CouponService(db)
        self.wa = WhatsAppService(db=db)

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
            # Price, stock, and SKU live on the variant that was added to the
            # cart — Product itself has no price/stock/sku columns.
            variant = cart_item.variant
            if variant is None:
                variant = await self.variant_repo.get_with_product(cart_item.variant_id)
            if not variant or not variant.is_active:
                raise HTTPException(
                    status_code=400,
                    detail=f"A cart item is no longer available (variant {cart_item.variant_id})",
                )

            product = cart_item.product or await self.product_repo.get_with_relations(cart_item.product_id)
            if not product or not product.is_active:
                raise HTTPException(status_code=400, detail=f"Product {cart_item.product_id} unavailable")

            if variant.stock < cart_item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for {product.name} ({variant.weight_grams}g). "
                           f"Available: {variant.stock}",
                )

            unit_price = variant.discounted_price or variant.price
            total_price = unit_price * cart_item.quantity
            subtotal += total_price

            order_items.append(OrderItem(
                product_id=product.id,
                variant_id=variant.id,
                quantity=cart_item.quantity,
                unit_price=unit_price,
                total_price=total_price,
                product_name=product.name,
                product_sku=variant.sku,
            ))

        tax_amount = (subtotal * TAX_RATE).quantize(Decimal("0.01"))
        shipping_amount = Decimal("0") if subtotal >= FREE_SHIPPING_THRESHOLD else SHIPPING_FEE

        # Coupon (optional) — validated against the same subtotal used for
        # tax/shipping so the discount reflects what's actually in the cart.
        coupon = None
        discount_amount = Decimal("0")
        coupon_code = None
        if data.coupon_code:
            coupon, discount_amount = await self.coupon_service.validate_coupon(
                data.coupon_code, user_id, subtotal
            )
            coupon_code = coupon.code

        total_amount = subtotal + tax_amount + shipping_amount - discount_amount

        order = Order(
            order_number=generate_order_number(),
            user_id=user_id,
            address_id=data.address_id,
            subtotal=subtotal,
            tax_amount=tax_amount,
            shipping_amount=shipping_amount,
            discount_amount=discount_amount,
            coupon_code=coupon_code,
            total_amount=total_amount,
            notes=data.notes,
        )
        order = await self.order_repo.create(order)

        # Consume the coupon now that we have a real order id to attach the
        # usage record to (per-user/global limits are enforced here).
        if coupon:
            await self.coupon_service.record_usage(coupon, user_id, order.id, discount_amount)

        # Attach items and deduct stock (on the variant, not the product)
        for item in order_items:
            item.order_id = order.id
            self.order_repo.db.add(item)
            await self.variant_repo.update_stock(item.variant_id, -item.quantity)

        # Clear cart
        for cart_item in cart.items:
            await self.cart_repo.db.delete(cart_item)

        await self.order_repo.db.flush()
        await self.order_repo.add_status_history(order.id, OrderStatus.PENDING, note="Order placed")

        # WhatsApp: order confirmed (after everything committed to the session
        # so a notification failure never rolls back a placed order)
        await self._notify_order_confirmed(user_id, order)

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
        # Restore stock on the variant that was actually ordered
        for item in order.items:
            if item.variant_id:
                await self.variant_repo.update_stock(item.variant_id, item.quantity)
        await self.order_repo.db.flush()
        await self.order_repo.add_status_history(order.id, OrderStatus.CANCELLED, note="Cancelled by customer")

        # WhatsApp: order cancelled
        await self._notify_status_change(order, OrderStatus.CANCELLED)
        return order

    async def update_status(
        self, order_id: UUID, new_status: OrderStatus, tracking_id: str = "N/A"
    ) -> Order:
        order = await self.order_repo.get_with_relations(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        previous_status = order.status
        order.status = new_status

        # If an admin is cancelling/refunding an order that wasn't already
        # cancelled/refunded, restore stock the same way cancel_order() does
        # — otherwise stock stays permanently locked as "sold".
        restocking_statuses = (OrderStatus.CANCELLED, OrderStatus.REFUNDED)
        if new_status in restocking_statuses and previous_status not in restocking_statuses:
            for item in order.items:
                if item.variant_id:
                    await self.variant_repo.update_stock(item.variant_id, item.quantity)

        await self.order_repo.db.flush()
        history_note = f"Tracking ID: {tracking_id}" if tracking_id and tracking_id != "N/A" else None
        await self.order_repo.add_status_history(order.id, new_status, note=history_note)

        # WhatsApp notification
        await self._notify_status_change(order, new_status, tracking_id=tracking_id)
        return order

    # ------------------------------------------------------------------
    # Private WhatsApp helpers
    # ------------------------------------------------------------------

    async def _get_user_phone(self, user_id: UUID) -> str | None:
        user = await self.user_repo.get_by_id(user_id)
        return user.phone if user and user.phone else None

    async def _notify_order_confirmed(self, user_id: UUID, order: Order) -> None:
        phone = await self._get_user_phone(user_id)
        if not phone:
            return
        user = await self.user_repo.get_by_id(user_id)
        try:
            await self.wa.send_order_confirmed(
                phone=phone,
                customer_name=user.full_name,
                order_number=order.order_number,
                total_amount=f"₹{order.total_amount}",
            )
        except Exception as exc:
            logger.warning("WhatsApp notify failed (order_confirmed): %s", exc)

    async def _notify_status_change(
        self, order: Order, status: OrderStatus, tracking_id: str = "N/A"
    ) -> None:
        phone = await self._get_user_phone(order.user_id)
        if not phone:
            return
        user = await self.user_repo.get_by_id(order.user_id)
        name = user.full_name if user else "Customer"
        num = order.order_number
        try:
            if status == OrderStatus.SHIPPED:
                await self.wa.send_order_shipped(phone, name, num, tracking_id)
            elif status == OrderStatus.CANCELLED:
                await self.wa.send_order_cancelled(phone, name, num)
            elif status == OrderStatus.DELIVERED:
                await self.wa.send_order_delivered(phone, name, num)
            elif status == OrderStatus.OUT_FOR_DELIVERY:
                await self.wa.send_order_out_for_delivery(phone, name, num)
            elif status in (OrderStatus.PROCESSING, OrderStatus.CONFIRMED):
                pass  # No separate template; confirmed already sent at create time
        except Exception as exc:
            logger.warning("WhatsApp notify failed (%s): %s", status, exc)

    async def update_status_with_tracking(
        self, order_id: UUID, new_status: OrderStatus, tracking_id: str = "N/A"
    ) -> Order:
        """Convenience alias used by admin endpoint when tracking_id is known."""
        return await self.update_status(order_id, new_status, tracking_id=tracking_id)

    # ------------------------------------------------------------------
    # Order tracking (order page "track my order" timeline)
    # ------------------------------------------------------------------

    async def get_tracking(self, user_id: UUID, order_id: UUID) -> dict:
        order = await self.get_order(user_id, order_id)
        history = await self.order_repo.get_status_history(order_id)
        history_map = {h.status: h for h in history}

        is_terminal_exception = order.status in (OrderStatus.CANCELLED, OrderStatus.REFUNDED)
        current_index = TRACKING_FLOW.index(order.status) if order.status in TRACKING_FLOW else -1

        steps = []
        for idx, step_status in enumerate(TRACKING_FLOW):
            entry = history_map.get(step_status)
            completed = entry is not None or (not is_terminal_exception and idx <= current_index)
            steps.append({
                "status": step_status,
                "label": TRACKING_LABELS[step_status],
                "note": entry.note if entry else None,
                "timestamp": entry.created_at if entry else None,
                "completed": completed,
            })

        if is_terminal_exception:
            entry = history_map.get(order.status)
            steps.append({
                "status": order.status,
                "label": TRACKING_LABELS[order.status],
                "note": entry.note if entry else None,
                "timestamp": entry.created_at if entry else order.updated_at,
                "completed": True,
            })

        delivery = order.delivery
        return {
            "order_id": order.id,
            "order_number": order.order_number,
            "current_status": order.status,
            "steps": steps,
            "awb_code": delivery.awb_code if delivery else None,
            "courier_name": delivery.courier_name if delivery else None,
            "courier_tracking_url": delivery.courier_tracking_url if delivery else None,
            "estimated_delivery": delivery.estimated_delivery if delivery else None,
        }
