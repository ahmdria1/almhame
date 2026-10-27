import { LOCALES } from "@elawyer/types";

const ROOTS = ["app", "login", "signup", "otp", "forgot", "reset", "pay", "api", "admin", "q"];

export const PRIVATE_ROBOTS = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false, noimageindex: true },
} as const;

export function robotDisallow(): string[] {
  const prefixes = ["", ...LOCALES.map((locale) => `/${locale}`)];
  const rules: string[] = [];
  for (const prefix of prefixes) {
    for (const root of ROOTS) {
      rules.push(`${prefix}/${root}$`);
      rules.push(`${prefix}/${root}/`);
    }
  }
  return rules;
}

export function blockedByRobots(pathname: string): boolean {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return robotDisallow().some((rule) => {
    if (rule.endsWith("$")) return path === rule.slice(0, -1);
    return path.startsWith(rule);
  });
}
