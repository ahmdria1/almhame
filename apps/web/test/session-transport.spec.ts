import { readFileSync } from "fs";
import { join } from "path";

function source(path: string) {
  return readFileSync(join(__dirname, "..", path), "utf8");
}

describe("session transport", () => {
  it("sends the API cookie and does not name another domain", () => {
    const files = [
      "src/lib/providers.tsx",
      "src/components/pdf-preview.tsx",
      "src/app/[locale]/(session)/app/memos/[id]/page.tsx",
    ];
    for (const file of files) {
      const text = source(file);
      expect(text).toContain('credentials: "include"');
      expect(text).not.toContain("almuhami");
      expect(text).not.toContain("almuhami.com.sa");
    }
  });

  it("asks for the Arabic memo direction on PDF download", () => {
    expect(source("src/components/pdf-preview.tsx")).toContain("locale=ar");
    expect(source("src/app/[locale]/(session)/app/memos/[id]/page.tsx")).toContain("locale=ar");
    expect(source("src/components/pdf-preview.tsx")).toContain('dirFor("ar")');
  });
});
