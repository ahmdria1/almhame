import { filingEmailHtml, formatHijri } from "./case-alert-mail";

describe("case filing mail", () => {
  const filedAt = new Date("2024-03-14T09:00:00.000Z");

  it("names the case, the filer, and both calendars, and omits a deadline the source did not send", () => {
    const html = filingEmailHtml({
      caseNumber: "445123",
      court: "المحكمة العمالية",
      title: "مذكرة جواب الخصم",
      filer: "شركة أفق",
      filedAt,
      responseDeadline: null,
      replyUrl: "https://emuhami.com/app?memo=reply&caseNumber=445123",
    });
    expect(html).toContain("Cairo");
    expect(html).toContain("#17345F");
    expect(html).toContain("#176373");
    expect(html).toContain("445123");
    expect(html).toContain("مذكرة جواب الخصم");
    expect(html).toContain("شركة أفق");
    expect(html).toContain(formatHijri(filedAt));
    expect(html).toContain("14 March 2024");
    expect(html).not.toContain("آخر موعد");
  });

  it("prints a response deadline only when the source provided one", () => {
    const deadline = new Date("2024-04-01T00:00:00.000Z");
    const html = filingEmailHtml({
      caseNumber: "445123",
      court: "المحكمة العمالية",
      title: "مذكرة",
      filer: "الخصم",
      filedAt,
      responseDeadline: deadline,
      replyUrl: "https://emuhami.com/app",
    });
    expect(html).toContain(formatHijri(deadline));
    expect(html).toContain("آخر موعد للرد الوارد من المصدر");
    const escaped = filingEmailHtml({
      caseNumber: "1<2",
      court: "labor",
      title: "عنوان",
      filer: "خصم",
      filedAt,
      responseDeadline: null,
      replyUrl: "https://emuhami.com/app?q=\"x\"",
    });
    expect(escaped).toContain("1&lt;2");
    expect(escaped).toContain("&quot;x&quot;");
  });
});
