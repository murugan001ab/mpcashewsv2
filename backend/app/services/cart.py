from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cart import Cart, CartItem
from app.repositories.cart import CartRepository
from app.repositories.product import ProductRepository
from app.schemas.cart import CartItemAdd, CartItemUpdate, CartSummary, CartItemResponse

TAX_RATE = Decimal("0.18")        # 18% GST
FREE_SHIPPING_THRESHOLD = Decimal("500")
SHIPPING_FEE = Decimal("50")


class CartService:
    def __init__(self, db: AsyncSession):
        self.cart_repo = CartRepository(db)
        self.product_repo = ProductRepository(db)

    async def _get_or_create_cart(self, user_id: UUID) -> Cart:
        cart = await self.cart_repo.get_by_user(user_id)
        if not cart:
            cart = Cart(user_id=user_id)
            cart = await self.cart_repo.create(cart)
        return cart

    async def add_item(self, user_id: UUID, data: CartItemAdd) -> Cart:
        product = await self.product_repo.get_with_relations(data.product_id)
        if not product or not product.is_active:
            raise HTTPException(status_code=404, detail="Product not found")
        if product.stock < data.quantity:
            raise HTTPException(status_code=400, detail=f"Only {product.stock} units available")

        cart = await self._get_or_create_cart(user_id)
        existing = await self.cart_repo.get_cart_item(cart.id, data.product_id)

        if existing:
            new_qty = existing.quantity + data.quantity
            if product.stock < new_qty:
                raise HTTPException(status_code=400, detail=f"Only {product.stock} units available")
            existing.quantity = new_qty
        else:
            price = product.discounted_price or product.price
            item = CartItem(
                cart_id=cart.id,
                product_id=data.product_id,
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

        product = await self.product_repo.get_by_id(item.product_id)
        if product and product.stock < data.quantity:
            raise HTTPException(status_code=400, detail=f"Only {product.stock} units available")

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
