import { deflateSync, inflateSync } from "zlib";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_PDF_PAGES = 40;
export const MAX_IMAGE_EDGE = 8000;
export const MAX_IMAGE_PIXELS = 24_000_000;
export const UPLOADS_PER_WINDOW = 8;
export const UPLOAD_WINDOW_MS = 60_000;

export type UploadKind = "pdf" | "png" | "jpeg" | "webp";

const MIME_KIND: Record<string, UploadKind> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/webp": "webp",
};

export function kindFromMime(mime: string): UploadKind | null {
  return MIME_KIND[mime] ?? null;
}

export function sniffUpload(bytes: Buffer): UploadKind | null {
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  return null;
}

function recoverUtf8(input: string): string {
  if ([...input].some((char) => char.charCodeAt(0) > 255)) return input;
  const bytes = Buffer.from(input, "latin1");
  const decoded = bytes.toString("utf8");
  if (decoded.includes("\uFFFD") || decoded === input) return input;
  return Buffer.from(decoded, "utf8").equals(bytes) ? decoded : input;
}

export function sanitizeFilename(input: string): string {
  const base = recoverUtf8(String(input || "")).split(/[/\\]/).filter(Boolean).pop() || "file";
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").replace(/^\.+/, "").trim().slice(0, 80);
  return cleaned || "file";
}

export function takeUploadSlot(stamps: number[], now: number, limit = UPLOADS_PER_WINDOW, windowMs = UPLOAD_WINDOW_MS): { ok: boolean; next: number[] } {
  const next = stamps.filter((stamp) => now - stamp < windowMs);
  if (next.length >= limit) return { ok: false, next };
  next.push(now);
  return { ok: true, next };
}

export function imageTooLarge(width: number, height: number): boolean {
  if (width < 1 || height < 1) return true;
  if (width > MAX_IMAGE_EDGE || height > MAX_IMAGE_EDGE) return true;
  return width * height > MAX_IMAGE_PIXELS;
}

function namePresent(value: string, name: string): boolean {
  return new RegExp(`\\/${name}(?![A-Za-z0-9])`).test(value);
}

function inflatePdfStreams(bytes: Buffer): string {
  const latin = bytes.toString("latin1");
  const parts: string[] = [];
  const pattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  let count = 0;
  let total = 0;
  while ((match = pattern.exec(latin)) && count < 40) {
    count += 1;
    const dictStart = latin.lastIndexOf("<<", match.index);
    const dict = dictStart >= 0 ? latin.slice(dictStart, match.index) : "";
    if (!dict.includes("FlateDecode")) continue;
    try {
      const inflated = inflateSync(Buffer.from(match[1], "latin1"));
      if (inflated.length > 2_000_000) break;
      total += inflated.length;
      parts.push(inflated.toString("latin1"));
      if (total > 8_000_000) break;
    } catch {
      /* skip a stream that is not a plain deflate */
    }
  }
  return parts.join("\n");
}

export type PdfReject = "encrypted" | "active" | "pages" | "invalid";

export function inspectPdf(bytes: Buffer): { ok: true; pages: number } | { ok: false; reason: PdfReject } {
  if (sniffUpload(bytes) !== "pdf") return { ok: false, reason: "invalid" };
  const haystack = `${bytes.toString("latin1")}\n${inflatePdfStreams(bytes)}`;
  if (namePresent(haystack, "Encrypt")) return { ok: false, reason: "encrypted" };
  const openAt = haystack.search(/\/OpenAction(?![A-Za-z0-9])/);
  if (openAt >= 0) {
    const window = haystack.slice(openAt, openAt + 400);
    if (namePresent(window, "JavaScript") || namePresent(window, "JS")) return { ok: false, reason: "active" };
  }
  if (namePresent(haystack, "JavaScript") || namePresent(haystack, "JS") || namePresent(haystack, "Launch") || namePresent(haystack, "EmbeddedFile") || namePresent(haystack, "AA")) {
    return { ok: false, reason: "active" };
  }
  const pages = haystack.match(/\/Type\s*\/Page(?![A-Za-z])/g)?.length ?? 0;
  if (pages < 1) return { ok: false, reason: "invalid" };
  if (pages > MAX_PDF_PAGES) return { ok: false, reason: "pages" };
  return { ok: true, pages };
}

export function deflatePdfStream(payload: string): Buffer {
  return deflateSync(Buffer.from(payload, "latin1"));
}

export async function reencodeImage(bytes: Buffer, kind: Exclude<UploadKind, "pdf">): Promise<Buffer> {
  const image = sharp(bytes, { failOn: "error", limitInputPixels: MAX_IMAGE_PIXELS, animated: false, pages: 1 });
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (imageTooLarge(width, height)) {
    throw new Error(width > MAX_IMAGE_EDGE || height > MAX_IMAGE_EDGE || width * height > MAX_IMAGE_PIXELS ? "dimensions" : "invalid");
  }
  const pipeline = image.rotate();
  if (kind === "png") return pipeline.png().toBuffer();
  if (kind === "webp") return pipeline.webp({ quality: 80 }).toBuffer();
  return pipeline.jpeg({ quality: 85 }).toBuffer();
}
