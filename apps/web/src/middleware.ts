import { type Locale } from "@elawyer/types";
import { NextResponse, type NextRequest } from "next/server";
import { routeLocale } from "@/seo/routing";

function withCookie(response: NextResponse, locale: Locale) {
  if (locale === "ar") return response;
  const domain = (process.env.COOKIE_DOMAIN || "").trim();
  response.cookies.set("elw_locale", locale, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    ...(domain ? { domain } : {}),
  });
  return response;
}

export function middleware(request: NextRequest) {
  const decision = routeLocale(request.nextUrl.pathname, request.cookies.get("elw_locale")?.value);
  const headers = new Headers(request.headers);
  headers.set("x-elw-locale", decision.locale);
  const url = request.nextUrl.clone();
  if (decision.type === "redirect") {
    url.pathname = decision.pathname;
    return withCookie(NextResponse.redirect(url), decision.locale);
  }
  if (decision.type === "rewrite") {
    url.pathname = decision.pathname;
    return withCookie(NextResponse.rewrite(url, { request: { headers } }), decision.locale);
  }
  return withCookie(NextResponse.next({ request: { headers } }), decision.locale);
}

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|icon$|apple-icon$|opengraph-image$|.*\\..*).*)"],
};
