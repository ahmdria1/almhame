import { COURTS, type CourtType, type PlanCode } from "@elawyer/types";

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
    priceHalalas: 0,
    memoLimit: 5,
    chatLimit: 5,
    courts: ["general", "labor"],
    word: false,
    caseManagement: false,
    letterhead: false,
    seats: 1,
  },
  basic: {
    code: "basic",
    priceHalalas: 9900,
    memoLimit: 30,
    chatLimit: null,
    courts: BASIC_COURTS,
    word: false,
    caseManagement: false,
    letterhead: false,
    seats: 1,
  },
  pro: {
    code: "pro",
    priceHalalas: 24900,
    memoLimit: 100,
    chatLimit: null,
    courts: [...COURTS],
    word: true,
    caseManagement: true,
    letterhead: false,
    seats: 1,
  },
  office: {
    code: "office",
    priceHalalas: 59900,
    memoLimit: 100,
    chatLimit: null,
    courts: [...COURTS],
    word: true,
    caseManagement: true,
    letterhead: true,
    seats: 5,
  },
};

export function yearlyHalalas(monthly: number): number {
  return monthly * 12;
}

export function chatQuota(plan: PlanCode, chatCount: number): { ok: true } | { ok: false; code: "QUOTA_CHATS" } {
  const limit = PLAN_DEFS[plan].chatLimit;
  if (limit != null && chatCount >= limit) return { ok: false, code: "QUOTA_CHATS" };
  return { ok: true };
}

export function memoQuota(plan: PlanCode, used: number): { ok: true } | { ok: false; code: "QUOTA_MEMOS" } {
  if (used >= PLAN_DEFS[plan].memoLimit) return { ok: false, code: "QUOTA_MEMOS" };
  return { ok: true };
}

export function courtAllowed(plan: PlanCode, court: CourtType): boolean {
  return PLAN_DEFS[plan].courts.includes(court);
}
