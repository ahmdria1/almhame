import type { Locale } from "@elawyer/types";
import { clientCopy } from "./client-copy";
import { hasDate, preservedTokens } from "./facts";

export interface AssessmentResult {
  locale: Locale;
  caseType: string;
  strengths: string[];
  weaknesses: string[];
  missingDocuments: string[];
  recommendedPath: string;
  successLow: number;
  successHigh: number;
  reasons: string[];
  disclaimer: string;
}

const LABOR = /أجر|راتب|فصل|تنخواہ|वेतन|বেতন|wage|salary|ücret|maaş|ደመወዝ|වැටුප|sahod|ज्याला/i;
const FAMILY = /طلاق|خلع|أحوال|divorce|তালাক|طلاق|විවාහ|bosan|እርቅ/i;
const CRIMINAL = /سرقة|مخدر|رشوة|crime|bribe|theft|جرم|अपराध/i;
const DOC = /عقد|مستند|إيصال|contract|document|চুক্তি|معاہدہ|अनुबंध|sözleşme|ሰነድ|ගිවිසුම|kontrata|सम्झौता/i;

export function successBand(facts: string): { low: number; high: number; dated: boolean; amount: boolean; documented: boolean; labor: boolean; family: boolean; criminal: boolean } {
  const dated = hasDate(facts);
  const amount = preservedTokens(facts).some((token) => /\d/.test(token) && !/^\d{4}[-/.]/.test(token));
  const documented = DOC.test(facts);
  const labor = LABOR.test(facts);
  const family = FAMILY.test(facts);
  const criminal = CRIMINAL.test(facts);
  let low = 40;
  let high = 58;
  if (dated) {
    low += 8;
    high += 6;
  } else {
    low -= 8;
    high += 6;
  }
  if (amount) {
    low += 6;
    high += 4;
  }
  if (documented) {
    low += 8;
    high += 5;
  } else {
    low -= 4;
  }
  if (criminal) {
    low -= 6;
    high -= 4;
  }
  low = Math.max(15, Math.min(75, low));
  high = Math.max(low + 10, Math.min(85, high));
  return { low, high, dated, amount, documented, labor, family, criminal };
}

export function buildAssessment(facts: string, locale: Locale): AssessmentResult {
  const copy = clientCopy(locale);
  const band = successBand(facts);
  const strengths = [band.dated ? copy.strengthDate : "", band.amount ? copy.strengthAmount : ""].filter(Boolean);
  const weaknesses = [band.dated ? "" : copy.weaknessNoDate, band.documented ? "" : copy.weaknessNoDoc].filter(Boolean);
  const reasons = [
    band.dated ? copy.reasonDate : copy.reasonNoDate,
    band.amount ? copy.reasonAmount : "",
  ].filter(Boolean);
  const caseType = band.criminal ? copy.caseCriminal : band.labor ? copy.caseLabor : band.family ? copy.caseFamily : copy.caseCivil;
  const recommendedPath = band.labor || band.family ? copy.pathTaradhi : copy.pathCourt;
  return {
    locale,
    caseType,
    strengths: strengths.length ? strengths : [copy.strengthAmount],
    weaknesses,
    missingDocuments: [copy.missingContract, copy.missingProof],
    recommendedPath,
    successLow: band.low,
    successHigh: band.high,
    reasons,
    disclaimer: copy.disclaimer,
  };
}
