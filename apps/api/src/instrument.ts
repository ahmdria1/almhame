import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.headers;
        delete event.request.query_string;
      }
      const raw = event.extra?.draftCheck;
      event.extra = undefined;
      if (raw && typeof raw === "object") {
        const row = raw as Record<string, unknown>;
        event.extra = {
          draftCheck: {
            recordId: String(row.recordId || "").slice(0, 80),
            articleNumber: String(row.articleNumber || "").slice(0, 40),
            statute: String(row.statute || "").slice(0, 160),
            modelId: String(row.modelId || "").slice(0, 80),
            attempt: Number(row.attempt) || 0,
            failureType: String(row.failureType || "").slice(0, 40),
            quoteSpan: String(row.quoteSpan || "").slice(0, 400),
          },
        };
      }
      return event;
    },
  });
}
