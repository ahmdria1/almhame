export { composerBox, composerKeyAction } from "./composer";

export {
  NOTICE_CUES,
  noticeChannelId,
  noticeCue,
  shouldPlayNotice,
  soundTier,
  type NoticeCue,
  type NoticePriority,
  type NoticeSoundMode,
  type SoundTier,
} from "./notices";

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

export const PLAN_CODES = ["free", "basic", "pro"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const SOUND_MODES = ["all", "urgent", "off"] as const;
export type SoundMode = (typeof SOUND_MODES)[number];

export const HEARING_KINDS = ["hearing", "objection_deadline", "appeal_deadline"] as const;
export type HearingKind = (typeof HEARING_KINDS)[number];

export const FAIR_USE_CHAT_TURNS = 10;
export const FAIR_USE_UPLOAD_PAGES = 30;
export const PLAN_VALIDITY_DAYS = 30;

export const DEFAULT_JURISDICTION = "SA" as const;

export const JURISDICTION_CATALOG = {
  SA: { code: "SA", currency: "SAR", minorPerUnit: 100, vatRateBps: 1500, numericCurrency: "682" },
} as const;

export type JurisdictionCode = keyof typeof JURISDICTION_CATALOG;

export function jurisdictionOf(code: string | null | undefined) {
  if (code && code in JURISDICTION_CATALOG) return JURISDICTION_CATALOG[code as JurisdictionCode];
  return JURISDICTION_CATALOG[DEFAULT_JURISDICTION];
}

export const PAY_PER_MEMO_HALALAS = 900;

export const PUBLISHED_PLANS: Record<
  PlanCode,
  { priceHalalas: number; memoLimit: number; chatLimit: number | null; validityDays: number }
> = {
  free: { priceHalalas: 0, memoLimit: 1, chatLimit: null, validityDays: 0 },
  basic: { priceHalalas: 3900, memoLimit: 15, chatLimit: null, validityDays: PLAN_VALIDITY_DAYS },
  pro: { priceHalalas: 11900, memoLimit: 50, chatLimit: null, validityDays: PLAN_VALIDITY_DAYS },
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
  planExpiresAt: string | null;
  notifyHearings: boolean;
  soundMode: SoundMode;
  orgId: string | null;
  orgRole: string | null;
  features: {
    word: boolean;
    caseManagement: boolean;
    letterhead: boolean;
    courts: CourtType[];
    deadlines: boolean;
  };
}

export interface PlanOffer {
  code: PlanCode;
  jurisdiction: JurisdictionCode;
  currency: string;
  priceHalalas: number;
  memoLimit: number;
  chatLimit: number | null;
  chatTurnsPerMemo: number;
  uploadPagesPerMemo: number;
  validityDays: number;
  courts: CourtType[];
  word: boolean;
  caseManagement: boolean;
  letterhead: boolean;
  payPerMemoHalalas: number;
  oneTime: true;
  autoRenew: false;
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

export interface HearingPrepItem {
  questionAr: string;
  questionClient: string;
  answerAr: string;
  answerClient: string;
}

export interface HearingPrepView {
  items: HearingPrepItem[];
  interpreterTipAr: string;
  interpreterTipClient: string;
  disclaimer: string;
}

export interface MemoSummaryView {
  locale: string;
  text: string;
  notice: string;
}

export interface MemoView {
  id: string;
  title: string;
  court: CourtType;
  memoType: MemoType;
  body: string;
  summary: MemoSummaryView | null;
  hearingPrep: HearingPrepView | null;
  status: string;
  flagged: boolean;
  caseId: string | null;
  chatId: string | null;
  updatedAt: string;
  citations: CitationView[];
}

export interface AssessmentView {
  id: string;
  court: string;
  locale: string;
  caseType: string;
  strengths: string[];
  weaknesses: string[];
  missingDocuments: string[];
  recommendedPath: string;
  successLow: number;
  successHigh: number;
  reasons: string[];
  disclaimer: string;
  createdAt: string;
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
