import { readFileSync } from "fs";
import { join } from "path";
import { redactSentryEvent } from "./instrument";

describe("sentry beforeSend", () => {
  it("drops the request body and keeps only the draft-check whitelist", () => {
    const secret = "واقعة سرية لا تُسجل خالد طلب مبلغًا لم يذكره";
    const event = redactSentryEvent({
      request: { data: secret, cookies: secret, headers: { cookie: secret }, query_string: secret },
      extra: {
        draftCheck: {
          recordId: "labor-77",
          articleNumber: "77",
          statute: "نظام العمل",
          modelId: "draft-model",
          attempt: 1,
          failureType: "quote",
          quoteSpan: "وجب دفع الأجر",
          facts: secret,
          memo: secret,
        },
        other: secret,
      },
    });
    expect(event.request?.data).toBeUndefined();
    expect(event.request?.cookies).toBeUndefined();
    expect(event.request?.headers).toBeUndefined();
    expect(event.request?.query_string).toBeUndefined();
    expect(event.extra).toEqual({
      draftCheck: {
        recordId: "labor-77",
        articleNumber: "77",
        statute: "نظام العمل",
        modelId: "draft-model",
        attempt: 1,
        failureType: "quote",
        quoteSpan: "وجب دفع الأجر",
      },
    });
    expect(JSON.stringify(event)).not.toContain("واقعة سرية");
    expect(JSON.stringify(event)).not.toContain("خالد طلب");
    const source = readFileSync(join(__dirname, "instrument.ts"), "utf8");
    expect(source).toMatch(/beforeSend\(event\)\s*\{\s*return redactSentryEvent\(event\);/);
  });
});
