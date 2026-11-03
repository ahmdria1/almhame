import { LOCALES } from "@elawyer/types";
import { dictionaries, dirFor, memoCountPhrase, translate, uploadErrorKey } from "../src";

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

  it("keeps the same keys in every locale and does not copy English except proper nouns", () => {
    const proper = new Set(["Google Drive", "OneDrive", "SAR", "ر.س", "Ahmed Alamrani"]);
    for (const locale of LOCALES) {
      expect(Object.keys(dictionaries[locale]).sort()).toEqual(arKeys);
      if (locale === "en") continue;
      for (const key of arKeys) {
        const value = dictionaries[locale][key];
        if (value === dictionaries.en[key]) expect(proper.has(value)).toBe(true);
      }
    }
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
    expect(memoCountPhrase("ar", 1)).toBe("مذكرة واحدة");
    expect(memoCountPhrase("ar", 2)).toBe("مذكرتان");
    expect(memoCountPhrase("ar", 5)).toBe("5 مذكرات");
    expect(memoCountPhrase("ar", 11)).toBe("11 مذكرة");
    expect(memoCountPhrase("en", 1)).toBe("1 memo");
    expect(memoCountPhrase("en", 5)).toBe("5 memos");
    for (const locale of LOCALES) expect(dictionaries[locale]["common.sar"]).toBe("ر.س");
  });
});
