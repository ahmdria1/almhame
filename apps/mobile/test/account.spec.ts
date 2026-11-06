import { mobileError } from "../src/errors";
import { filterMemos } from "../src/memo-query";
import { palette, readPrefState } from "../src/prefs";
import { ApiError } from "@elawyer/api-client";

describe("mobile account", () => {
  it("keeps an unknown locale on Arabic and accepts a saved theme", () => {
    expect(readPrefState("nope", "dark")).toEqual({ locale: "ar", theme: "dark" });
    expect(readPrefState("ur", "light").locale).toBe("ur");
    expect(readPrefState("en", null).theme).toBe("light");
  });

  it("uses the secondary color for links on paper and the accent only on the night ground", () => {
    expect(palette("light").link).toBe("#0F6B72");
    expect(palette("light").canvas).toBe("#F6F8FB");
    expect(palette("dark").link).toBe("#7FD4CB");
    expect(palette("dark").canvas).toBe("#0B1E3B");
  });

  it("filters memos by words, court, and type", () => {
    const rows = [
      { id: "1", title: "دعوى أجر", court: "labor", memoType: "lawsuit", updatedAt: "2026-01-01" },
      { id: "2", title: "عقد", court: "commercial", memoType: "reply", updatedAt: "2026-02-01" },
    ];
    expect(filterMemos(rows, { q: "أجر" }).map((row) => row.id)).toEqual(["1"]);
    expect(filterMemos(rows, { court: "commercial", memoType: "reply" }).map((row) => row.id)).toEqual(["2"]);
  });

  it("hides English API text", () => {
    expect(mobileError(new ApiError(401, "UNAUTHENTICATED", "Sign in again"), "ar")).toContain("دخول");
    expect(mobileError(new ApiError(400, "CONSENT_REQUIRED", "Consent is required"), "en")).toContain("agree");
    expect(mobileError(new Error("x"), "ar")).not.toMatch(/[A-Za-z]/);
  });
});
