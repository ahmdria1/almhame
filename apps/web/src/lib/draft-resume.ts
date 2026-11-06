export type PendingDraft = { chatId: string; startedAt: number };

export function readPendingDraft(raw: string | null): PendingDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { chatId?: unknown; startedAt?: unknown };
    if (typeof parsed.chatId !== "string" || !parsed.chatId) return null;
    if (typeof parsed.startedAt !== "number" || !Number.isFinite(parsed.startedAt)) return null;
    return { chatId: parsed.chatId, startedAt: parsed.startedAt };
  } catch {
    return null;
  }
}

export function draftWaitState(pending: PendingDraft, now: number, waitMs = 120000): "wait" | "expired" {
  return now - pending.startedAt > waitMs ? "expired" : "wait";
}
