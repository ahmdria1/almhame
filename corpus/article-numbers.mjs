const UNITS = new Map([
  ["الأولى", 1],
  ["الاولى", 1],
  ["الأول", 1],
  ["الاول", 1],
  ["الحادية", 1],
  ["الواحد", 1],
  ["واحدة", 1],
  ["الثانية", 2],
  ["الثاني", 2],
  ["الثالثة", 3],
  ["الثالث", 3],
  ["الرابعة", 4],
  ["الرابع", 4],
  ["الخامسة", 5],
  ["الخامس", 5],
  ["السادسة", 6],
  ["السادس", 6],
  ["السابعة", 7],
  ["السابع", 7],
  ["الثامنة", 8],
  ["الثامن", 8],
  ["التاسعة", 9],
  ["التاسع", 9],
]);

const TEENS = new Set(["عشرة", "عشر", "العاشرة", "العاشر"]);

const TENS = new Map([
  ["العشرون", 20],
  ["العشرين", 20],
  ["الثلاثون", 30],
  ["الثلاثين", 30],
  ["الأربعون", 40],
  ["الأربعين", 40],
  ["الخمسون", 50],
  ["الخمسين", 50],
  ["الستون", 60],
  ["الستين", 60],
  ["السبعون", 70],
  ["السبعين", 70],
  ["الثمانون", 80],
  ["الثمانين", 80],
  ["التسعون", 90],
  ["التسعين", 90],
]);

const HUNDREDS = new Map([
  ["المائة", 100],
  ["المائه", 100],
  ["مائة", 100],
  ["مئة", 100],
  ["المئة", 100],
  ["المائتين", 200],
  ["المائتان", 200],
  ["مئتين", 200],
  ["الثلاثمائة", 300],
  ["ثلاثمائة", 300],
  ["الأربعمائة", 400],
  ["أربعمائة", 400],
  ["الخمسمائة", 500],
  ["خمسمائة", 500],
  ["الستمائة", 600],
  ["ستمائة", 600],
  ["السبعمائة", 700],
  ["سبعمائة", 700],
  ["الثمانمائة", 800],
  ["ثمانمائة", 800],
  ["التسعمائة", 900],
  ["تسعمائة", 900],
]);

const EASTERN = "٠١٢٣٤٥٦٧٨٩";

export function normalizeSpace(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function normalizeCompare(value) {
  return normalizeSpace(value).replace(/\s+/g, " ");
}

function westernDigits(value) {
  return value.replace(/[٠-٩]/g, (digit) => String(EASTERN.indexOf(digit)));
}

function wordsOf(value) {
  return westernDigits(value)
    .replace(/[«»":：،,.\-–—]/g, " ")
    .replace(/المادية/g, " ")
    .replace(/المادة/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^و/, ""))
    .filter((token) => token && token !== "و");
}

function parseUnder100(tokens) {
  if (tokens.length === 0) return null;
  if (tokens.length === 1) {
    if (UNITS.has(tokens[0])) return UNITS.get(tokens[0]);
    if (TENS.has(tokens[0])) return TENS.get(tokens[0]);
    if (TEENS.has(tokens[0])) return 10;
    if (HUNDREDS.has(tokens[0])) return HUNDREDS.get(tokens[0]);
    return null;
  }
  if (tokens.length === 2 && TEENS.has(tokens[1]) && UNITS.has(tokens[0])) return UNITS.get(tokens[0]) + 10;
  if (tokens.length === 2 && TENS.has(tokens[1]) && UNITS.has(tokens[0])) return UNITS.get(tokens[0]) + TENS.get(tokens[1]);
  return null;
}

function parsed(kind, article, extra) {
  return { ok: true, kind, article, ...extra };
}

export function parseHeading(raw) {
  const original = normalizeSpace(raw).replace(/[:：]\s*$/g, "").trim();
  const western = westernDigits(original);
  const bis = /مكرر/.test(western);
  let withoutBis = western.replace(/مكرر(?:ة|ا)?/g, " ").replace(/\s+/g, " ").trim();
  let duplicate = "";
  const marked = withoutBis.match(/^(.*\S)\s+\((\d+)\)$/);
  if (marked) {
    const probe = parseCore(marked[1], false, "");
    if (probe.ok) {
      withoutBis = marked[1];
      duplicate = ` (${Number(marked[2])})`;
    }
  }
  return parseCore(withoutBis, bis, duplicate, original);
}

function parseCore(withoutBis, bis, duplicate, original = withoutBis) {
  const suffix = `${bis ? " مكرر" : ""}${duplicate}`;
  const slash = withoutBis.match(/(\d+)\s*\/\s*(\d+)/);
  const arabicLeft = withoutBis.replace(/المادية/g, "").replace(/المادة/g, "");
  if (slash && !/[\u0600-\u06FF]/.test(arabicLeft)) {
    return parsed("regulation", Number(slash[2]), {
      clause: Number(slash[1]),
      bis,
      duplicate,
      label: `${Number(slash[1])}/${Number(slash[2])}${suffix}`,
      ordinal: original,
    });
  }
  const bare = withoutBis.match(/^(?:المادية\s*|المادة\s*)?\(?\s*(\d+)\s*\)?$/);
  if (bare) {
    return parsed("statute", Number(bare[1]), {
      clause: null,
      bis,
      duplicate,
      label: `${Number(bare[1])}${suffix}`,
      ordinal: original,
    });
  }
  const chunks = withoutBis.split(/\s+بعد\s+/);
  const head = parseUnder100(wordsOf(chunks[0]));
  const tail = chunks[1] ? parseUnder100(wordsOf(chunks[1])) : 0;
  if (head == null || tail == null || chunks.length > 2) {
    return { ok: false, kind: "unknown", clause: null, article: null, bis, duplicate, label: original, ordinal: original };
  }
  return parsed("statute", head + tail, {
    clause: null,
    bis,
    duplicate,
    label: `${head + tail}${suffix}`,
    ordinal: original,
  });
}

export function citationLabel(raw) {
  const parsed = parseHeading(raw);
  return parsed.ok ? parsed.label : normalizeSpace(raw);
}

const REPEALED = /^(?:ملغاة|ملغى|ملغية|أُلغيت|الغيت|تم إلغاء هذه المادة)(?:\s*[.۔])?$/;

export function isRepealed(text) {
  const value = normalizeCompare(text);
  return REPEALED.test(value) || value === "-" || value === "—";
}

export function isBlank(text) {
  return normalizeCompare(text).length === 0;
}
