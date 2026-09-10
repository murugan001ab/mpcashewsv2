"use client";
// src/app/admin/reviews/page.tsx
// Review moderation: approve/reject customer reviews, post an official
// reply, or remove spam/abuse. Filters mirror the backend's admin_list
// (approval status only — filtering by product isn't exposed in this UI).
import { useEffect, useState } from "react";
import { Star, Check, X, MessageSquare, Trash2, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import * as adminService from "@/services/adminService";
import { getErrorMessage } from "@/utils/apiError";
import type { Review } from "@/types";
import {
  PageHeader,
  Badge,
  Button,
  IconButton,
  LoadingBlock,
  EmptyState,
  ErrorNotice,
  Modal,
  inputClass,
} from "@/components/admin/ui";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

type ApprovalFilter = "" | "true" | "false";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={13} fill={i < rating ? "currentColor" : "none"} className={i < rating ? "" : "text-brand-brown/20"} />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState<ApprovalFilter>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [replying, setReplying] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const load = async (p = page, f = filter) => {
    setLoading(true);
    setError("");
    try {
      const res = await adminService.listAdminReviews({
        page: p,
        page_size: 15,
        ...(f ? { is_approved: f === "true" } : {}),
      });
      setReviews(res.items);
      setTotal(res.total);
      setPages(res.pages);
      setPage(res.page);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load reviews."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleApprove = async (r: Review) => {
    setBusyId(r.id);
    try {
      await adminService.approveReview(r.id);
      load(page, filter);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to approve review."));
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (r: Review) => {
    setBusyId(r.id);
    try {
      await adminService.rejectReview(r.id);
      load(page, filter);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to reject review."));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (r: Review) => {
    if (!window.confirm(`Permanently delete this review by ${r.user.full_name}?`)) return;
    setBusyId(r.id);
    try {
      await adminService.deleteReviewAdmin(r.id);
      load(page, filter);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete review."));
    } finally {
      setBusyId(null);
    }
  };

  const openReply = (r: Review) => {
    setReplying(r);
    setReplyText(r.admin_reply ?? "");
    setModalError("");
  };

  const handleSaveReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replying || !replyText.trim()) return;
    setSaving(true);
    setModalError("");
    try {
      await adminService.replyToReview(replying.id, replyText.trim());
      setReplying(null);
      load(page, filter);
    } catch (err) {
      setModalError(getErrorMessage(err, "Failed to save reply."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Reviews"
        subtitle={`${total} review${total === 1 ? "" : "s"} total`}
        action={
          <select
            className={inputClass + " w-auto"}
            value={filter}
            onChange={(e) => setFilter(e.target.value as ApprovalFilter)}
          >
            <option value="">All reviews</option>
            <option value="false">Pending approval</option>
            <option value="true">Approved</option>
          </select>
        }
      />

      {error && <ErrorNotice>{error}</ErrorNotice>}

      <div className="bg-white rounded-2xl border border-brand-brown/10 overflow-hidden">
        {loading ? (
          <LoadingBlock />
        ) : reviews.length === 0 ? (
          <EmptyState icon={Star} title="No reviews found" description="Customer reviews will appear here." />
        ) : (
          <>
            <ul className="divide-y divide-brand-brown/8">
              {reviews.map((r) => (
                <li key={r.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-brand-black">{r.user.full_name}</p>
                        {r.is_verified_purchase && (
                          <Badge tone="green">
                            <ShieldCheck size={11} /> Verified purchase
                          </Badge>
                        )}
                        <Badge tone={r.is_approved ? "green" : "amber"}>
                          {r.is_approved ? "Approved" : "Pending"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Stars rating={r.rating} />
                        <span className="text-xs text-brand-brown/40">{fmtDate(r.created_at)}</span>
                      </div>
                      {r.title && <p className="text-sm font-semibold text-brand-black mt-2">{r.title}</p>}
                      {r.comment && <p className="text-sm text-brand-brown/70 mt-1">{r.comment}</p>}
                      {r.admin_reply && (
                        <div className="mt-2.5 bg-brand-brown/5 rounded-xl px-3.5 py-2.5">
                          <p className="text-xs font-semibold text-brand-brown/50 mb-0.5">Store reply</p>
                          <p className="text-sm text-brand-black">{r.admin_reply}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {r.is_approved ? (
                        <IconButton
                          onClick={() => handleReject(r)}
                          disabled={busyId === r.id}
                          title="Hide from public view"
                          className="hover:text-amber-600 hover:bg-amber-50"
                        >
                          <X size={15} />
                        </IconButton>
                      ) : (
                        <IconButton
                          onClick={() => handleApprove(r)}
                          disabled={busyId === r.id}
                          title="Approve"
                          className="hover:text-green-600 hover:bg-green-50"
                        >
                          <Check size={15} />
                        </IconButton>
                      )}
                      <IconButton onClick={() => openReply(r)} title="Reply">
                        <MessageSquare size={15} />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDelete(r)}
                        disabled={busyId === r.id}
                        title="Delete"
                        className="hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-brand-brown/10">
                <p className="text-xs text-brand-brown/50">
                  Page {page} of {pages}
                </p>
                <div className="flex items-center gap-1.5">
                  <IconButton disabled={page <= 1} onClick={() => load(page - 1, filter)}>
                    <ChevronLeft size={15} />
                  </IconButton>
                  <IconButton disabled={page >= pages} onClick={() => load(page + 1, filter)}>
                    <ChevronRight size={15} />
                  </IconButton>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal open={!!replying} onClose={() => setReplying(null)} title="Reply to review">
        {modalError && <ErrorNotice>{modalError}</ErrorNotice>}
        <form onSubmit={handleSaveReply} className="space-y-4">
          <textarea
            className={`${inputClass} min-h-[110px]`}
            placeholder="Write an official store reply…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            required
          />
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setReplying(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Saving…" : "Post reply"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
