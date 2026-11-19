import type { AuditEntry } from "@/types/government";
import { AUDIT_SEED } from "../mock-data/government";
import { uid } from "../utils";

/** State-level audit log (local). Every consequential state action records here. Prototype only, not a tamper-proof ledger. */
const log: AuditEntry[] = structuredClone(AUDIT_SEED);
export const recordAudit = (e: Omit<AuditEntry, "id" | "at" | "actor" | "role" | "outcome"> & Partial<Pick<AuditEntry, "actor" | "role" | "outcome">>) => {
  log.unshift({ id: uid("aud"), at: new Date().toISOString(), actor: "State official (demo)", role: "State Education Officer", outcome: "success", ...e });
};
export const auditEntries = () => log;
