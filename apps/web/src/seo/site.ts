export function siteUrl(): string {
  const value = (process.env.SITE_URL || "").trim().replace(/\/$/, "");
  if (!value) throw new Error("SITE_URL is not set");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("SITE_URL is not a valid absolute URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("SITE_URL must be an http(s) URL");
  }
  return url.origin;
}

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, siteUrl()).href;
}

export function contactEmail(): string | null {
  const value = (process.env.CONTACT_EMAIL || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return value;
}
