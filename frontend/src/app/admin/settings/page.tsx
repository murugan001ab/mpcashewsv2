"use client";
// src/app/admin/settings/page.tsx
// Single-row site settings: business identity, address, contact, legal
// (FSSAI/GSTIN), socials and footer/copyright text. Everything here is
// exactly what the public storefront footer reads from GET /settings.
import { useEffect, useState } from "react";
import { Save, Building2, MapPin, Phone, ShieldCheck, Share2 } from "lucide-react";
import * as adminService from "@/services/adminService";
import { getErrorMessage } from "@/utils/apiError";
import type { SiteSettingsUpdatePayload } from "@/types";
import { PageHeader, Button, Field, inputClass, ErrorNotice, LoadingBlock } from "@/components/admin/ui";

const EMPTY: SiteSettingsUpdatePayload = {
  business_name: "",
  trademark_text: "",
  footer_about: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "",
  contact_email: "",
  contact_phone: "",
  whatsapp_number: "",
  support_hours: "",
  fssai_license_no: "",
  gstin: "",
  cin: "",
  facebook_url: "",
  instagram_url: "",
  twitter_url: "",
  youtube_url: "",
  linkedin_url: "",
  copyright_text: "",
};

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Building2;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-brand-brown/10 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-brand-orange" />
        <div>
          <h3 className="font-bold text-brand-black text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-brand-brown/45">{subtitle}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [form, setForm] = useState<SiteSettingsUpdatePayload>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const field = (key: keyof SiteSettingsUpdatePayload) => ({
    value: form[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  useEffect(() => {
    (async () => {
      try {
        const s = await adminService.getAdminSiteSettings();
        setForm({ ...EMPTY, ...s });
      } catch (err) {
        setError(getErrorMessage(err, "Couldn't load site settings."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = await adminService.updateSiteSettings(form);
      setForm({ ...EMPTY, ...updated });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save settings."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingBlock label="Loading settings…" />;

  return (
    <div>
      <PageHeader
        title="Site settings"
        subtitle="Business info, address, legal & contact details shown in the storefront footer"
        action={
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
          </Button>
        }
      />

      {error && <ErrorNotice>{error}</ErrorNotice>}

      <form onSubmit={handleSave} className="space-y-5">
        <Section icon={Building2} title="Business identity" subtitle="Name, trademark line and footer blurb">
          <Field label="Business name">
            <input className={inputClass} {...field("business_name")} placeholder="e.g. MP Cashews Pvt. Ltd." />
          </Field>
          <Field label="Trademark text" hint="e.g. MPCashews® is a registered trademark of ...">
            <input className={inputClass} {...field("trademark_text")} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Footer about text" hint="Short blurb shown in the footer, below the logo">
              <textarea className={inputClass} rows={2} {...field("footer_about")} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Copyright text" hint="e.g. © 2026 MP Cashews. All rights reserved.">
              <input className={inputClass} {...field("copyright_text")} />
            </Field>
          </div>
        </Section>

        <Section icon={MapPin} title="Address">
          <div className="sm:col-span-2">
            <Field label="Address line 1">
              <input className={inputClass} {...field("address_line1")} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Address line 2">
              <input className={inputClass} {...field("address_line2")} />
            </Field>
          </div>
          <Field label="City">
            <input className={inputClass} {...field("city")} />
          </Field>
          <Field label="State">
            <input className={inputClass} {...field("state")} />
          </Field>
          <Field label="Pincode">
            <input className={inputClass} {...field("pincode")} />
          </Field>
          <Field label="Country">
            <input className={inputClass} {...field("country")} />
          </Field>
        </Section>

        <Section icon={Phone} title="Contact">
          <Field label="Contact email">
            <input className={inputClass} type="email" {...field("contact_email")} />
          </Field>
          <Field label="Contact phone">
            <input className={inputClass} {...field("contact_phone")} />
          </Field>
          <Field label="WhatsApp number">
            <input className={inputClass} {...field("whatsapp_number")} />
          </Field>
          <Field label="Support hours" hint="e.g. Mon–Sat, 9am–6pm">
            <input className={inputClass} {...field("support_hours")} />
          </Field>
        </Section>

        <Section icon={ShieldCheck} title="Legal & compliance">
          <Field label="FSSAI license number">
            <input className={inputClass} {...field("fssai_license_no")} />
          </Field>
          <Field label="GSTIN">
            <input className={inputClass} {...field("gstin")} />
          </Field>
          <Field label="CIN" hint="Optional — company identification number">
            <input className={inputClass} {...field("cin")} />
          </Field>
        </Section>

        <Section icon={Share2} title="Social links">
          <Field label="Facebook">
            <input className={inputClass} {...field("facebook_url")} placeholder="https://facebook.com/..." />
          </Field>
          <Field label="Instagram">
            <input className={inputClass} {...field("instagram_url")} placeholder="https://instagram.com/..." />
          </Field>
          <Field label="Twitter / X">
            <input className={inputClass} {...field("twitter_url")} placeholder="https://x.com/..." />
          </Field>
          <Field label="YouTube">
            <input className={inputClass} {...field("youtube_url")} placeholder="https://youtube.com/..." />
          </Field>
          <Field label="LinkedIn">
            <input className={inputClass} {...field("linkedin_url")} placeholder="https://linkedin.com/..." />
          </Field>
        </Section>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            <Save size={16} /> {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
