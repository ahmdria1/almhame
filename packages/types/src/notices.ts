export const NOTICE_CUES = ["normal-1", "normal-2", "urgent-1", "urgent-2"] as const;
export type NoticeCue = (typeof NOTICE_CUES)[number];
export type NoticePriority = "normal" | "urgent";
export type SoundTier = "free" | "paid";
export type NoticeSoundMode = "all" | "urgent" | "off";

const PAID_PLANS = new Set(["basic", "pro"]);

export function soundTier(
  planCode: string,
  expiresAt: string | Date | null | undefined,
  now = Date.now(),
): SoundTier {
  if (!PAID_PLANS.has(planCode)) return "free";
  if (expiresAt == null || expiresAt === "") return "paid";
  const time = expiresAt instanceof Date ? expiresAt.getTime() : Date.parse(expiresAt);
  if (Number.isNaN(time) || time <= now) return "free";
  return "paid";
}

export function noticeCue(tier: SoundTier, priority: NoticePriority): NoticeCue {
  if (tier === "paid") return priority === "urgent" ? "urgent-1" : "normal-1";
  return priority === "urgent" ? "urgent-2" : "normal-2";
}

export function noticeChannelId(tier: SoundTier, priority: NoticePriority): string {
  return `notices-${tier}-${priority}`;
}

export function shouldPlayNotice(mode: NoticeSoundMode, priority: NoticePriority): boolean {
  if (mode === "off") return false;
  if (mode === "urgent") return priority === "urgent";
  return true;
}
