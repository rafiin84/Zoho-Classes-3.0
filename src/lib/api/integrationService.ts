import type { Connector } from "@/types/institution";
import { simulate, ServiceError } from "./latency";
import { ago } from "../format";
import { recordAudit } from "./governanceService";

const C = (id: string, name: string, purpose: string, state: Connector["state"], scope: string, icon: string, config: Record<string, string> = {}, last?: number): Connector => ({ id, name, purpose, state, scope, icon, config, lastSync: last ? ago(last) : undefined, testLog: [] });
const items: Connector[] = [
  C("zoho-crm", "Zoho CRM & other Zoho apps", "Sync admissions leads and parent contacts with Zoho CRM; link Zoho Books and Zoho People.", "Demo", "Leads, contacts (no student records)", "Database", { workspace: "greenfield-demo", module: "Leads" }, 90),
  C("workplace", "Zoho Workplace", "Mail, calendar and directory for staff accounts.", "Not connected", "Staff directory, calendar", "Envelope"),
  C("saml", "SAML identity provider", "Single sign-on for staff and students through your identity provider.", "Not connected", "Authentication", "ShieldCheck", { entityId: "", ssoUrl: "", metadataUrl: "", emailAttr: "email", nameAttr: "displayName", roleAttr: "role" }),
  C("emis", "Government EMIS", "Share aggregated enrolment and attendance with the state education management system.", "Connected (demo)", "Aggregated counts only", "MapTrifold", { endpoint: "emis.karuvana.example (demo)" }, 1500),
  C("lms", "External LMS / education systems", "Exchange rosters and course completions with another LMS (consent-based).", "Not connected", "Rosters, completions", "BookBookmark"),
  C("ai", "AI model providers", "Bring-your-own-key AI providers. Configured under AI Providers (no Zoho-owned model).", "Demo", "AI features per policy", "Cpu", { note: "See AI Providers (BYOK)" }),
  C("payments", "Payment gateway", "Collect institutional fees online. Prototype uses simulated payments only.", "Demo", "Fee payments (simulated)", "Receipt", { mode: "Simulated" }, 30),
  C("video", "Video conferencing provider", "Host live classes through your conferencing provider.", "Not connected", "Live classes", "VideoCamera"),
  C("storage", "Storage & video delivery", "Store uploaded assets and stream recorded lessons.", "Connected (demo)", "Course assets", "FileText", { bucket: "greenfield-demo-assets" }, 600),
  C("calendar", "Calendar service", "Publish the school calendar and events to staff and parents.", "Not connected", "Calendar events", "CalendarBlank"),
];
const find = (id: string) => { const c = items.find((x) => x.id === id); if (!c) throw new ServiceError("Connector not found", "unavailable"); return c; };
export const integrationService = {
  list: () => simulate(() => items, { failKey: "integrations" }),
  saveConfig: (id: string, config: Record<string, string>) => simulate(() => {
    const c = find(id);
    if (id === "saml") {
      if (!/^https:\/\//.test(config.ssoUrl ?? "")) throw new ServiceError("SSO URL must start with https://", "validation");
      if (!(config.entityId ?? "").trim()) throw new ServiceError("Entity ID is required.", "validation");
      if (!config.metadataUrl && !(config.metadataXml ?? "").includes("<")) throw new ServiceError("Provide a metadata URL or paste metadata XML.", "validation");
      if (!config.emailAttr?.trim()) throw new ServiceError("Map the email attribute.", "validation");
    }
    c.config = { ...c.config, ...config }; return c;
  }),
  test: (id: string, outcome: "success" | "failure") => simulate(() => {
    const c = find(id);
    if (id === "saml" && !c.config.ssoUrl) throw new ServiceError("Save the configuration before testing.", "validation");
    const ok = outcome === "success"; c.testLog.unshift({ at: new Date().toISOString(), ok, msg: ok ? "Simulated handshake succeeded. No real connection was made." : "Simulated failure: provider did not respond (demo)." });
    return { ok, msg: c.testLog[0].msg };
  }, { ms: 900 }),
  connect: (id: string) => simulate(() => { const c = find(id); c.state = "Connected (demo)"; c.lastSync = new Date().toISOString(); recordAudit({ actor: "Imran Ali", actorRole: "Institution admin", action: "Connected integration (demo)", category: "Tenant settings", target: c.name, context: "Integrations" }); return c; }),
  disconnect: (id: string) => simulate(() => { const c = find(id); c.state = "Not connected"; c.lastSync = undefined; recordAudit({ actor: "Imran Ali", actorRole: "Institution admin", action: "Disconnected integration", category: "Tenant settings", target: c.name, context: "Integrations" }); return c; }),
  sync: (id: string) => simulate(() => { const c = find(id); if (c.state !== "Connected (demo)") throw new ServiceError("Connect first.", "validation"); c.lastSync = new Date().toISOString(); return c; }, { ms: 700 }),
};
