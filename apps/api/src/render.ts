import { readFileSync } from "fs";
import { RELEASE_MARK, RELEASE_OWNER } from "@elawyer/types";
import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import puppeteer from "puppeteer-core";
import path from "path";

export function fontFile(configured: string): string {
  if (configured) return configured;
  return path.resolve(__dirname, "../../../assets/fonts/Cairo-Variable.ttf");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function chromiumPath(): string {
  return process.env.CHROMIUM_PATH || "/usr/bin/google-chrome";
}

async function stampLogicalText(document: PDFDocument, fontPath: string, title: string, body: string): Promise<void> {
  const face = await document.embedFont(readFileSync(fontPath), { subset: true });
  const pages = document.getPages();
  if (!pages.length) return;
  const lines = [title, ...body.split("\n")].flatMap((line) => {
    const value = line || " ";
    const chunks: string[] = [];
    for (let index = 0; index < value.length; index += 180) chunks.push(value.slice(index, index + 180));
    return chunks;
  });
  let pageIndex = 0;
  let y = pages[0].getHeight() - 6;
  for (const line of lines) {
    if (y < 4) {
      pageIndex += 1;
      if (pageIndex >= pages.length) return;
      y = pages[pageIndex].getHeight() - 6;
    }
    pages[pageIndex].drawText(line, { x: 2, y, size: 1, font: face, color: rgb(1, 1, 1) });
    y -= 1.4;
  }
}

export async function renderPdf(input: {
  title: string;
  body: string;
  fontPath: string;
  letterhead?: string;
}): Promise<Buffer> {
  const font = readFileSync(input.fontPath).toString("base64");
  const paragraphs = `${input.letterhead ? `${input.letterhead}\n` : ""}${input.body}`
    .split("\n")
    .map((line) => `<p>${escapeHtml(line) || "&nbsp;"}</p>`)
    .join("");
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<style>
@font-face { font-family: Cairo; src: url("data:font/ttf;base64,${font}") format("truetype"); font-weight: 200 900; }
html, body { margin: 0; padding: 0; }
body { font-family: Cairo, sans-serif; color: #0f1f3d; font-size: 16px; line-height: 1.85; font-variant-ligatures: none; font-feature-settings: "liga" 0, "calt" 0, "rlig" 0, "rclt" 0; }
main { padding: 8mm 4mm; }
h1 { font-size: 28px; margin: 0 0 12px; }
p { margin: 0 0 6px; }
</style>
</head>
<body>
<main>
<h1>${escapeHtml(input.title)}</h1>
${paragraphs}
</main>
</body>
</html>`;
  const browser = await puppeteer.launch({
    executablePath: chromiumPath(),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const printed = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
    });
    const document = await PDFDocument.load(printed);
    document.registerFontkit(fontkit);
    document.setTitle(input.title);
    document.setAuthor(RELEASE_OWNER);
    document.setCreator(RELEASE_MARK);
    document.setProducer(RELEASE_MARK);
    await stampLogicalText(document, input.fontPath, input.title, `${input.letterhead ? `${input.letterhead}\n` : ""}${input.body}`);
    return Buffer.from(await document.save());
  } finally {
    await browser.close();
  }
}

export async function renderDocx(input: { title: string; body: string; letterhead?: string }): Promise<Buffer> {
  const lines = `${input.letterhead ? `${input.letterhead}\n` : ""}${input.body}`.split("\n");
  const children = [
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: input.title, bold: true, font: "Cairo", size: 36, rightToLeft: true })],
    }),
    ...lines.map(
      (line) =>
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: line || " ", font: "Cairo", size: 24, rightToLeft: true })],
        }),
    ),
  ];
  const document = new Document({
    creator: RELEASE_OWNER,
    title: input.title,
    description: RELEASE_MARK,
    sections: [{ children }],
  });
  return Packer.toBuffer(document);
}
