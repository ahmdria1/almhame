import { PlanCode, User } from "@prisma/client";
import { chatsCounted, PLAN_DEFS, PlanDef } from "./domain/plans";

export function presentUser(user: User, plan: PlanDef = PLAN_DEFS[user.planCode as PlanCode]) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    locale: user.locale,
    theme: user.theme,
    planCode: user.planCode,
    chatCount: chatsCounted(plan, user.chatCount, user.chatCountPeriod),
    chatLimit: plan.chatLimit,
    memoCountPeriod: user.memoCountPeriod,
    memoLimit: plan.memoLimit,
    memoRemaining: Math.max(0, plan.memoLimit - user.memoCountPeriod),
    planRenewsAt: user.planRenewsAt ? user.planRenewsAt.toISOString() : null,
    notifyHearings: user.notifyHearings,
    orgId: user.orgId,
    orgRole: user.orgRole,
    features: {
      word: plan.word,
      caseManagement: plan.caseManagement,
      letterhead: plan.letterhead,
      courts: plan.courts,
      seats: plan.seats,
    },
  };
}
