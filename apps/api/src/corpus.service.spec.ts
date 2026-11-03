import { CorpusService } from "./corpus.service";

describe("corpus import parser", () => {
  const service = new CorpusService({} as never);

  it("reads a law list and does not invent rows", () => {
    const parsed = service.parseImport(JSON.stringify({ laws: [], sharia: [] }), "application/json", false);
    expect(parsed.laws).toEqual([]);
    expect(parsed.sharia).toEqual([]);
    expect(parsed.confirmOfficial).toBe(false);
  });

  it("names the traffic statute", async () => {
    const gap = await new CorpusService({
      prisma: { law: { count: jest.fn().mockResolvedValue(1) } },
    } as never).governingGap("traffic");
    expect(gap).toBeNull();
  });
});