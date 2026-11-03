import type { Locale, ServiceCode } from "@elawyer/types";
import { authPath, pagePath } from "@/seo/catalog";

/** Public page for a priced service. Review and chat packs have no separate article, so they open signup. */
export function serviceHref(locale: Locale, code: ServiceCode): string {
  if (code === "lawsuit") return pagePath(locale, { kind: "doc", id: "lawsuit" });
  if (code === "defense") return pagePath(locale, { kind: "doc", id: "defense" });
  if (code === "objection") return pagePath(locale, { kind: "doc", id: "objection" });
  return authPath(locale, "/signup");
}
