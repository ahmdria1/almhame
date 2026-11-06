import { readFileSync } from "fs";
import { join } from "path";
import { sniffedImageKind } from "../src/lib/file-preview";

function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

describe("file preview", () => {
  it("accepts only png, jpeg, and webp signatures", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(sniffedImageKind(png)).toBe("png");
    expect(sniffedImageKind(jpeg)).toBe("jpeg");
    expect(sniffedImageKind(webp)).toBe("webp");
  });

  it("rejects html, svg, and pdf so they are not placed in a document", () => {
    expect(sniffedImageKind(bytes("<html><script>alert(1)</script>"))).toBeNull();
    expect(sniffedImageKind(bytes("<svg xmlns=\"http://www.w3.org/2000/svg\"><script/></svg>"))).toBeNull();
    expect(sniffedImageKind(bytes("%PDF-1.7"))).toBeNull();
    expect(sniffedImageKind(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });

  it("does not assign a chosen file url to an image or frame", () => {
    const page = readFileSync(join(__dirname, "../src/app/[locale]/(session)/app/page.tsx"), "utf8");
    const preview = readFileSync(join(__dirname, "../src/components/file-preview.tsx"), "utf8");
    expect(page).not.toContain("<iframe");
    expect(page).not.toContain("previewUrl");
    expect(preview).not.toContain("<iframe");
    expect(preview).not.toContain("<img");
    expect(preview).not.toContain("createObjectURL");
  });
});