import { filterMemos, missingPieces, rememberMemo, sortMemos, wordCount, type MemoRow } from "@/lib/memo-list";
import { halalasToAmount } from "@/lib/money";
import { userFacingError } from "@/lib/errors";
import { ApiError } from "@elawyer/api-client";

const rows: MemoRow[] = [
  { id: "a", title: "دعوى أجر", court: "labor", memoType: "lawsuit", updatedAt: "2026-03-01T10:00:00.000Z", status: "draft" },
  { id: "b", title: "جواب تجاري", court: "commercial", memoType: "reply", updatedAt: "2026-04-02T10:00:00.000Z", status: "draft" },
  { id: "c", title: "اعتراض عمالي", court: "labor", memoType: "appeal", updatedAt: "2026-05-03T10:00:00.000Z", status: "draft" },
];

const t = (key: string) => key;

describe("memo list", () => {
  it("filters by the header query, court, type, and dates", () => {
    expect(filterMemos(rows, { q: "أجر" }).map((row) => row.id)).toEqual(["a"]);
    expect(filterMemos(rows, { q: "مخفي", searchIds: ["b"] }).map((row) => row.id)).toEqual(["b"]);
    expect(filterMemos(rows, { court: "labor", memoType: "appeal" }).map((row) => row.id)).toEqual(["c"]);
    expect(filterMemos(rows, { from: "2026-04-01", to: "2026-04-30" }).map((row) => row.id)).toEqual(["b"]);
    expect(filterMemos(rows, { q: "لا يوجد" })).toEqual([]);
  });

  it("sorts by the updated time", () => {
    expect(sortMemos(rows, "oldest").map((row) => row.id)).toEqual(["a", "b", "c"]);
    expect(sortMemos(rows, "newest").map((row) => row.id)).toEqual(["c", "b", "a"]);
  });

  it("names each missing piece and counts words", () => {
    expect(missingPieces({ docs: 0, messages: 1, plaintiff: "", defendant: "خالد" })).toEqual(["documents", "facts", "plaintiff"]);
    expect(missingPieces({ docs: 2, messages: 3, plaintiff: "سارة", defendant: "خالد" })).toEqual([]);
    expect(wordCount("  طلب أول\nوطلب ثان  ")).toBe(4);
    expect(wordCount("   ")).toBe(0);
  });

  it("keeps the eight most recently opened memos", () => {
    const data = new Map<string, string>();
    const store = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
    };
    rememberMemo(store, { id: "a", title: "أ" }, "2026-01-01T00:00:00.000Z");
    const recent = rememberMemo(store, { id: "a", title: "أحدث" }, "2026-02-01T00:00:00.000Z");
    expect(recent).toEqual([{ id: "a", title: "أحدث", openedAt: "2026-02-01T00:00:00.000Z" }]);
  });

  it("prints the amount and leaves the riyal word to the locale", () => {
    expect(halalasToAmount(900)).toBe("9");
    expect(halalasToAmount(3950)).toBe("39.50");
    expect(halalasToAmount(-100)).toBe("-1");
  });

  it("maps known failures onto existing copy and hides English API text", () => {
    expect(userFacingError(new ApiError(402, "QUOTA_MEMOS", "The free chat limit has been reached"), t)).toBe("quota.title");
    expect(userFacingError(new ApiError(400, "CONSENT_REQUIRED", "Consent is required"), t)).toBe("auth.consent");
    expect(userFacingError(new ApiError(429, "RATE_LIMIT", "Wait before requesting another email"), t)).toBe("upload.rate");
    expect(userFacingError(new ApiError(400, "VALIDATION", "Enter a valid mobile number"), t)).toBe("common.error");
    expect(userFacingError(new ApiError(400, "VALIDATION", "أدخل رقمًا صحيحًا"), t)).toBe("أدخل رقمًا صحيحًا");
  });
});
