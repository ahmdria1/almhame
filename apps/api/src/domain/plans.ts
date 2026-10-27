import { COURTS, PUBLISHED_PLANS, type CourtType, type PlanCode } from "@elawyer/types";

export interface PlanDef {
  code: PlanCode;
  priceHalalas: number;
  memoLimit: number;
  chatLimit: number | null;
  courts: CourtType[];
  word: boolean;
  caseManagement: boolean;
  letterhead: boolean;
  seats: number;
}

const BASIC_COURTS: CourtType[] = ["general", "labor", "personal_status", "criminal"];

export const PLAN_DEFS: Record<PlanCode, PlanDef> = {
  free: {
    code: "free",
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
    priceHalalas: PUBLISHED_PLANS.pro.priceHalalas,
    memoLimit: PUBLISHED_PLANS.pro.memoLimit,
    chatLimit: PUBLISHED_PLANS.pro.chatLimit,
    courts: [...COURTS],
    word: true,
    caseManagement: true,
    letterhead: false,
    seats: PUBLISHED_PLANS.pro.seats,
  },
  office: {
    code: "office",
    priceHalalas: PUBLISHED_PLANS.office.priceHalalas,
    memoLimit: PUBLISHED_PLANS.office.memoLimit,
    chatLimit: PUBLISHED_PLANS.office.chatLimit,
    courts: [...COURTS],
    word: true,
    caseManagement: true,
    letterhead: true,
    seats: PUBLISHED_PLANS.office.seats,
  },
};

export function yearlyHalalas(monthly: number): number {
  return monthly * 12;
}

export function resolvePlan(
  code: PlanCode,
  override?: { priceHalalas: number; memoLimit: number; chatLimit: number | null } | null,
): PlanDef {
  const base = PLAN_DEFS[code];
  if (!override) return base;
  return {
    ...base,
    priceHalalas: override.priceHalalas,
    memoLimit: override.memoLimit,
    chatLimit: override.chatLimit,
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

export function courtAllowed(plan: PlanDef, court: CourtType): boolean {
  return plan.courts.includes(court);
}
