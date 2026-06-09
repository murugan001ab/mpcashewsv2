from uuid import UUID
from typing import List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.repositories.user import UserRepository
from app.repositories.address import AddressRepository
from app.schemas.user import UserUpdate, ChangePasswordRequest
from app.schemas.address import AddressCreate, AddressUpdate


class UserService:
    def __init__(self, db: AsyncSession):
        self.user_repo = UserRepository(db)
        self.address_repo = AddressRepository(db)

    async def get_profile(self, user: User) -> User:
        return user

    async def update_profile(self, user: User, data: UserUpdate) -> User:
        return await self.user_repo.update(user, data.model_dump(exclude_none=True))

    async def change_password(self, user: User, data: ChangePasswordRequest) -> None:
        if not user.hashed_password:
            raise HTTPException(status_code=400, detail="Password change not available for OAuth accounts")
        if not verify_password(data.current_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        user.hashed_password = hash_password(data.new_password)

    async def get_addresses(self, user_id: UUID) -> list:
        return await self.address_repo.get_user_addresses(user_id)

    async def add_address(self, user_id: UUID, data: AddressCreate):
        from app.models.address import Address
        if data.is_default:
            await self.address_repo.clear_default(user_id)
        address = Address(user_id=user_id, **data.model_dump())
        return await self.address_repo.create(address)

    async def update_address(self, user_id: UUID, address_id: UUID, data: AddressUpdate):
        address = await self.address_repo.get_by_id(address_id)
        if not address or address.user_id != user_id:
            raise HTTPException(status_code=404, detail="Address not found")
        if data.is_default:
            await self.address_repo.clear_default(user_id)
        return await self.address_repo.update(address, data.model_dump(exclude_none=True))

    async def delete_address(self, user_id: UUID, address_id: UUID) -> None:
        address = await self.address_repo.get_by_id(address_id)
        if not address or address.user_id != user_id:
            raise HTTPException(status_code=404, detail="Address not found")
        await self.address_repo.delete(address)
