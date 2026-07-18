from decimal import Decimal
from uuid import UUID, uuid4
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cart import Cart, CartItem
from app.repositories.cart import CartRepository
from app.repositories.product import ProductRepository, ProductVariantRepository
from app.schemas.cart import CartItemAdd, CartItemUpdate, CartSummary, CartItemResponse

TAX_RATE = Decimal("0.18")        # 18% GST
FREE_SHIPPING_THRESHOLD = Decimal("500")
SHIPPING_FEE = Decimal("50")


class CartService:
    def __init__(self, db: AsyncSession):
        self.cart_repo = CartRepository(db)
        self.product_repo = ProductRepository(db)
        self.variant_repo = ProductVariantRepository(db)

    async def _get_or_create_cart(self, user_id: UUID) -> Cart:
        """
        Atomically get or create a cart for the user using
        INSERT ... ON CONFLICT DO NOTHING, eliminating the race condition
        that caused UniqueViolationError when two requests fired concurrently.
        """
        now = datetime.now(timezone.utc)

        stmt = (
            pg_insert(Cart)
            .values(
                id=uuid4(),
                user_id=user_id,
                created_at=now,
                updated_at=now,
            )
            .on_conflict_do_nothing(index_elements=["user_id"])
        )
        await self.cart_repo.db.execute(stmt)
        await self.cart_repo.db.flush()

        return await self.cart_repo.get_by_user(user_id)

    async def add_item(self, user_id: UUID, data: CartItemAdd) -> Cart:
        # Price and stock live on the variant, not the product — the product
        # row has no price/stock columns of its own.
        variant = await self.variant_repo.get_with_product(data.variant_id)
        if not variant or not variant.is_active:
            raise HTTPException(status_code=404, detail="Product variant not found")
        if not variant.product or not variant.product.is_active:
            raise HTTPException(status_code=404, detail="Product not found")
        if variant.stock < data.quantity:
            raise HTTPException(status_code=400, detail=f"Only {variant.stock} units available")

        cart = await self._get_or_create_cart(user_id)
        existing = await self.cart_repo.get_cart_item_by_variant(cart.id, data.variant_id)

        if existing:
            new_qty = existing.quantity + data.quantity
            if variant.stock < new_qty:
                raise HTTPException(status_code=400, detail=f"Only {variant.stock} units available")
            existing.quantity = new_qty
        else:
            price = variant.discounted_price or variant.price
            item = CartItem(
                cart_id=cart.id,
                product_id=variant.product_id,
                variant_id=variant.id,
                quantity=data.quantity,
                price_at_add=price,
            )
            self.cart_repo.db.add(item)

        await self.cart_repo.db.flush()
        return await self.cart_repo.get_by_user(user_id)

    async def update_item(self, user_id: UUID, item_id: UUID, data: CartItemUpdate) -> Cart:
        cart = await self._get_or_create_cart(user_id)
        item = await self.cart_repo.get_cart_item_by_id(item_id)
        if not item or item.cart_id != cart.id:
            raise HTTPException(status_code=404, detail="Cart item not found")

        if item.variant_id:
            variant = await self.variant_repo.get_by_id(item.variant_id)
            if variant and variant.stock < data.quantity:
                raise HTTPException(status_code=400, detail=f"Only {variant.stock} units available")

        if data.quantity <= 0:
            await self.cart_repo.db.delete(item)
        else:
            item.quantity = data.quantity
        await self.cart_repo.db.flush()
        return await self.cart_repo.get_by_user(user_id)

    async def remove_item(self, user_id: UUID, item_id: UUID) -> Cart:
        cart = await self._get_or_create_cart(user_id)
        item = await self.cart_repo.get_cart_item_by_id(item_id)
        if not item or item.cart_id != cart.id:
            raise HTTPException(status_code=404, detail="Cart item not found")
        await self.cart_repo.db.delete(item)
        await self.cart_repo.db.flush()
        return await self.cart_repo.get_by_user(user_id)

    async def get_summary(self, user_id: UUID) -> CartSummary:
        cart = await self._get_or_create_cart(user_id)
        items = []
        subtotal = Decimal("0")

        for item in cart.items:
            item_subtotal = item.price_at_add * item.quantity
            subtotal += item_subtotal
            items.append(CartItemResponse(
                id=item.id,
                product=item.product,
                variant=item.variant,
                quantity=item.quantity,
                price_at_add=item.price_at_add,
                subtotal=item_subtotal,
            ))

        tax = (subtotal * TAX_RATE).quantize(Decimal("0.01"))
        shipping = Decimal("0") if subtotal >= FREE_SHIPPING_THRESHOLD else SHIPPING_FEE
        total = subtotal + tax + shipping

        return CartSummary(
            cart_id=cart.id,
            items=items,
            item_count=len(items),
            subtotal=subtotal,
            tax=tax,
            shipping=shipping,
            total=total,
        )

    async def clear_cart(self, user_id: UUID) -> None:
        cart = await self.cart_repo.get_by_user(user_id)
        if cart:
            for item in cart.items:
                await self.cart_repo.db.delete(item)
            await self.cart_repo.db.flush()
