"""Fill statute JSON from a public snapshot of Bureau of Experts pages.

Live TLS to laws.boe.gov.sa times out from some networks, and the Ministry of
Justice gateway does not carry every statute. This script reads the research
snapshot published as endomorphosis/ipfs_saudiarabia_laws (Wayback and Common
Crawl captures of official LawDetails URLs) and writes one JSON file per
instrument. Article text is taken from the captured page. A page-footer form
is cut off. An instrument is skipped when the capture scrambles an article.
"""

from __future__ import annotations

import json
import re
import sys
import urllib.request
from pathlib import Path

import duckdb
from hijri_converter import Hijri

ROOT = Path(__file__).resolve().parents[1]
BOE_DIR = ROOT / "corpus" / "official" / "boe"
CACHE = ROOT / "corpus" / "official" / "cache"
PARQUET_URL = "https://huggingface.co/datasets/endomorphosis/ipfs_saudiarabia_laws/resolve/main/data/laws.parquet"

HEAD = re.compile(
    r"^(المادة(?:\s*\([^)\n]{1,24}\)|\s+[\u0621-\u064A0-9\u0660-\u0669]+(?:\s+[\u0621-\u064A]+){0,8}))\s*:?\s*(.*)$"
)
DATE_PAIR = re.compile(
    r"(\d{4})/(\d{1,2})/(\d{1,2})\s*ه\u0640?\s*الموافق\s*:?\s*(\d{1,2})/(\d{1,2})/(\d{4})\s*م"
)
AMEND = re.compile(
    r"^(?:[-•]\s*)?(?:عُدلت|عدلت|صدر المرسوم|تم إضافة|تعديلات المادة).{0,500}?(?:الآتي|يلي|يلى)\s*:?\s*",
    re.S,
)
FOOTER_MARKERS = (
    "حقل المادة مطلوب",
    "البريد الإلكتروني",
    "رمز التحقق",
    "إشعار إخلاء مسؤولية",
    "\nالإسم",
    "\nالإسم\n",
)

TARGETS = [
    {
        "key": "labor",
        "snapshot_id": "sa-08381293-6388-48e2-8ad2-a9a700f2aa94-ar",
        "courts": ["labor", "appeal"],
        "reject_if_contains": "صاحب العمل: كل شخص طبيعي يعمل لمصلحة صاحب عمل",
    },
    {
        "key": "bog-procedure",
        "snapshot_id": "sa-f2f7b465-b576-4f47-a8e7-a9a700f27202-ar",
        "courts": ["administrative", "appeal", "supreme"],
    },
    {
        "key": "companies",
        "snapshot_id": "sa-a8376aea-1bc3-49d4-9027-aed900b555af-ar",
        "courts": ["commercial"],
    },
    {
        "key": "commercial-papers",
        "snapshot_id": "sa-4763eb94-047b-46f1-9697-a9a700f1b7ed-ar",
        "courts": ["commercial"],
    },
    {
        "key": "cybercrime",
        "snapshot_id": "sa-25df73d6-0f49-4dc5-b010-a9a700f2ec1d-ar",
        "courts": ["criminal"],
    },
    {
        "key": "harassment",
        "snapshot_id": "sa-cc-fcb0b4aa4b40a9",
        "courts": ["criminal"],
    },
    {
        "key": "commercial-fraud",
        "snapshot_id": "sa-cc-49818590753d54",
        "courts": ["commercial", "criminal"],
    },
    {
        "key": "financial-fraud",
        "snapshot_id": "sa-905e11b3-4d66-496c-9c1b-ad240106367f-ar",
        "courts": ["criminal", "commercial"],
    },
]


def parquet_path() -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    target = CACHE / "laws.parquet"
    if not target.exists() or target.stat().st_size < 1000:
        urllib.request.urlretrieve(PARQUET_URL, target)
    return target


def norm_number(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().rstrip(":").strip()


def strip_footer(body: str) -> str:
    cut = len(body)
    for marker in FOOTER_MARKERS:
        index = body.find(marker)
        if index != -1:
            cut = min(cut, index)
    return body[:cut].strip()


def clean_body(body: str) -> str:
    body = strip_footer(body)
    body = re.sub(r"^تعديلات المادة\s*", "", body).strip()
    match = AMEND.match(body)
    if match and len(body) - match.end() > 25:
        body = body[match.end() :].strip().strip("\"“”").strip()
    return body


def split_articles(text: str) -> list[dict[str, str]]:
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines() if line.strip()]
    blocks: list[dict[str, object]] = []
    current: dict[str, object] | None = None
    for line in lines:
        match = HEAD.match(line)
        if match and len(match.group(1)) <= 60:
            if current:
                blocks.append(current)
            current = {"number": norm_number(match.group(1)), "lines": [match.group(2)] if match.group(2).strip() else []}
        elif current is not None:
            current["lines"].append(line)
    if current:
        blocks.append(current)
    grouped: dict[str, str] = {}
    order: list[str] = []
    for block in blocks:
        body = "\n".join(str(line) for line in block["lines"]).strip()
        number = str(block["number"])
        if number not in grouped:
            grouped[number] = body
            order.append(number)
            continue
        current = grouped[number]
        current_clean = clean_body(current)
        incoming_clean = clean_body(body)
        current_noise = "حقل المادة" in current or "إخلاء مسؤولية" in current
        incoming_noise = "حقل المادة" in body or "إخلاء مسؤولية" in body
        if incoming_noise and not current_noise:
            continue
        if current_noise and not incoming_noise:
            grouped[number] = body
        elif len(incoming_clean) > len(current_clean):
            grouped[number] = body
    articles = []
    for number in order:
        text_ar = clean_body(grouped[number])
        if len(text_ar) < 15:
            continue
        articles.append({"number": number, "textAr": text_ar})
    return articles


def gregorian_and_hijri(text: str) -> tuple[str, str, str, str]:
    pairs = DATE_PAIR.findall(text)
    issued = ""
    published = ""
    effective = ""
    if pairs:
        hy, hm, hd, gd, gm, gy = pairs[0]
        issued = f"{hy}-{hm.zfill(2)}-{hd.zfill(2)}"
        effective = f"{gy}-{gm.zfill(2)}-{gd.zfill(2)}"
    if len(pairs) > 1:
        hy, hm, hd, _, _, _ = pairs[1]
        published = f"{hy}-{hm.zfill(2)}-{hd.zfill(2)}"
    status = ""
    status_match = re.search(r"الحالة\s+(ساري|ملغي|جاري العمل[^\n]{0,24})", text)
    if status_match:
        status = status_match.group(1).strip()
    return issued, published, effective or "" , status


def hijri_to_gregorian(value: str) -> str | None:
    match = re.match(r"(\d{4})-(\d{2})-(\d{2})", value or "")
    if not match:
        return None
    year, month, day = (int(part) for part in match.groups())
    if year < 1300 or year > 1600:
        return None
    try:
        converted = Hijri(year, month, day).to_gregorian()
    except Exception:
        return None
    return converted.isoformat()


def repair_moj_dates() -> None:
    for path in BOE_DIR.glob("*.json"):
        if path.name in {"manifest-report.json", "blocked.json"}:
            continue
        record = json.loads(path.read_text())
        if record.get("effectiveDate") != "1970-01-01":
            continue
        converted = hijri_to_gregorian(record.get("issuedHijri") or "") or hijri_to_gregorian(record.get("publishedHijri") or "")
        if not converted:
            continue
        record["effectiveDate"] = converted
        record["dateNote"] = "Gregorian date converted from the Hijri issue date returned by the Ministry of Justice gateway."
        path.write_text(json.dumps(record, ensure_ascii=False))
        print("date", record["key"], converted, record.get("issuedHijri"))


def main() -> None:
    only = set(sys.argv[1:])
    selected = [item for item in TARGETS if not only or item["key"] in only]
    path = parquet_path()
    connection = duckdb.connect()
    notes = []
    for item in selected:
        row = connection.execute(
            "SELECT title, text, source_url FROM read_parquet(?) WHERE id = ?",
            [str(path), item["snapshot_id"]],
        ).fetchone()
        if not row:
            notes.append({"key": item["key"], "reason": "Snapshot row was not found"})
            print("missing", item["key"])
            continue
        title, text, source_url = row
        marker = item.get("reject_if_contains")
        if marker and marker in text:
            notes.append(
                {
                    "key": item["key"],
                    "nameAr": title,
                    "reason": "The captured Bureau page interleaves amendment notes into the article so the wording is not reliable. Live laws.boe.gov.sa did not respond, and the Ministry of Justice gateway does not list this statute.",
                    "sourceUrl": source_url.split("?")[0],
                }
            )
            print("rejected", item["key"])
            continue
        articles = split_articles(text)
        issued, published, effective, status = gregorian_and_hijri(text)
        if item["key"] == "commercial-fraud":
            title = "نظام مكافحة الغش التجاري"
        if len(articles) < 8:
            notes.append({"key": item["key"], "nameAr": title, "reason": f"Only {len(articles)} articles survived cleaning", "sourceUrl": source_url.split("?")[0]})
            print("too few", item["key"], len(articles))
            continue
        source = source_url.split("?")[0]
        record = {
            "key": item["key"],
            "nameAr": title,
            "nameEn": title,
            "sourceUrl": source,
            "version": "boe-snapshot",
            "effectiveDate": effective or "1970-01-01",
            "issuedHijri": issued,
            "publishedHijri": published,
            "statusLabel": status,
            "isSample": False,
            "courts": item["courts"],
            "articles": [{"number": article["number"], "textAr": article["textAr"], "sourceUrl": source} for article in articles],
            "via": "boe-snapshot",
            "boeUrl": source,
        }
        (BOE_DIR / f"{item['key']}.json").write_text(json.dumps(record, ensure_ascii=False))
        print("wrote", item["key"], len(articles), effective or "no-date", status, title)
    blocked_path = BOE_DIR / "blocked.json"
    existing = json.loads(blocked_path.read_text()) if blocked_path.exists() else []
    kept = [row for row in existing if row.get("key") not in {item["key"] for item in selected}]
    blocked_path.write_text(json.dumps(kept + notes, ensure_ascii=False, indent=2))
    repair_moj_dates()


if __name__ == "__main__":
    main()
