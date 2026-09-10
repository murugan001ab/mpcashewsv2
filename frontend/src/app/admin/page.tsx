"use client";
// src/app/admin/page.tsx — Admin dashboard: live stats, revenue trend,
// top products and low-stock alerts pulled from /admin/*.
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  ShoppingBag,
  IndianRupee,
  Package,
  Clock,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import * as adminService from "@/services/adminService";
import type { AdminDashboard, RevenueByMonth, TopProduct, InventoryRow } from "@/types";
import { PageHeader, StatCard, LoadingBlock, ErrorNotice, EmptyState } from "@/components/admin/ui";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboard | null>(null);
  const [revenue, setRevenue] = useState<RevenueByMonth[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      adminService.getDashboardStats(),
      adminService.getRevenueByMonth(),
      adminService.getTopProducts(5),
      adminService.getInventoryReport(),
    ])
      .then(([s, r, t, i]) => {
        if (cancelled) return;
        setStats(s);
        setRevenue(r);
        setTopProducts(t);
        setInventory(i.filter((row) => row.status !== "ok").slice(0, 6));
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load dashboard data. Is the backend running?");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LoadingBlock label="Loading dashboard…" />;

  const maxRevenue = Math.max(1, ...revenue.map((r) => r.revenue));

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="An overview of how the store is doing" />

      {error && <ErrorNotice>{error}</ErrorNotice>}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total revenue" value={inr(stats.total_revenue)} icon={IndianRupee} tone="neutral" />
          <StatCard label="Total orders" value={stats.total_orders} icon={ShoppingBag} tone="blue" />
          <StatCard label="Pending orders" value={stats.pending_orders} icon={Clock} tone="amber" />
          <StatCard label="Total customers" value={stats.total_users} icon={Users} tone="green" />
          <StatCard label="Products listed" value={stats.total_products} icon={Package} tone="neutral" />
          <StatCard
            label="Low stock alerts"
            value={stats.low_stock_products}
            icon={AlertTriangle}
            tone={stats.low_stock_products > 0 ? "red" : "green"}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-brand-brown/10 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-brand-black text-sm">Revenue, last 6 months</h3>
            </div>
            <TrendingUp size={16} className="text-brand-brown/30" />
          </div>

          {revenue.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No revenue yet" description="Sales will show up here once orders start coming in." />
          ) : (
            <div className="flex items-end gap-3 h-48">
              {revenue.map((r) => (
                <div key={r.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[11px] font-semibold text-brand-black opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                    {inr(r.revenue)}
                  </span>
                  <div
                    className="w-full max-w-9 rounded-t-lg bg-brand-orange/85 group-hover:bg-brand-orange transition-colors"
                    style={{ height: `${Math.max(6, (r.revenue / maxRevenue) * 100)}%` }}
                  />
                  <span className="text-[11px] text-brand-brown/45 font-medium">{r.month}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="bg-white rounded-2xl border border-brand-brown/10 p-5">
          <h3 className="font-bold text-brand-black text-sm mb-4">Top-selling products</h3>
          {topProducts.length === 0 ? (
            <EmptyState icon={Package} title="No sales yet" />
          ) : (
            <ul className="space-y-3">
              {topProducts.map((p, i) => (
                <li key={p.product_id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-brand-brown/5 text-brand-brown/60 text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-brand-black truncate">{p.product_name}</p>
                    <p className="text-xs text-brand-brown/45">{p.total_sold} sold</p>
                  </div>
                  <span className="text-sm font-bold text-brand-black tabular-nums shrink-0">{inr(p.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Low stock */}
      <div className="bg-white rounded-2xl border border-brand-brown/10 p-5 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-brand-black text-sm">Needs restocking</h3>
          <Link href="/admin/products" className="text-xs font-semibold text-brand-orange flex items-center gap-1 hover:underline">
            View all products <ArrowUpRight size={13} />
          </Link>
        </div>
        {inventory.length === 0 ? (
          <EmptyState icon={Package} title="Stock levels look healthy" description="Nothing is low or out of stock right now." />
        ) : (
          <ul className="divide-y divide-brand-brown/8">
            {inventory.map((row) => (
              <li key={row.product_id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-brand-black">{row.name}</p>
                  <p className="text-xs text-brand-brown/45">SKU {row.sku}</p>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    row.status === "out" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {row.status === "out" ? "Out of stock" : `${row.stock} left`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
