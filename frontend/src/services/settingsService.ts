// src/services/settingsService.ts
// Public site settings (/settings) — business/contact/legal info the footer
// and legal pages render. Admin read/write lives in adminService.ts since it
// requires get_current_admin, same split as blogService's public/admin calls.
import { get } from "./api";
import type { SiteSettings } from "@/types";

export const getSiteSettings = (): Promise<SiteSettings> => get<SiteSettings>("/settings");
