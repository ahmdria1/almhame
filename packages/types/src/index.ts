export const RELEASE_OWNER = "Ahmed Alamrani";
export const RELEASE_MARK = "AALMR-ELW-7F3C";

export const COURTS = [
  "general",
  "criminal",
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

export const PLAN_CODES = ["free", "basic", "pro", "office"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const PAY_PER_MEMO_HALALAS = 2900;

export const PUBLISHED_PLANS: Record<
  PlanCode,
  { priceHalalas: number; memoLimit: number; chatLimit: number | null; seats: number }
> = {
  free: { priceHalalas: 0, memoLimit: 5, chatLimit: 5, seats: 1 },
  basic: { priceHalalas: 9900, memoLimit: 30, chatLimit: null, seats: 1 },
  pro: { priceHalalas: 24900, memoLimit: 100, chatLimit: null, seats: 1 },
  office: { priceHalalas: 59900, memoLimit: 100, chatLimit: null, seats: 5 },
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
  priceHalalas: number;
  yearlyHalalas: number;
  memoLimit: number;
  chatLimit: number | null;
  courts: CourtType[];
  word: boolean;
  caseManagement: boolean;
  letterhead: boolean;
  seats: number;
  payPerMemoHalalas: number;
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
