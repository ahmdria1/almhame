import { MAX_VOICE_BYTES, MOCK_TRANSCRIPT, mockTranscript, sniffAudio, transcribeRemote } from "./voice";

function wav(): Buffer {
  const data = Buffer.alloc(32);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(8000, 24);
  header.writeUInt32LE(16000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

describe("voice notes", () => {
  it("recognizes the containers a recorder produces", () => {
    expect(sniffAudio(wav())).toBe("wav");
    expect(sniffAudio(Buffer.from("OggS"))).toBe("ogg");
    expect(sniffAudio(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))).toBe("webm");
    expect(sniffAudio(Buffer.from("ID3"))).toBe("mp3");
    expect(sniffAudio(Buffer.from("xxxxftypisom"))).toBe("mp4");
    expect(sniffAudio(Buffer.from("hello"))).toBeNull();
  });

  it("returns a stable transcript for a real recording and rejects junk", () => {
    expect(mockTranscript(wav())).toBe(MOCK_TRANSCRIPT);
    expect(() => mockTranscript(Buffer.alloc(MAX_VOICE_BYTES + 1))).toThrow(/unsupported/);
    expect(() => mockTranscript(Buffer.from("not-audio"))).toThrow(/unsupported/);
  });

  it("reads the transcript from an OpenAI-compatible endpoint", async () => {
    const fetchImpl = jest.fn(async () => new Response(JSON.stringify({ text: "  أجر لم يُصرف  " }), { status: 200 }));
    await expect(transcribeRemote({
      baseUrl: "https://model.example/v1/",
      apiKey: "key",
      model: "draft-model",
      bytes: wav(),
      filename: "note.webm",
      mime: "audio/webm",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toBe("أجر لم يُصرف");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://model.example/v1/audio/transcriptions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer key");
    expect(init.body).toBeInstanceOf(FormData);
  });

  it("fails when the endpoint rejects the recording or returns no text", async () => {
    await expect(transcribeRemote({
      baseUrl: "https://model.example/v1",
      apiKey: "key",
      model: "draft-model",
      bytes: wav(),
      filename: "note.wav",
      mime: "audio/wav",
      fetchImpl: (async () => new Response("no", { status: 500 })) as typeof fetch,
    })).rejects.toThrow(/transcription failed/);
    await expect(transcribeRemote({
      baseUrl: "https://model.example/v1",
      apiKey: "key",
      model: "draft-model",
      bytes: wav(),
      filename: "note.wav",
      mime: "audio/wav",
      fetchImpl: (async () => new Response(JSON.stringify({ text: "  " }), { status: 200 })) as typeof fetch,
    })).rejects.toThrow(/empty transcript/);
  });
});
