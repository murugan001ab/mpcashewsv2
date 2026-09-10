"use client";
// src/app/admin/templates/page.tsx
// Admin-editable message templates: free-form email HTML, and the
// event → Meta-template-name/language mapping for WhatsApp (the WhatsApp
// template *body* itself is pre-approved by Meta and can't be edited here).
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Mail, MessageCircle, EyeOff } from "lucide-react";
import * as templateService from "@/services/templateService";
import type {
  EmailTemplate,
  EmailTemplateUpsertPayload,
  WhatsAppTemplate,
  WhatsAppTemplateUpdatePayload,
} from "@/types";
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

type Tab = "email" | "whatsapp";

export default function TemplatesPage() {
  const [tab, setTab] = useState<Tab>("email");

  return (
    <div>
      <PageHeader
        title="Templates"
        subtitle="Edit the email and WhatsApp messages the store sends automatically"
      />

      <div className="flex items-center gap-1 mb-5 bg-white rounded-xl border border-brand-brown/10 p-1 w-fit">
        <TabButton active={tab === "email"} onClick={() => setTab("email")} icon={Mail} label="Email" />
        <TabButton active={tab === "whatsapp"} onClick={() => setTab("whatsapp")} icon={MessageCircle} label="WhatsApp" />
      </div>

      {tab === "email" ? <EmailTemplatesPanel /> : <WhatsAppTemplatesPanel />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Mail;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
        active ? "bg-brand-orange text-white" : "text-brand-brown/60 hover:text-brand-black"
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

// ── Email templates ──────────────────────────────────────────────────────

function EmailTemplatesPanel() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newKey, setNewKey] = useState("");

  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<EmailTemplateUpsertPayload>({
    name: "",
    subject: "",
    html_body: "",
    description: "",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      setTemplates(await templateService.listEmailTemplates());
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load email templates."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openCreate = () => {
    if (!newKey.trim()) return;
    setEditing({ key: newKey.trim() } as EmailTemplate);
    setIsNew(true);
    setForm({ name: "", subject: "", html_body: "", description: "", is_active: true });
    setModalError("");
  };

  const openEdit = (t: EmailTemplate) => {
    setEditing(t);
    setIsNew(false);
    setForm({
      name: t.name,
      subject: t.subject,
      html_body: t.html_body,
      description: t.description ?? "",
      is_active: t.is_active,
    });
    setModalError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !form.name.trim() || !form.subject.trim() || !form.html_body.trim()) return;
    setSaving(true);
    setModalError("");
    try {
      if (isNew) {
        await templateService.upsertEmailTemplate(editing.key, form);
      } else {
        await templateService.updateEmailTemplate(editing.key, form);
      }
      setEditing(null);
      setNewKey("");
      fetchTemplates();
    } catch (err) {
      setModalError(getErrorMessage(err, "Failed to save template."));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: EmailTemplate) => {
    try {
      await templateService.updateEmailTemplate(t.key, { is_active: !t.is_active });
      fetchTemplates();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update template."));
    }
  };

  const handleDelete = async (t: EmailTemplate) => {
    if (!window.confirm(`Delete the "${t.name}" email template? This can't be undone.`)) return;
    try {
      await templateService.deleteEmailTemplate(t.key);
      fetchTemplates();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete template."));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
      <div className="bg-white rounded-2xl border border-brand-brown/10 p-5 h-fit">
        <h3 className="flex items-center gap-2 font-bold text-brand-black text-sm mb-4">
          <Plus size={16} className="text-brand-orange" /> New template
        </h3>
        <Field label="Key" hint="A short code the backend fires by, e.g. order_receipt">
          <input
            className={inputClass}
            placeholder="e.g. order_receipt"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
          />
        </Field>
        <Button type="button" className="w-full mt-4" disabled={!newKey.trim()} onClick={openCreate}>
          Create template
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-brand-brown/10 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-brand-brown/10">
          <Mail size={15} className="text-brand-brown/50" />
          <h3 className="font-bold text-brand-black text-sm">Email templates</h3>
          <span className="text-xs text-brand-brown/40 font-semibold">({templates.length})</span>
        </div>

        {error && (
          <div className="px-5 pt-4">
            <ErrorNotice>{error}</ErrorNotice>
          </div>
        )}

        {loading ? (
          <LoadingBlock />
        ) : templates.length === 0 ? (
          <EmptyState icon={Mail} title="No email templates yet" description="Create one using the form on the left." />
        ) : (
          <ul className="divide-y divide-brand-brown/8">
            {templates.map((t) => (
              <li key={t.key} className="flex items-center gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-brand-black truncate">{t.name}</p>
                  <p className="text-xs text-brand-brown/40 truncate">
                    {t.key} · {t.subject}
                  </p>
                </div>
                {!t.is_active && (
                  <Badge tone="neutral">
                    <EyeOff size={11} /> Disabled
                  </Badge>
                )}
                <button
                  onClick={() => toggleActive(t)}
                  className="text-xs font-semibold text-brand-brown/50 hover:text-brand-black transition-colors shrink-0"
                >
                  {t.is_active ? "Disable" : "Enable"}
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <IconButton onClick={() => openEdit(t)} title="Edit">
                    <Pencil size={14} />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(t)} title="Delete" className="hover:text-red-600 hover:bg-red-50">
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? `New template: ${editing?.key}` : `Edit: ${editing?.key}`} width="max-w-2xl">
        {modalError && <ErrorNotice>{modalError}</ErrorNotice>}
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Name">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </Field>
          <Field label="Subject">
            <input
              className={inputClass}
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              required
            />
          </Field>
          <Field label="HTML body" hint="Use {{placeholder}} for substitution, e.g. {{app_name}}, {{verify_url}}">
            <textarea
              className={`${inputClass} font-mono text-xs`}
              rows={12}
              value={form.html_body}
              onChange={(e) => setForm((f) => ({ ...f, html_body: e.target.value }))}
              required
            />
          </Field>
          <Field label="Description" hint="Optional — notes for other admins, e.g. which placeholders it uses">
            <input
              className={inputClass}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold text-brand-black">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active
          </label>
          <div className="flex items-center gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── WhatsApp templates ───────────────────────────────────────────────────
// No create/delete: keys are fixed to the events the backend actually
// fires, and Meta template bodies are pre-approved — only which template
// name/language an event points to is editable.

function WhatsAppTemplatesPanel() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState<WhatsAppTemplate | null>(null);
  const [form, setForm] = useState<WhatsAppTemplateUpdatePayload>({});
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      setTemplates(await templateService.listWhatsAppTemplates());
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load WhatsApp templates."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openEdit = (t: WhatsAppTemplate) => {
    setEditing(t);
    setForm({
      template_name: t.template_name,
      language_code: t.language_code,
      description: t.description ?? "",
      is_active: t.is_active,
    });
    setModalError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !form.template_name?.trim() || !form.language_code?.trim()) return;
    setSaving(true);
    setModalError("");
    try {
      await templateService.updateWhatsAppTemplate(editing.key, form);
      setEditing(null);
      fetchTemplates();
    } catch (err) {
      setModalError(getErrorMessage(err, "Failed to save template."));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: WhatsAppTemplate) => {
    try {
      await templateService.updateWhatsAppTemplate(t.key, { is_active: !t.is_active });
      fetchTemplates();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update template."));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-brand-brown/10 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-brand-brown/10">
        <MessageCircle size={15} className="text-brand-brown/50" />
        <h3 className="font-bold text-brand-black text-sm">WhatsApp event templates</h3>
        <span className="text-xs text-brand-brown/40 font-semibold">({templates.length})</span>
      </div>
      <p className="px-5 pt-4 text-xs text-brand-brown/50">
        Meta pre-approves the wording of each template, so it can&apos;t be edited here — only which
        approved template name and language a given event uses.
      </p>

      {error && (
        <div className="px-5 pt-4">
          <ErrorNotice>{error}</ErrorNotice>
        </div>
      )}

      {loading ? (
        <LoadingBlock />
      ) : templates.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No WhatsApp templates seeded yet" />
      ) : (
        <ul className="divide-y divide-brand-brown/8 mt-2">
          {templates.map((t) => (
            <li key={t.key} className="flex items-center gap-4 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-black truncate">{t.name}</p>
                <p className="text-xs text-brand-brown/40 truncate">
                  {t.key} · {t.template_name} ({t.language_code})
                </p>
              </div>
              {!t.is_active && (
                <Badge tone="neutral">
                  <EyeOff size={11} /> Disabled
                </Badge>
              )}
              <button
                onClick={() => toggleActive(t)}
                className="text-xs font-semibold text-brand-brown/50 hover:text-brand-black transition-colors shrink-0"
              >
                {t.is_active ? "Disable" : "Enable"}
              </button>
              <IconButton onClick={() => openEdit(t)} title="Edit">
                <Pencil size={14} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit: ${editing?.key}`}>
        {modalError && <ErrorNotice>{modalError}</ErrorNotice>}
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Meta template name" hint="Must match an approved template name in Meta Business Manager">
            <input
              className={inputClass}
              value={form.template_name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, template_name: e.target.value }))}
              required
            />
          </Field>
          <Field label="Language code" hint="e.g. en, en_US">
            <input
              className={inputClass}
              value={form.language_code ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, language_code: e.target.value }))}
              required
            />
          </Field>
          <Field label="Description">
            <input
              className={inputClass}
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold text-brand-black">
            <input
              type="checkbox"
              checked={form.is_active ?? true}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active
          </label>
          <div className="flex items-center gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
