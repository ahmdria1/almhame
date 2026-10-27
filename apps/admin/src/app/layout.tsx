import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "إدارة المحامي الإلكتروني",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
