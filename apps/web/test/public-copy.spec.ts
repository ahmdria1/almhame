import { translate } from "@elawyer/i18n";
import { LOCALES } from "@elawyer/types";
import { PUBLIC_LINE_KEYS, publicLine } from "../src/lib/public-copy";

describe("public client copy", () => {
  it("matches the stored dictionary for every locale", () => {
    for (const locale of LOCALES) {
      for (const key of PUBLIC_LINE_KEYS) {
        expect(publicLine(locale, key)).toBe(translate(locale, key));
      }
    }
    expect(publicLine("zz", "common.back")).toBe(translate("ar", "common.back"));
  });
});
