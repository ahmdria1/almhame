const NAVY = "#17345F";
const TEAL = "#176373";

export interface FilingMailInput {
  caseNumber: string;
  court: string;
  title: string;
  filer: string;
  filedAt: Date;
  responseDeadline: Date | null;
  replyUrl: string;
}

export function formatGregorian(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Riyadh" }).format(date);
}

export function formatHijri(date: Date): string {
  return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(date);
}

export function filingEmailHtml(input: FilingMailInput): string {
  const deadline = input.responseDeadline
    ? `<p>آخر موعد للرد الوارد من المصدر: ${formatHijri(input.responseDeadline)} الموافق ${formatGregorian(input.responseDeadline)}</p>`
    : "";
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" />
</head>
<body style="margin:0;background:#f6f7f4;font-family:Cairo,sans-serif;color:${NAVY}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f4;padding:24px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;padding:24px">
        <tr><td>
          <p style="margin:0;color:${TEAL};font-weight:700">المحامي الإلكتروني المتقدم</p>
          <h1 style="margin:12px 0;font-size:22px;color:${NAVY}">مذكرة جديدة في قضيتكم</h1>
          <p>رقم القضية: ${escapeHtml(input.caseNumber)}</p>
          <p>المحكمة: ${escapeHtml(input.court)}</p>
          <p>موضوع المذكرة: ${escapeHtml(input.title)}</p>
          <p>مقدمها: ${escapeHtml(input.filer)}</p>
          <p>تاريخ الإيداع: ${formatHijri(input.filedAt)} الموافق ${formatGregorian(input.filedAt)}</p>
          ${deadline}
          <p><a href="${escapeHtml(input.replyUrl)}" style="display:inline-block;background:${NAVY};color:#ffffff;text-decoration:none;border-radius:12px;padding:12px 16px;font-weight:700">صياغة جواب</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
