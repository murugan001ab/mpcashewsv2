// src/services/templateService.ts
// Admin-only endpoints under /admin/templates/* — editable email templates
// (free-form HTML) and WhatsApp event-to-template mappings (Meta template
// bodies are pre-approved, so only the template name/language are editable).
import { get, put, patch, del } from "./api";
import type {
  EmailTemplate,
  EmailTemplateUpsertPayload,
  EmailTemplateUpdatePayload,
  WhatsAppTemplate,
  WhatsAppTemplateUpdatePayload,
} from "@/types";

// ── Email templates ──────────────────────────────────────────────────────
export const listEmailTemplates = (): Promise<EmailTemplate[]> =>
  get<EmailTemplate[]>("/admin/templates/email");

export const getEmailTemplate = (key: string): Promise<EmailTemplate> =>
  get<EmailTemplate>(`/admin/templates/email/${key}`);

export const upsertEmailTemplate = (
  key: string,
  data: EmailTemplateUpsertPayload
): Promise<EmailTemplate> => put<EmailTemplate>(`/admin/templates/email/${key}`, data);

export const updateEmailTemplate = (
  key: string,
  data: EmailTemplateUpdatePayload
): Promise<EmailTemplate> => patch<EmailTemplate>(`/admin/templates/email/${key}`, data);

export const deleteEmailTemplate = (key: string): Promise<void> =>
  del<void>(`/admin/templates/email/${key}`);

// ── WhatsApp templates ───────────────────────────────────────────────────
// No create/delete — keys are fixed to the events the backend actually
// fires (see app/services/whatsapp.py); admins can only repoint which
// approved Meta template name/language each event uses.
export const listWhatsAppTemplates = (): Promise<WhatsAppTemplate[]> =>
  get<WhatsAppTemplate[]>("/admin/templates/whatsapp");

export const getWhatsAppTemplate = (key: string): Promise<WhatsAppTemplate> =>
  get<WhatsAppTemplate>(`/admin/templates/whatsapp/${key}`);

export const updateWhatsAppTemplate = (
  key: string,
  data: WhatsAppTemplateUpdatePayload
): Promise<WhatsAppTemplate> => patch<WhatsAppTemplate>(`/admin/templates/whatsapp/${key}`, data);
