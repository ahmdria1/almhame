import { randomBytes, timingSafeEqual } from "crypto";
import type { NextFunction, Request, Response } from "express";

export function cookieSecure(nodeEnv: string): boolean {
  return nodeEnv === "production";
}

export function cookieSettings(config: { nodeEnv: string; cookieDomain?: string }): { secure: boolean; domain: string } {
  return { secure: cookieSecure(config.nodeEnv), domain: (config.cookieDomain || "").trim() };
}

function flags(secure: boolean, domain: string) {
  return {
    httpOnly: true as const,
    secure,
    sameSite: "strict" as const,
    ...(domain ? { domain } : {}),
  };
}

export function setAccessCookie(res: Response, token: string, secure: boolean, domain = "") {
  res.cookie("elw_access", token, { ...flags(secure, domain), path: "/api", maxAge: 12 * 3600 * 1000 });
}

export function setRefreshCookie(res: Response, token: string, secure: boolean, domain = "") {
  res.cookie("elw_refresh", token, { ...flags(secure, domain), path: "/api/auth", maxAge: 30 * 24 * 3600 * 1000 });
}

export function setAdminCookie(res: Response, token: string, secure: boolean, domain = "") {
  res.cookie("elw_admin", token, { ...flags(secure, domain), path: "/api/admin", maxAge: 8 * 3600 * 1000 });
}

export function clearSessionCookies(res: Response, domain = "") {
  const base = flags(false, domain);
  res.clearCookie("elw_access", { path: "/api", ...(base.domain ? { domain: base.domain } : {}) });
  res.clearCookie("elw_refresh", { path: "/api/auth", ...(base.domain ? { domain: base.domain } : {}) });
}

export function clearAdminCookie(res: Response, domain = "") {
  const base = flags(false, domain);
  res.clearCookie("elw_admin", { path: "/api/admin", ...(base.domain ? { domain: base.domain } : {}) });
}

export function issueCsrf(req: Request, res: Response, secure: boolean, domain = ""): string {
  const current = req.cookies?.elw_csrf;
  if (typeof current === "string" && /^[a-f0-9]{64}$/.test(current)) return current;
  const token = randomBytes(32).toString("hex");
  res.cookie("elw_csrf", token, { ...flags(secure, domain), path: "/api", maxAge: 30 * 24 * 3600 * 1000 });
  return token;
}

const CSRF_EXEMPT = new Set(["/api/payments/webhook", "/api/payments/callback"]);

export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    next();
    return;
  }
  const path = (req.originalUrl || req.url || "").split("?")[0];
  if (CSRF_EXEMPT.has(path)) {
    next();
    return;
  }
  const authorization = req.headers.authorization || "";
  if (authorization.startsWith("Bearer ")) {
    next();
    return;
  }
  const cookieToken = typeof req.cookies?.elw_csrf === "string" ? req.cookies.elw_csrf : "";
  const hasSession = Boolean(req.cookies?.elw_access || req.cookies?.elw_admin || req.cookies?.elw_refresh);
  if (!cookieToken && !hasSession) {
    next();
    return;
  }
  const sent = req.get("x-csrf-token") || "";
  const left = Buffer.from(cookieToken);
  const right = Buffer.from(sent);
  if (!cookieToken || left.length !== right.length || !timingSafeEqual(left, right)) {
    res.status(403).json({ error: { code: "CSRF", message: "Missing security token" } });
    return;
  }
  next();
}
