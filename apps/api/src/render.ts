import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { RELEASE_MARK, RELEASE_OWNER } from "@elawyer/types";
import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import PDFDocument from "pdfkit";
import path from "path";

let registered = false;

export function fontFile(configured: string): string {
  if (configured) return configured;
  return path.resolve(__dirname, "../../../assets/fonts/Cairo-Variable.ttf");
}

function ensureFont(file: string) {
  if (registered) return;
  GlobalFonts.registerFromPath(file, "Cairo");
  registered = true;
}

function wrap(ctx: { measureText: (value: string) => { width: number } }, text: string, max: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (ctx.measureText(next).width > max && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

export async function renderPdf(input: {
  title: string;
  body: string;
  fontPath: string;
  letterhead?: string;
}): Promise<Buffer> {
  ensureFont(input.fontPath);
  const width = 1190;
  const height = 1684;
  const margin = 96;
  const max = width - margin * 2;
  const probe = createCanvas(width, height);
  const probeCtx = probe.getContext("2d");
  probeCtx.font = "32px Cairo";
  const lines = wrap(probeCtx, `${input.letterhead ? `${input.letterhead}\n` : ""}${input.body}`, max);
  const pages: string[][] = [];
  let bucket: string[] = [];
  const capacity = 34;
  for (const line of lines) {
    bucket.push(line);
    if (bucket.length >= capacity) {
      pages.push(bucket);
      bucket = [];
    }
  }
  if (bucket.length || pages.length === 0) pages.push(bucket);

  const doc = new PDFDocument({
    autoFirstPage: false,
    info: {
      Author: RELEASE_OWNER,
      Title: input.title,
      Creator: RELEASE_MARK,
      Producer: RELEASE_MARK,
    },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  pages.forEach((pageLines, index) => {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.fillStyle = "#0F1F3D";
    ctx.font = index === 0 ? "bold 54px Cairo" : "32px Cairo";
    let y = index === 0 ? 140 : 120;
    if (index === 0) {
      ctx.fillText(input.title, width - margin, y);
      y += 78;
      ctx.font = "32px Cairo";
    }
    for (const line of pageLines) {
      if (line) ctx.fillText(line, width - margin, y);
      y += 44;
    }
    ctx.fillStyle = "#64748B";
    ctx.font = "24px Cairo";
    ctx.fillText(String(index + 1), width / 2, height - 60);
    doc.addPage({ size: "A4", margin: 0 });
    doc.image(canvas.toBuffer("image/png"), 0, 0, { width: 595.28, height: 841.89 });
  });
  doc.end();
  return done;
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
