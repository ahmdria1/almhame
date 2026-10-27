import { execFileSync } from "child_process";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { fontFile, renderPdf } from "./render";

describe("arabic pdf", () => {
  it("keeps selectable Arabic text and the release metadata", async () => {
    const title = "صحيفة دعوى";
    const body = "بسم الله الرحمن الرحيم\nالمدعي أحمد العمراني\nثانيًا: الأسانيد النظامية";
    const bytes = await renderPdf({ title, body, fontPath: fontFile("") });
    expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
    const dir = mkdtempSync(path.join(tmpdir(), "elw-pdf-"));
    const file = path.join(dir, "memo.pdf");
    writeFileSync(file, bytes);
    const text = execFileSync("pdftotext", ["-enc", "UTF-8", file, "-"], { encoding: "utf8" });
    expect(text).toContain("صحيفة دعوى");
    expect(text).toContain("أحمد العمراني");
    expect(text).toContain("بسم الله");
    expect(text).toContain("ثانيًا");
    const meta = await PDFDocument.load(bytes);
    expect(meta.getAuthor()).toBe("Ahmed Alamrani");
    expect(meta.getCreator()).toBe("AALMR-ELW-7F3C");
  }, 60000);
});
