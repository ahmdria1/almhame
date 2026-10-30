export const MAX_VOICE_BYTES = 8 * 1024 * 1024;
export const MOCK_TRANSCRIPT = "ملاحظة صوتية: أطلب مراجعة الوقائع المذكورة.";

export type AudioKind = "wav" | "webm" | "mp3" | "ogg" | "mp4";

export function sniffAudio(bytes: Buffer): AudioKind | null {
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WAVE") return "wav";
  if (bytes.length >= 4 && bytes.toString("ascii", 0, 4) === "OggS") return "ogg";
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return "webm";
  if (bytes.length >= 3 && (bytes.toString("ascii", 0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0))) return "mp3";
  if (bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp") return "mp4";
  return null;
}

export function mockTranscript(bytes: Buffer): string {
  if (!sniffAudio(bytes) || bytes.length > MAX_VOICE_BYTES) {
    throw new Error("unsupported");
  }
  return MOCK_TRANSCRIPT;
}

export async function transcribeRemote(input: {
  baseUrl: string;
  apiKey: string;
  model: string;
  bytes: Buffer;
  filename: string;
  mime: string;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const caller = input.fetchImpl || fetch;
  const body = new FormData();
  body.append("model", input.model);
  body.append("file", new Blob([new Uint8Array(input.bytes)], { type: input.mime }), input.filename);
  const response = await caller(`${input.baseUrl.replace(/\/$/, "")}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${input.apiKey}` },
    body,
  });
  if (!response.ok) throw new Error("transcription failed");
  const payload = (await response.json()) as { text?: string };
  const text = payload.text?.trim() || "";
  if (!text) throw new Error("empty transcript");
  return text.slice(0, 8000);
}
