import { jsonLdScript, type JsonLd } from "@/seo/jsonld";

export function JsonLd({ data }: { data: JsonLd }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }} />;
}
