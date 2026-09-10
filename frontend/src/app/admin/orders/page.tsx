"use client";
// src/app/admin/orders/page.tsx
import { useEffect, useState } from "react";
import { ShoppingBag, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import * as adminService from "@/services/adminService";
import { getErrorMessage } from "@/utils/apiError";
import type { AdminOrder, AdminOrderStatus } from "@/types";
import { ORDER_STATUSES, orderStatusLabel, orderStatusTone } from "@/components/admin/orderStatus";
import { PageHeader, Badge, LoadingBlock, EmptyState, ErrorNotice, Modal, IconButton, inputClass } from "@/components/admin/ui";

const inr = (v: string | number) => `₹${Number(v).toLocaleString("en-IN")}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<AdminOrderStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<AdminOrder | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async (p = page, status = statusFilter) => {
    setLoading(true);
    setError("");
    try {
      const res = await adminService.listAdminOrders({
        page: p,
        page_size: 15,
        ...(status ? { status: status as AdminOrderStatus } : {}),
      });
      setOrders(res.items);
      setTotal(res.total);
      setPages(res.pages);
      setPage(res.page);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load orders."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleStatusChange = async (order: AdminOrder, next: AdminOrderStatus) => {
    let trackingId: string | undefined;
    if (next === "shipped") {
      trackingId = window.prompt("Courier tracking ID for this shipment (optional):") ?? undefined;
    }
    setUpdatingId(order.id);
    try {
      await adminService.updateOrderStatus(order.id, next, trackingId);
      load(page, statusFilter);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update order status."));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={`${total} order${total === 1 ? "" : "s"} total`}
        action={
          <select
            className={inputClass + " w-auto"}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AdminOrderStatus | "")}
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {orderStatusLabel(s)}
              </option>
            ))}
          </select>
        }
      />

      {error && <ErrorNotice>{error}</ErrorNotice>}

      <div className="bg-white rounded-2xl border border-brand-brown/10 overflow-hidden">
        {loading ? (
          <LoadingBlock />
        ) : orders.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No orders found" description="Orders will appear here as customers check out." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-brand-brown/45 uppercase tracking-wide border-b border-brand-brown/10">
                    <th className="px-5 py-3 font-semibold">Order</th>
                    <th className="px-3 py-3 font-semibold">Recipient</th>
                    <th className="px-3 py-3 font-semibold">Placed</th>
                    <th className="px-3 py-3 font-semibold">Total</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-brown/8">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-brand-brown/[0.03] transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-brand-black">{o.order_number}</p>
                        <p className="text-xs text-brand-brown/40">{o.items.length} item{o.items.length === 1 ? "" : "s"}</p>
                      </td>
                      <td className="px-3 py-3 text-brand-brown/70">{o.address?.full_name ?? "—"}</td>
                      <td className="px-3 py-3 text-brand-brown/60">{fmtDate(o.created_at)}</td>
                      <td className="px-3 py-3 font-semibold text-brand-black tabular-nums">{inr(o.total_amount)}</td>
                      <td className="px-3 py-3">
                        <select
                          value={o.status}
                          disabled={updatingId === o.id}
                          onChange={(e) => handleStatusChange(o, e.target.value as AdminOrderStatus)}
                          className="text-xs font-semibold rounded-full border border-brand-brown/15 pl-2.5 pr-6 py-1.5 bg-white text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-orange/30 disabled:opacity-50"
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {orderStatusLabel(s)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <IconButton onClick={() => setViewing(o)} title="View details">
                          <Eye size={15} />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-brand-brown/10">
                <p className="text-xs text-brand-brown/50">
                  Page {page} of {pages}
                </p>
                <div className="flex items-center gap-1.5">
                  <IconButton disabled={page <= 1} onClick={() => load(page - 1, statusFilter)}>
                    <ChevronLeft size={15} />
                  </IconButton>
                  <IconButton disabled={page >= pages} onClick={() => load(page + 1, statusFilter)}>
                    <ChevronRight size={15} />
                  </IconButton>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={viewing.order_number} width="max-w-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge tone={orderStatusTone(viewing.status)}>{orderStatusLabel(viewing.status)}</Badge>
              <span className="text-xs text-brand-brown/50">{fmtDate(viewing.created_at)}</span>
            </div>

            <div>
              <p className="text-xs font-semibold text-brand-brown/50 mb-1">Deliver to</p>
              <p className="text-sm text-brand-black font-medium">{viewing.address.full_name}</p>
              <p className="text-sm text-brand-brown/70">
                {viewing.address.address_line1}
                {viewing.address.address_line2 ? `, ${viewing.address.address_line2}` : ""}, {viewing.address.city}, {viewing.address.state} {viewing.address.postal_code}
              </p>
              <p className="text-sm text-brand-brown/70">{viewing.address.phone}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-brand-brown/50 mb-2">Items</p>
              <ul className="divide-y divide-brand-brown/8">
                {viewing.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium text-brand-black">{item.product_name}</p>
                      <p className="text-xs text-brand-brown/45">
                        {item.product_sku} · Qty {item.quantity}
                      </p>
                    </div>
                    <span className="font-semibold text-brand-black tabular-nums">{inr(item.total_price)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-brand-brown/10 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-brand-brown/60">
                <span>Subtotal</span>
                <span className="tabular-nums">{inr(viewing.subtotal)}</span>
              </div>
              <div className="flex justify-between text-brand-brown/60">
                <span>Shipping</span>
                <span className="tabular-nums">{inr(viewing.shipping_amount)}</span>
              </div>
              {Number(viewing.discount_amount) > 0 && (
                <div className="flex justify-between text-brand-brown/60">
                  <span>Discount</span>
                  <span className="tabular-nums">-{inr(viewing.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-brand-black pt-1">
                <span>Total</span>
                <span className="tabular-nums">{inr(viewing.total_amount)}</span>
              </div>
            </div>

            {viewing.notes && (
              <div className="bg-brand-brown/5 rounded-xl p-3 text-sm text-brand-brown/70">{viewing.notes}</div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
