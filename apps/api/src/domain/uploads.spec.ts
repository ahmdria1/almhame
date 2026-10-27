import sharp from "sharp";
import {
  MAX_PDF_PAGES,
  deflatePdfStream,
  imageTooLarge,
  inspectPdf,
  kindFromMime,
  reencodeImage,
  sanitizeFilename,
  sniffUpload,
  takeUploadSlot,
} from "./uploads";

function pdf(body: string): Buffer {
  return Buffer.from(`%PDF-1.4\n${body}\n%%EOF\n`, "latin1");
}

const page = "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >> endobj";
const clean = pdf(`1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n${page}\ntrailer << /Root 1 0 R >>`);

describe("upload checks", () => {
  it("sniffs the allowed types and rejects a renamed executable", () => {
    expect(sniffUpload(clean)).toBe("pdf");
    expect(sniffUpload(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("png");
    expect(sniffUpload(Buffer.from([0xff, 0xd8, 0xff, 0xd9]))).toBe("jpeg");
    const webp = Buffer.alloc(12);
    webp.write("RIFF", 0, "latin1");
    webp.write("WEBP", 8, "latin1");
    expect(sniffUpload(webp)).toBe("webp");
    expect(sniffUpload(Buffer.from("MZ"))).toBeNull();
    expect(sniffUpload(Buffer.alloc(0))).toBeNull();
    expect(kindFromMime("application/pdf")).toBe("pdf");
    expect(kindFromMime("image/jpeg")).toBe("jpeg");
    expect(kindFromMime("text/plain")).toBeNull();
  });

  it("keeps a safe filename and drops path and control characters", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("..\\..\\عقد.pdf")).toBe("عقد.pdf");
    expect(sanitizeFilename(Buffer.from("../../عقد.pdf", "utf8").toString("latin1"))).toBe("عقد.pdf");
    expect(sanitizeFilename("a\u0000b\n.pdf")).toBe("ab.pdf");
    expect(sanitizeFilename("   ")).toBe("file");
    expect(sanitizeFilename(`${"ن".repeat(200)}.pdf`).length).toBe(80);
  });

  it("limits uploads per user inside the window", () => {
    let stamps: number[] = [];
    for (let index = 0; index < 8; index += 1) {
      const taken = takeUploadSlot(stamps, 1_000 + index);
      expect(taken.ok).toBe(true);
      stamps = taken.next;
    }
    expect(takeUploadSlot(stamps, 1_500).ok).toBe(false);
    expect(takeUploadSlot(stamps, 1_000 + 60_000).ok).toBe(true);
  });

  it("accepts a clean pdf and a page destination", () => {
    expect(inspectPdf(clean)).toEqual({ ok: true, pages: 1 });
    const destination = pdf(`1 0 obj << /Type /Catalog /Pages 2 0 R /OpenAction [3 0 R /Fit] >> endobj\n2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n${page}\ntrailer << /Root 1 0 R >>`);
    expect(inspectPdf(destination)).toEqual({ ok: true, pages: 1 });
  });

  it("rejects javascript, an open action that runs it, launch, encryption, and too many pages", () => {
    const openJs = pdf(`1 0 obj << /Type /Catalog /Pages 2 0 R /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >> endobj\n2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n${page}\ntrailer << /Root 1 0 R >>`);
    expect(inspectPdf(openJs)).toEqual({ ok: false, reason: "active" });
    const script = pdf(`1 0 obj << /Type /Catalog /Pages 2 0 R /Names << /JavaScript 4 0 R >> >> endobj\n2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n${page}\n4 0 obj << /S /JavaScript /JS (app.alert(1)) >> endobj\ntrailer << /Root 1 0 R >>`);
    expect(inspectPdf(script)).toEqual({ ok: false, reason: "active" });
    const launch = pdf(`1 0 obj << /Type /Catalog /Pages 2 0 R /OpenAction << /S /Launch /F (cmd) >> >> endobj\n2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n${page}\ntrailer << /Root 1 0 R >>`);
    expect(inspectPdf(launch)).toEqual({ ok: false, reason: "active" });
    const embedded = pdf(`1 0 obj << /Type /Catalog /Pages 2 0 R /Names << /EmbeddedFiles 4 0 R >> >> endobj\n2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n${page}\n4 0 obj << /Type /EmbeddedFile /Length 1 >> endobj\ntrailer << /Root 1 0 R >>`);
    expect(inspectPdf(embedded)).toEqual({ ok: false, reason: "active" });
    const actions = pdf(`1 0 obj << /Type /Catalog /Pages 2 0 R /AA << /O << /S /JavaScript >> >> >> endobj\n2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n${page}\ntrailer << /Root 1 0 R >>`);
    expect(inspectPdf(actions)).toEqual({ ok: false, reason: "active" });
    const encrypted = pdf(`1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n${page}\ntrailer << /Root 1 0 R /Encrypt << /Filter /Standard >> >>`);
    expect(inspectPdf(encrypted)).toEqual({ ok: false, reason: "encrypted" });
    const kids = Array.from({ length: MAX_PDF_PAGES + 1 }, () => "/Type /Page").join(" ");
    const many = pdf(`1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Count 41 ${kids} >> endobj\ntrailer << /Root 1 0 R >>`);
    expect(inspectPdf(many)).toEqual({ ok: false, reason: "pages" });
    expect(inspectPdf(Buffer.from("not a pdf"))).toEqual({ ok: false, reason: "invalid" });
    expect(inspectPdf(pdf("1 0 obj << /Type /Catalog >> endobj"))).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects javascript hidden in a compressed stream", () => {
    const payload = deflatePdfStream("<< /JS (app.alert(1)) >>");
    const file = Buffer.concat([
      Buffer.from(`%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n${page}\n5 0 obj << /Filter /FlateDecode /Length ${payload.length} >> stream\n`, "latin1"),
      payload,
      Buffer.from("\nendstream endobj\ntrailer << /Root 1 0 R >>\n%%EOF", "latin1"),
    ]);
    expect(inspectPdf(file)).toEqual({ ok: false, reason: "active" });
  });

  it("re-encodes images and drops bytes appended after the image", async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).png().toBuffer();
    const polyglot = Buffer.concat([png, Buffer.from("MZ-POLY")]);
    const cleaned = await reencodeImage(polyglot, "png");
    expect(cleaned.includes(Buffer.from("MZ-POLY"))).toBe(false);
    expect(sniffUpload(cleaned)).toBe("png");
    expect(sniffUpload(await reencodeImage(png, "jpeg"))).toBe("jpeg");
    expect(sniffUpload(await reencodeImage(png, "webp"))).toBe("webp");
    const wide = await sharp({ create: { width: 8001, height: 1, channels: 3, background: "red" } }).png().toBuffer();
    await expect(reencodeImage(wide, "png")).rejects.toThrow("dimensions");
    await expect(reencodeImage(Buffer.from("not-an-image"), "png")).rejects.toThrow();
    expect(imageTooLarge(0, 10)).toBe(true);
    expect(imageTooLarge(100, 100)).toBe(false);
    expect(imageTooLarge(7000, 7000)).toBe(true);
  });
});
