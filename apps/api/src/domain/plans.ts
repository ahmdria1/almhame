import { COURTS, DEFAULT_JURISDICTION, FAIR_USE_CHAT_TURNS, FAIR_USE_UPLOAD_PAGES, JURISDICTION_CATALOG, PUBLISHED_PLANS, type CourtType, type JurisdictionCode, type PlanCode } from "@elawyer/types";

export interface PlanDef {
  code: PlanCode;
  jurisdiction: JurisdictionCode;
  currency: string;
  priceHalalas: number;
  memoLimit: number;
  chatLimit: number | null;
  validityDays: number;
  chatTurnsPerMemo: number;
  uploadPagesPerMemo: number;
  courts: string[];
  word: boolean;
  caseManagement: boolean;
  letterhead: boolean;
}

const BASIC_COURTS: CourtType[] = ["general", "labor", "personal_status", "criminal"];
const SA = JURISDICTION_CATALOG[DEFAULT_JURISDICTION];

function published(code: PlanCode, courts: string[], word: boolean, caseManagement: boolean): PlanDef {
  const row = PUBLISHED_PLANS[code];
  return {
    code,
    jurisdiction: DEFAULT_JURISDICTION,
    currency: SA.currency,
    priceHalalas: row.priceHalalas,
    memoLimit: row.memoLimit,
    chatLimit: row.chatLimit,
    validityDays: row.validityDays,
    chatTurnsPerMemo: FAIR_USE_CHAT_TURNS,
    uploadPagesPerMemo: FAIR_USE_UPLOAD_PAGES,
    courts,
    word,
    caseManagement,
    letterhead: false,
  };
}

export const PLAN_DEFS: Record<PlanCode, PlanDef> = {
  free: published("free", ["general", "labor"], false, true),
  basic: published("basic", BASIC_COURTS, false, true),
  pro: published("pro", [...COURTS], true, true),
};

export function resolvePlan(
  code: PlanCode,
  override?: { priceHalalas: number; memoLimit: number; chatLimit: number | null; currency?: string; courts?: string[]; validityDays?: number } | null,
): PlanDef {
  const base = PLAN_DEFS[code];
  if (!override) return base;
  return {
    ...base,
    priceHalalas: override.priceHalalas,
    memoLimit: override.memoLimit,
    chatLimit: override.chatLimit,
    currency: override.currency || base.currency,
    courts: override.courts && override.courts.length > 0 ? override.courts : base.courts,
    validityDays: override.validityDays ?? base.validityDays,
  };
}

export function chatsCounted(plan: PlanDef, lifetime: number, period: number): number {
  return plan.code === "free" ? lifetime : period;
}

export function chatQuota(plan: PlanDef, chatCount: number): { ok: true } | { ok: false; code: "QUOTA_CHATS" } {
  if (plan.chatLimit != null && chatCount >= plan.chatLimit) return { ok: false, code: "QUOTA_CHATS" };
  return { ok: true };
}

export function memoQuota(plan: PlanDef, used: number): { ok: true } | { ok: false; code: "QUOTA_MEMOS" } {
  if (used >= plan.memoLimit) return { ok: false, code: "QUOTA_MEMOS" };
  return { ok: true };
}

export function courtAllowed(plan: PlanDef, court: string): boolean {
  return plan.courts.includes(court);
}
