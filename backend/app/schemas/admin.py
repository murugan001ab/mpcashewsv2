from decimal import Decimal
from typing import List
from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_users: int
    total_orders: int
    total_revenue: Decimal
    total_products: int
    pending_orders: int
    low_stock_products: int


class RevenueByMonth(BaseModel):
    month: str
    revenue: Decimal
    orders: int


class TopProduct(BaseModel):
    product_id: str
    product_name: str
    total_sold: int
    revenue: Decimal


class InventoryReport(BaseModel):
    product_id: str
    name: str
    sku: str
    stock: int
    status: str  # "ok", "low", "out"
