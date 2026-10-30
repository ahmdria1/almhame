import { COURTS, DEFAULT_JURISDICTION, JURISDICTION_CATALOG, PUBLISHED_PLANS, type CourtType, type JurisdictionCode, type PlanCode } from "@elawyer/types";

export interface PlanDef {
  code: PlanCode;
  jurisdiction: JurisdictionCode;
  currency: string;
  priceHalalas: number;
  memoLimit: number;
  chatLimit: number | null;
  courts: string[];
  word: boolean;
  caseManagement: boolean;
  letterhead: boolean;
  seats: number;
}

const BASIC_COURTS: CourtType[] = ["general", "labor", "personal_status", "criminal"];
const SA = JURISDICTION_CATALOG[DEFAULT_JURISDICTION];

export const PLAN_DEFS: Record<PlanCode, PlanDef> = {
  free: {
    code: "free",
    jurisdiction: DEFAULT_JURISDICTION,
    currency: SA.currency,
    priceHalalas: PUBLISHED_PLANS.free.priceHalalas,
    memoLimit: PUBLISHED_PLANS.free.memoLimit,
    chatLimit: PUBLISHED_PLANS.free.chatLimit,
    courts: ["general", "labor"],
    word: false,
    caseManagement: false,
    letterhead: false,
    seats: PUBLISHED_PLANS.free.seats,
  },
  basic: {
    code: "basic",
    jurisdiction: DEFAULT_JURISDICTION,
    currency: SA.currency,
    priceHalalas: PUBLISHED_PLANS.basic.priceHalalas,
    memoLimit: PUBLISHED_PLANS.basic.memoLimit,
    chatLimit: PUBLISHED_PLANS.basic.chatLimit,
    courts: BASIC_COURTS,
    word: false,
    caseManagement: false,
    letterhead: false,
    seats: PUBLISHED_PLANS.basic.seats,
  },
  pro: {
    code: "pro",
    jurisdiction: DEFAULT_JURISDICTION,
    currency: SA.currency,
    priceHalalas: PUBLISHED_PLANS.pro.priceHalalas,
    memoLimit: PUBLISHED_PLANS.pro.memoLimit,
    chatLimit: PUBLISHED_PLANS.pro.chatLimit,
    courts: [...COURTS],
    word: true,
    caseManagement: true,
    letterhead: false,
    seats: PUBLISHED_PLANS.pro.seats,
  },
};

export function yearlyHalalas(monthly: number): number {
  return monthly * 12;
}

export function resolvePlan(
  code: PlanCode,
  override?: { priceHalalas: number; memoLimit: number; chatLimit: number | null; currency?: string; courts?: string[] } | null,
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
