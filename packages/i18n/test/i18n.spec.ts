import { LOCALES } from "@elawyer/types";
import { dictionaries, dirFor, translate, uploadErrorKey } from "../src";

describe("locales", () => {
  const arKeys = Object.keys(dictionaries.ar).sort();

  it("covers every configured locale", () => {
    expect(Object.keys(dictionaries).sort()).toEqual([...LOCALES].sort());
  });

  it("keeps every locale on the Arabic keys", () => {
    expect(Object.keys(dictionaries.en).sort()).toEqual(arKeys);
  });

  it("rejects a missing key or a TODO value", () => {
    for (const locale of LOCALES) {
      expect(Object.keys(dictionaries[locale]).sort()).toEqual(arKeys);
      for (const value of Object.values(dictionaries[locale])) {
        expect(value).not.toMatch(/^TODO/);
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps placeholders aligned with Arabic and avoids copied English", () => {
    const proper = new Set(["Google Drive", "OneDrive", "PDF", "Nafath", "Sharia"]);
    const tokens = (value: string) => [...value.matchAll(/\{[a-zA-Z0-9_]+\}/g)].map((match) => match[0]).sort().join();
    for (const locale of LOCALES) {
      if (locale === "en") continue;
      for (const [key, arabic] of Object.entries(dictionaries.ar)) {
        const value = dictionaries[locale][key];
        expect(tokens(value)).toBe(tokens(arabic));
        if (locale !== "ar" && dictionaries.en[key] === value && /[A-Za-z]{4,}/.test(value) && !proper.has(value)) {
          throw new Error(`${locale} ${key} copies English`);
        }
      }
    }
    expect(dirFor("ur")).toBe("rtl");
    expect(dictionaries.ur["plans.oneTime"]).toMatch(/ادائیگی/);
    expect(dictionaries.bn["plans.oneTime"]).toMatch(/পেমেন্ট|একবার/);
    expect(dictionaries.hi["common.assistant"]).toMatch(/[\u0900-\u097F]/);
    expect(dictionaries.tr["auth.notLawyer"]).toMatch(/avukat/);
  });

  it("resolves direction and interpolation", () => {
    expect(dirFor("ar")).toBe("rtl");
    expect(dirFor("ur")).toBe("rtl");
    expect(dirFor("pa")).toBe("rtl");
    expect(dirFor("en")).toBe("ltr");
    expect(dirFor("hi")).toBe("ltr");
    expect(translate("en", "workspace.remaining", { left: 3, total: 5 })).toContain("3");
    expect(translate("ar", "app.name")).toContain("المحامي");
    expect(uploadErrorKey("FILE_INFECTED")).toBe("upload.infected");
    expect(uploadErrorKey("PDF_UNSAFE")).toBe("upload.unsupported");
    expect(translate("ur", uploadErrorKey("SCANNER_UNAVAILABLE") || "")).not.toBe("upload.scanner");
  });
});
