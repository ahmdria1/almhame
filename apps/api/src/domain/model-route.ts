import type { PlanCode } from "@elawyer/types";

export const CACHED_SYSTEM_PREFIX = [
  "Draft and answer for Saudi court filings.",
  "Use only the statute articles supplied after this instruction.",
  "Do not invent an article number or a quotation.",
  "Reply in Arabic.",
].join("\n");

export const PLAN_TOKEN_BUDGET: Record<PlanCode, number> = {
  free: 20000,
  basic: 120000,
  pro: 400000,
};

export interface Turn {
  role: "user" | "assistant";
  text: string;
}

export function estimateTokens(text: string): number {
  const clean = text.trim();
  if (!clean) return 0;
  return Math.ceil(clean.length / 4);
}

export function summarizeOlderTurns(turns: Turn[], keep: number): Turn[] {
  const window = keep < 1 ? 1 : keep;
  if (turns.length <= window) return turns;
  const older = turns.slice(0, turns.length - window);
  const clip = older
    .map((turn) => turn.text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 180);
  const summary: Turn = {
    role: "user",
    text: clip ? `Earlier turns, shortened: ${clip}` : "Earlier turns were empty.",
  };
  return [summary, ...turns.slice(-window)];
}

export interface RouteInput {
  purpose: "chat" | "draft";
  plan: PlanCode;
  usedTokens: number;
  turns: Turn[];
  articleCount: number;
  chatModel: string;
  draftModel: string;
}

export interface RouteDecision {
  model: string;
  prefix: string;
  turns: Turn[];
  articleLimit: number;
  degraded: boolean;
}

export function routeModel(input: RouteInput): RouteDecision {
  const budget = PLAN_TOKEN_BUDGET[input.plan] || PLAN_TOKEN_BUDGET.free;
  const ratio = budget <= 0 ? 1 : input.usedTokens / budget;
  const degraded = ratio >= 1;
  const tight = !degraded && ratio >= 0.8;
  const model = input.purpose === "draft" && !degraded ? input.draftModel : input.chatModel;
  const keep = degraded ? 2 : tight ? 4 : 8;
  const articleLimit = degraded ? 1 : tight ? 2 : Math.min(Math.max(input.articleCount, 0), 4);
  return {
    model,
    prefix: CACHED_SYSTEM_PREFIX,
    turns: summarizeOlderTurns(input.turns, keep),
    articleLimit,
    degraded,
  };
}

const genericAnswers = new Map<string, string>();

export function looksUserSpecific(text: string): boolean {
  if (text.length > 240) return true;
  if (text.includes("@")) return true;
  if (/\d{6,}/.test(text)) return true;
  if (/المدّ?عي:\s*(?!الاسم\b)\S/.test(text)) return true;
  if (/المدّ?عى عليه:\s*(?!الاسم\b)\S/.test(text)) return true;
  return false;
}

export function readGeneric(key: string): string | null {
  return genericAnswers.get(key) ?? null;
}

export function writeGeneric(key: string, text: string): boolean {
  if (!key.trim() || looksUserSpecific(key) || looksUserSpecific(text)) return false;
  genericAnswers.set(key, text);
  return true;
}

export function clearGenericCache(): void {
  genericAnswers.clear();
}

export interface CostRow {
  planCode: string;
  purpose: string;
  degraded: boolean;
  cached: boolean;
  tokens: number;
  count: number;
}

export function shapeCostReport(rows: CostRow[]) {
  const totals = { tokens: 0, requests: 0, degraded: 0, cached: 0 };
  const byPlan: Record<string, number> = {};
  const byPurpose: Record<string, number> = {};
  for (const row of rows) {
    totals.tokens += row.tokens;
    totals.requests += row.count;
    if (row.degraded) totals.degraded += row.count;
    if (row.cached) totals.cached += row.count;
    byPlan[row.planCode] = (byPlan[row.planCode] || 0) + row.tokens;
    byPurpose[row.purpose] = (byPurpose[row.purpose] || 0) + row.tokens;
  }
  return { totals, byPlan, byPurpose };
}
