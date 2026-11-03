import { canonicalFiling, filingsFromPayload, isNewFiling, NajizCaseSource, najizConnected, najizStatus, signCallback, signaturesMatch, type CourtFilingNotice } from "./najiz";
import type { AppConfig } from "../config";

const filing: CourtFilingNotice = {
  externalId: "ext-1",
  title: "مذكرة جواب",
  filer: "شركة أفق",
  filedAt: "2024-03-14T09:00:00.000Z",
  responseDeadline: null,
};

function config(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    najizBaseUrl: "",
    najizClientId: "",
    najizClientSecret: "",
    najizCallbackSecret: "",
    najizTokenPath: "",
    najizCaseQueryPath: "",
    ...overrides,
  } as AppConfig;
}

describe("najiz adapter", () => {
  it("stays not connected until every issued value is set", () => {
    expect(najizStatus(config())).toBe("not connected");
    expect(najizConnected(config())).toBe(false);
    expect(najizConnected(config({ najizBaseUrl: "https://developers.najiz.sa", najizClientId: "id" }))).toBe(false);
    expect(najizConnected(config({
      najizBaseUrl: "https://developers.najiz.sa",
      najizClientId: "id",
      najizClientSecret: "secret",
      najizCallbackSecret: "callback",
      najizTokenPath: "/token",
      najizCaseQueryPath: "/cases?caseNumber={caseNumber}&court={court}",
    }))).toBe(true);
    expect(najizConnected(config({
      najizBaseUrl: "https://developers.najiz.sa",
      najizClientId: "id",
      najizClientSecret: "secret",
      najizCallbackSecret: "callback",
      najizTokenPath: "/token",
      najizCaseQueryPath: "/cases",
    }))).toBe(false);
    expect(najizStatus(config({
      najizBaseUrl: "https://developers.najiz.sa",
      najizClientId: "id",
      najizClientSecret: "secret",
      najizCallbackSecret: "callback",
      najizTokenPath: "/token",
      najizCaseQueryPath: "/cases?caseNumber={caseNumber}&court={court}",
    }))).toBe("connected");
  });

  it("verifies the callback signature and ignores a wrong one", () => {
    const payload = canonicalFiling({ ...filing, caseNumber: "445", court: "labor" });
    const signature = signCallback("callback", payload);
    expect(signaturesMatch(signature, signature)).toBe(true);
    expect(signaturesMatch(signature, "00")).toBe(false);
    expect(signaturesMatch(signature, "")).toBe(false);
  });

  it("keeps only complete filings and drops a repeated external id", () => {
    const rows = filingsFromPayload({
      filings: [
        filing,
        { ...filing, title: "مكرر" },
        { ...filing, externalId: "ext-2", responseDeadline: "not-a-date" },
        { title: "ناقص" },
      ],
    });
    expect(rows.map((item) => item.externalId)).toEqual(["ext-1"]);
    const known = new Set(rows.map((item) => item.externalId));
    expect(isNewFiling(known, "ext-1")).toBe(false);
    expect(isNewFiling(known, "ext-9")).toBe(true);
  });

  it("does not call Najiz while the issued paths are unset", async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<typeof fetch>;
    const source = new NajizCaseSource(config(), fetchImpl);
    await expect(source.poll({ caseNumber: "445", court: "labor" })).resolves.toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(source.verifyCallback(canonicalFiling({ ...filing, caseNumber: "445", court: "labor" }), "ab")).toBe(false);
  });

  it("queries the configured product paths and drops an incomplete row", async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<typeof fetch>;
    fetchImpl
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "tok" }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ filings: [filing, { title: "ناقص" }] }) } as Response);
    const source = new NajizCaseSource(config({
      najizBaseUrl: "https://developers.najiz.sa",
      najizClientId: "id",
      najizClientSecret: "secret",
      najizCallbackSecret: "callback",
      najizTokenPath: "/oauth/token",
      najizCaseQueryPath: "/cases/query?caseNumber={caseNumber}&court={court}",
    }), fetchImpl);
    await expect(source.poll({ caseNumber: "445", court: "labor" })).resolves.toEqual([filing]);
    const tokenUrl = String(fetchImpl.mock.calls[0][0]);
    const queryUrl = String(fetchImpl.mock.calls[1][0]);
    expect(tokenUrl).toBe("https://developers.najiz.sa/oauth/token");
    expect(queryUrl).toBe("https://developers.najiz.sa/cases/query?caseNumber=445&court=labor");
    const tokenInit = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(tokenInit.method).toBe("POST");
    const queryInit = fetchImpl.mock.calls[1][1] as RequestInit;
    expect((queryInit.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("stops when the token or the query is rejected", async () => {
    const live = config({
      najizBaseUrl: "https://developers.najiz.sa",
      najizClientId: "id",
      najizClientSecret: "secret",
      najizCallbackSecret: "callback",
      najizTokenPath: "/oauth/token",
      najizCaseQueryPath: "/cases/query?caseNumber={caseNumber}&court={court}",
    });
    const denied = jest.fn() as jest.MockedFunction<typeof fetch>;
    denied.mockResolvedValueOnce({ ok: false, status: 401 } as Response);
    await expect(new NajizCaseSource(live, denied).poll({ caseNumber: "445", court: "labor" })).rejects.toThrow("Najiz token 401");
    const empty = jest.fn() as jest.MockedFunction<typeof fetch>;
    empty.mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);
    await expect(new NajizCaseSource(live, empty).poll({ caseNumber: "445", court: "labor" })).rejects.toThrow("no access token");
    const failedQuery = jest.fn() as jest.MockedFunction<typeof fetch>;
    failedQuery
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "tok" }) } as Response)
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    await expect(new NajizCaseSource(live, failedQuery).poll({ caseNumber: "445", court: "labor" })).rejects.toThrow("Najiz case query 500");
    const payload = canonicalFiling({ ...filing, caseNumber: "445", court: "labor" });
    const signed = new NajizCaseSource(live, denied);
    expect(signed.verifyCallback(payload, signCallback("callback", payload))).toBe(true);
    expect(signed.verifyCallback(payload, signCallback("other", payload))).toBe(false);
  });
});
