export const RELEASE_OWNER = "Ahmed Alamrani";
export const RELEASE_MARK = "AALMR-ELW-7F3C";

export const COURTS = [
  "general",
  "criminal",
  "traffic",
  "personal_status",
  "labor",
  "commercial",
  "enforcement",
  "administrative",
  "appeal",
  "supreme",
] as const;

export type CourtType = (typeof COURTS)[number];

export const MEMO_TYPES = ["lawsuit", "defense", "reply", "appeal"] as const;
export type MemoType = (typeof MEMO_TYPES)[number];

export const PLAN_CODES = ["free", "basic", "pro"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const DEFAULT_JURISDICTION = "SA" as const;

export const JURISDICTION_CATALOG = {
  SA: { code: "SA", currency: "SAR", minorPerUnit: 100, vatRateBps: 1500, numericCurrency: "682" },
} as const;

export type JurisdictionCode = keyof typeof JURISDICTION_CATALOG;

export function jurisdictionOf(code: string | null | undefined) {
  if (code && code in JURISDICTION_CATALOG) return JURISDICTION_CATALOG[code as JurisdictionCode];
  return JURISDICTION_CATALOG[DEFAULT_JURISDICTION];
}

/** Displayed prices already include VAT and the gateway fee. */
export const VAT_RATE = 0.15;
export const GATEWAY_FEE_RATE = 0.025;
export const GATEWAY_FEE_FIXED_HALALAS = 100;
export const FREE_CHAT_LIMIT = 5;
export const CHAT_PACK_QUESTIONS = 50;

export const SERVICE_CODES = ["review", "defense", "lawsuit", "objection", "chat_pack"] as const;
export type ServiceCode = (typeof SERVICE_CODES)[number];

export const SERVICE_PRICES_HALALAS: Record<ServiceCode, number> = {
  review: 2900,
  defense: 4900,
  lawsuit: 5900,
  objection: 6900,
  chat_pack: 1900,
};

export const SINGLE_MEMO_HALALAS = 900;

const SINGLE_MEMO_PRICE: Record<MemoType, number> = {
  lawsuit: SINGLE_MEMO_HALALAS,
  defense: SINGLE_MEMO_HALALAS,
  reply: SINGLE_MEMO_HALALAS,
  appeal: SINGLE_MEMO_HALALAS,
};

export function priceForMemoType(memoType: MemoType): number {
  return SINGLE_MEMO_PRICE[memoType];
}

export function ownerNetHalalas(
  priceHalalas: number,
  vatRate = VAT_RATE,
  feeRate = GATEWAY_FEE_RATE,
  feeFixedHalalas = GATEWAY_FEE_FIXED_HALALAS,
): number {
  return Math.round(priceHalalas * (1 / (1 + vatRate) - feeRate) - feeFixedHalalas);
}

export const PUBLISHED_PLANS: Record<
  PlanCode,
  { priceHalalas: number; memoLimit: number; chatLimit: number | null }
> = {
  free: { priceHalalas: 0, memoLimit: 1, chatLimit: FREE_CHAT_LIMIT },
  basic: { priceHalalas: 3900, memoLimit: 15, chatLimit: null },
  pro: { priceHalalas: 11900, memoLimit: 50, chatLimit: null },
};

export const LOCALES = [
  "ar",
  "en",
  "ur",
  "hi",
  "pa",
  "si",
  "bn",
  "ne",
  "fil",
  "tr",
  "am",
] as const;
export type Locale = (typeof LOCALES)[number];

export interface SessionUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  locale: string;
  theme: string;
  planCode: PlanCode;
  jurisdiction: JurisdictionCode;
  currency: string;
  chatCount: number;
  chatLimit: number | null;
  memoCountPeriod: number;
  memoLimit: number;
  memoRemaining: number;
  planRenewsAt: string | null;
  notifyHearings: boolean;
  orgId: string | null;
  orgRole: string | null;
  features: {
    word: boolean;
    caseManagement: boolean;
    letterhead: boolean;
    courts: CourtType[];
    seats: number;
  };
}

export interface PlanOffer {
  code: PlanCode;
  jurisdiction: JurisdictionCode;
  currency: string;
  priceHalalas: number;
  yearlyHalalas: number;
  memoLimit: number;
  chatLimit: number | null;
  courts: CourtType[];
  word: boolean;
  caseManagement: boolean;
  letterhead: boolean;
  seats: number;
}

export interface CitationView {
  kind: "article" | "sharia";
  id: string;
  number?: string;
  title: string;
  excerpt: string;
  sourceUrl: string;
  isSample: boolean;
  version?: string;
  effectiveDate?: string;
  lawName?: string;
}

export interface MemoView {
  id: string;
  title: string;
  court: CourtType;
  memoType: MemoType;
  body: string;
  status: string;
  flagged: boolean;
  caseId: string | null;
  chatId: string | null;
  updatedAt: string;
  citations: CitationView[];
}

export interface ChatSummary {
  id: string;
  title: string;
  court: CourtType;
  memoType: MemoType;
  caseId: string | null;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "counsel";
  content: string;
  createdAt: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
