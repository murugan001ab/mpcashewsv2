"use client";
// src/components/Footer.tsx
// Entirely driven by GET /settings (admin-editable via /admin/settings) —
// address, FSSAI/GSTIN, contact details, socials, trademark & copyright
// text all come from there. No hardcoded business info in this component.
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Mail,
  Phone,
  MessageCircle,
  Clock,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
} from "lucide-react";
import * as settingsService from "@/services/settingsService";
import type { SiteSettings } from "@/types";

const SOCIALS: { key: keyof SiteSettings; icon: typeof Facebook; label: string }[] = [
  { key: "facebook_url", icon: Facebook, label: "Facebook" },
  { key: "instagram_url", icon: Instagram, label: "Instagram" },
  { key: "twitter_url", icon: Twitter, label: "Twitter / X" },
  { key: "youtube_url", icon: Youtube, label: "YouTube" },
  { key: "linkedin_url", icon: Linkedin, label: "LinkedIn" },
];

export default function Footer() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    settingsService
      .getSiteSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  const addressLines = [
    settings?.address_line1,
    settings?.address_line2,
    [settings?.city, settings?.state, settings?.pincode].filter(Boolean).join(", "),
    settings?.country,
  ].filter(Boolean);

  const hasAddress = addressLines.length > 0;
  const hasLegal = settings?.fssai_license_no || settings?.gstin || settings?.cin;
  const activeSocials = SOCIALS.filter((s) => settings?.[s.key]);

  return (
    <footer className="relative bg-gradient-to-b from-[#1c130b] to-brand-black text-white/70 mt-auto border-t-4 border-brand-orange/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Business identity */}
        <div>
          <h3 className="text-white font-extrabold text-lg mb-3">
            {settings?.business_name || "MP Cashews"}
          </h3>
          {settings?.footer_about && (
            <p className="text-sm leading-relaxed mb-4">{settings.footer_about}</p>
          )}
          {activeSocials.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              {activeSocials.map(({ key, icon: Icon, label }) => (
                <a
                  key={key}
                  href={settings?.[key] as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 hover:bg-brand-orange hover:text-white transition-colors"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div>
          <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-4">Quick links</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
            <li><Link href="/blogs" className="hover:text-white transition-colors">Blog</Link></li>
            <li><Link href="/become-partner" className="hover:text-white transition-colors">Become a Partner</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-4">Contact us</h4>
          <ul className="space-y-3 text-sm">
            {hasAddress && (
              <li className="flex items-start gap-2.5">
                <MapPin size={15} className="mt-0.5 shrink-0 text-brand-orange" />
                <span>{addressLines.join(", ")}</span>
              </li>
            )}
            {settings?.contact_phone && (
              <li className="flex items-center gap-2.5">
                <Phone size={15} className="shrink-0 text-brand-orange" />
                <a href={`tel:${settings.contact_phone}`} className="hover:text-white transition-colors">
                  {settings.contact_phone}
                </a>
              </li>
            )}
            {settings?.whatsapp_number && (
              <li className="flex items-center gap-2.5">
                <MessageCircle size={15} className="shrink-0 text-brand-orange" />
                <a
                  href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  {settings.whatsapp_number}
                </a>
              </li>
            )}
            {settings?.contact_email && (
              <li className="flex items-center gap-2.5">
                <Mail size={15} className="shrink-0 text-brand-orange" />
                <a href={`mailto:${settings.contact_email}`} className="hover:text-white transition-colors">
                  {settings.contact_email}
                </a>
              </li>
            )}
            {settings?.support_hours && (
              <li className="flex items-center gap-2.5">
                <Clock size={15} className="shrink-0 text-brand-orange" />
                <span>{settings.support_hours}</span>
              </li>
            )}
          </ul>
        </div>

        {/* Legal / compliance */}
        {hasLegal && (
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm">
              {settings?.fssai_license_no && <li>FSSAI Lic. No: {settings.fssai_license_no}</li>}
              {settings?.gstin && <li>GSTIN: {settings.gstin}</li>}
              {settings?.cin && <li>CIN: {settings.cin}</li>}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/40">
          <p>{settings?.copyright_text || `© ${new Date().getFullYear()} ${settings?.business_name || "MP Cashews"}. All rights reserved.`}</p>
          {settings?.trademark_text && <p>{settings.trademark_text}</p>}
        </div>
      </div>
    </footer>
  );
}
