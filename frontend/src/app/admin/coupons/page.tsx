"use client";
// src/app/admin/coupons/page.tsx
// Admin CRUD for discount coupons (festival sales, promoter-given codes).
// Usage limits (total + per-user) are set flexibly per coupon here; the
// backend enforces both at checkout (see CouponService.validate_coupon).
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Percent, Copy, Check } from "lucide-react";
import * as adminService from "@/services/adminService";
import type { Coupon, CouponPayload, DiscountType } from "@/types";
import { getErrorMessage } from "@/utils/apiError";
import {
  PageHeader,
  Button,
  IconButton,
  Field,
  inputClass,
  Modal,
  ErrorNotice,
  LoadingBlock,
  EmptyState,
  Badge,
} from "@/components/admin/ui";
import type { BadgeTone } from "@/components/admin/ui";

const inr = (v: string | number) => `₹${Number(v).toLocaleString("en-IN")}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm" (local, no timezone
// suffix) — both for displaying an existing ISO value and for round-tripping
// what the user picks back to a real ISO string the backend can parse.
const toLocalInputValue = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInputValue = (v: string) => (v ? new Date(v).toISOString() : "");

function couponStatus(c: Coupon): { label: string; tone: BadgeTone } {
  const now = Date.now();
  if (!c.is_active) return { label: "Paused", tone: "neutral" };
  if (new Date(c.valid_until).getTime() < now) return { label: "Expired", tone: "red" };
  if (new Date(c.valid_from).getTime() > now) return { label: "Scheduled", tone: "blue" };
  if (c.usage_limit_total != null && c.times_used >= c.usage_limit_total) return { label: "Used up", tone: "amber" };
  return { label: "Active", tone: "green" };
}

interface FormState {
  code: string;
  description: string;
  discount_type: DiscountType;
  discount_value: string;
  max_discount_amount: string;
  min_order_value: string;
  usage_limit_total: string;
  usage_limit_per_user: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
}

const emptyForm = (): FormState => {
  const now = new Date();
  const inAMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    max_discount_amount: "",
    min_order_value: "",
    usage_limit_total: "",
    usage_limit_per_user: "1",
    valid_from: toLocalInputValue(now.toISOString()),
    valid_until: toLocalInputValue(inAMonth.toISOString()),
    is_active: true,
  };
};

const couponToForm = (c: Coupon): FormState => ({
  code: c.code,
  description: c.description ?? "",
  discount_type: c.discount_type,
  discount_value: c.discount_value,
  max_discount_amount: c.max_discount_amount ?? "",
  min_order_value: c.min_order_value,
  usage_limit_total: c.usage_limit_total != null ? String(c.usage_limit_total) : "",
  usage_limit_per_user: c.usage_limit_per_user != null ? String(c.usage_limit_per_user) : "",
  valid_from: toLocalInputValue(c.valid_from),
  valid_until: toLocalInputValue(c.valid_until),
  is_active: c.is_active,
});

const formToPayload = (f: FormState): CouponPayload => ({
  code: f.code.trim().toUpperCase(),
  description: f.description.trim() || undefined,
  discount_type: f.discount_type,
  discount_value: Number(f.discount_value),
  max_discount_amount: f.max_discount_amount.trim() ? Number(f.max_discount_amount) : null,
  min_order_value: f.min_order_value.trim() ? Number(f.min_order_value) : 0,
  usage_limit_total: f.usage_limit_total.trim() ? Number(f.usage_limit_total) : null,
  usage_limit_per_user: f.usage_limit_per_user.trim() ? Number(f.usage_limit_per_user) : null,
  valid_from: fromLocalInputValue(f.valid_from),
  valid_until: fromLocalInputValue(f.valid_until),
  is_active: f.is_active,
});

function CouponForm({
  form,
  setForm,
  onSubmit,
  submitting,
  submitLabel,
  onCancel,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  submitLabel: string;
  onCancel?: () => void;
}) {
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code">
          <input
            className={inputClass + " uppercase"}
            placeholder="DIWALI25"
            value={form.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            required
          />
        </Field>
        <Field label="Discount type">
          <select
            className={inputClass}
            value={form.discount_type}
            onChange={(e) => set("discount_type", e.target.value as DiscountType)}
          >
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed amount (₹)</option>
          </select>
        </Field>
      </div>

      <Field label="Description" hint="Optional — internal note, e.g. which promoter this is for">
        <input
          className={inputClass}
          placeholder="Diwali festival sale"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={form.discount_type === "percentage" ? "Discount %" : "Discount ₹"}>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={form.discount_value}
            onChange={(e) => set("discount_value", e.target.value)}
            required
          />
        </Field>
        {form.discount_type === "percentage" && (
          <Field label="Max discount ₹" hint="Cap for % coupons">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              placeholder="No cap"
              value={form.max_discount_amount}
              onChange={(e) => set("max_discount_amount", e.target.value)}
            />
          </Field>
        )}
      </div>

      <Field label="Minimum order value ₹" hint="Cart subtotal must reach this to use the coupon">
        <input
          type="number"
          min="0"
          step="0.01"
          className={inputClass}
          placeholder="0"
          value={form.min_order_value}
          onChange={(e) => set("min_order_value", e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Total usage limit" hint="Leave blank for unlimited">
          <input
            type="number"
            min="1"
            className={inputClass}
            placeholder="Unlimited"
            value={form.usage_limit_total}
            onChange={(e) => set("usage_limit_total", e.target.value)}
          />
        </Field>
        <Field label="Uses per user" hint="Leave blank for unlimited">
          <input
            type="number"
            min="1"
            className={inputClass}
            placeholder="Unlimited"
            value={form.usage_limit_per_user}
            onChange={(e) => set("usage_limit_per_user", e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Valid from">
          <input
            type="datetime-local"
            className={inputClass}
            value={form.valid_from}
            onChange={(e) => set("valid_from", e.target.value)}
            required
          />
        </Field>
        <Field label="Valid until">
          <input
            type="datetime-local"
            className={inputClass}
            value={form.valid_until}
            onChange={(e) => set("valid_until", e.target.value)}
            required
          />
        </Field>
      </div>

      <label className="flex items-center gap-2.5 text-sm font-semibold text-brand-black cursor-pointer">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => set("is_active", e.target.checked)}
          className="w-4 h-4 rounded accent-brand-orange"
        />
        Active (can be used right away, subject to the dates above)
      </label>

      <div className="flex items-center gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(emptyForm());
  const [adding, setAdding] = useState(false);

  const [editing, setEditing] = useState<Coupon | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await adminService.listCoupons(1, 100);
      setCoupons(res.items);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load coupons."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError("");
    try {
      await adminService.createCoupon(formToPayload(addForm));
      setShowAdd(false);
      setAddForm(emptyForm());
      fetchCoupons();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create coupon."));
    } finally {
      setAdding(false);
    }
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setEditForm(couponToForm(c));
    setModalError("");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setModalError("");
    try {
      const payload = formToPayload(editForm);
      // The code is treated as immutable once a coupon exists — strip it
      // from the PATCH so an accidental edit of the field can't silently
      // rename a coupon customers may already have.
      const { code: _code, ...updatePayload } = payload;
      void _code;
      await adminService.updateCoupon(editing.id, updatePayload);
      setEditing(null);
      fetchCoupons();
    } catch (err) {
      setModalError(getErrorMessage(err, "Failed to update coupon."));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: Coupon) => {
    try {
      await adminService.updateCoupon(c.id, { is_active: !c.is_active });
      fetchCoupons();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update coupon."));
    }
  };

  const handleDelete = async (c: Coupon) => {
    if (!window.confirm(`Delete coupon "${c.code}"? This can't be undone.`)) return;
    try {
      await adminService.deleteCoupon(c.id);
      fetchCoupons();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete coupon."));
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1500);
    });
  };

  return (
    <div>
      <PageHeader
        title="Coupons"
        subtitle="Create festival-sale or promoter-given discount codes"
        action={
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={16} /> New coupon
          </Button>
        }
      />

      {error && <ErrorNotice>{error}</ErrorNotice>}

      <div className="bg-white rounded-2xl border border-brand-brown/10 overflow-hidden">
        {loading ? (
          <LoadingBlock />
        ) : coupons.length === 0 ? (
          <EmptyState
            icon={Percent}
            title="No coupons yet"
            description="Create one for a festival sale or to give to a promoter."
            action={
              <Button onClick={() => setShowAdd(true)}>
                <Plus size={16} /> New coupon
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-brand-brown/45 uppercase tracking-wide border-b border-brand-brown/10">
                  <th className="px-5 py-3 font-semibold">Code</th>
                  <th className="px-3 py-3 font-semibold">Discount</th>
                  <th className="px-3 py-3 font-semibold">Usage</th>
                  <th className="px-3 py-3 font-semibold">Valid</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-brown/8">
                {coupons.map((c) => {
                  const status = couponStatus(c);
                  return (
                    <tr key={c.id} className="hover:bg-brand-brown/[0.03] transition-colors">
                      <td className="px-5 py-3">
                        <button
                          onClick={() => copyCode(c.code)}
                          className="flex items-center gap-1.5 font-mono font-bold text-brand-black hover:text-brand-orange transition-colors"
                          title="Copy code"
                        >
                          {c.code}
                          {copiedCode === c.code ? (
                            <Check size={13} className="text-green-600" />
                          ) : (
                            <Copy size={13} className="text-brand-brown/30" />
                          )}
                        </button>
                        {c.description && (
                          <p className="text-xs text-brand-brown/45 mt-0.5 max-w-[220px] truncate">{c.description}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-brand-brown/70">
                        {c.discount_type === "percentage" ? (
                          <>
                            {Number(c.discount_value)}%
                            {c.max_discount_amount ? ` (up to ${inr(c.max_discount_amount)})` : ""}
                          </>
                        ) : (
                          inr(c.discount_value)
                        )}
                        {Number(c.min_order_value) > 0 && (
                          <p className="text-xs text-brand-brown/40">Min order {inr(c.min_order_value)}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-brand-brown/70 tabular-nums">
                        {c.times_used}
                        {c.usage_limit_total != null ? ` / ${c.usage_limit_total}` : ""}
                        <p className="text-xs text-brand-brown/40">
                          {c.usage_limit_per_user != null ? `${c.usage_limit_per_user} per user` : "Unlimited per user"}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-brand-brown/60 text-xs">
                        {fmtDate(c.valid_from)} – {fmtDate(c.valid_until)}
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => toggleActive(c)} title="Click to toggle active">
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </button>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton onClick={() => openEdit(c)} title="Edit">
                            <Pencil size={14} />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDelete(c)}
                            title="Delete"
                            className="hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New coupon" width="max-w-lg">
        <CouponForm
          form={addForm}
          setForm={setAddForm}
          onSubmit={handleAdd}
          submitting={adding}
          submitLabel="Create coupon"
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.code}` : ""} width="max-w-lg">
        {modalError && <ErrorNotice>{modalError}</ErrorNotice>}
        <CouponForm
          form={editForm}
          setForm={setEditForm}
          onSubmit={handleEdit}
          submitting={saving}
          submitLabel="Save changes"
          onCancel={() => setEditing(null)}
        />
      </Modal>
    </div>
  );
}
