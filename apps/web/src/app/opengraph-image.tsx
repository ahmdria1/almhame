import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

function cairoBold(): string {
  const candidates = [join(process.cwd(), "public/fonts/Cairo-Bold.ttf"), join(process.cwd(), "apps/web/public/fonts/Cairo-Bold.ttf")];
  const found = candidates.find((file) => existsSync(file));
  if (!found) throw new Error("Cairo-Bold.ttf was not found");
  return found;
}

export const alt = "المحامي الإلكتروني المتقدم";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const font = await readFile(cairoBold());
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#17345F", display: "flex", flexDirection: "column", justifyContent: "center", padding: "72px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <svg width="96" height="96" viewBox="0 0 64 64" fill="none">
            <path d="M12 20L32 8L52 20M12 20H52M32 8V54M21 54H43M12 20L4 38H20ZM52 20L44 38H60Z" stroke="#7CC8D4" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="32" cy="8" r="4.5" fill="#1F7A8C" />
            <circle cx="12" cy="20" r="3.8" fill="#1F7A8C" />
            <circle cx="52" cy="20" r="3.8" fill="#1F7A8C" />
            <circle cx="4" cy="38" r="3.5" fill="#1F7A8C" />
            <circle cx="20" cy="38" r="3.5" fill="#1F7A8C" />
            <circle cx="44" cy="38" r="3.5" fill="#1F7A8C" />
            <circle cx="60" cy="38" r="3.5" fill="#1F7A8C" />
          </svg>
        </div>
        <div style={{ marginTop: 36, fontSize: 64, fontFamily: "Cairo", color: "#F8FAFC", lineHeight: 1.3 }}>المحامي الإلكتروني المتقدم</div>
        <div style={{ marginTop: 16, fontSize: 28, fontFamily: "Cairo", color: "#1F7A8C" }}>صياغة قانونية للجهات القضائية السعودية</div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Cairo", data: font, style: "normal", weight: 700 }],
    },
  );
}
