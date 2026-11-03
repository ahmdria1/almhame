import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { localDefects } from "./audit-judgements.mjs";
import { courtTypeName, normalizeJudgement } from "./fetch-judgements.mjs";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "official", "judgements");

test("court type names come from the lookup payload", () => {
  const lookups = { courtType: [{ value: 1, name: "أحكام محاكم الدرجة الاولى النهائية" }] };
  assert.equal(courtTypeName(lookups, 1), "أحكام محاكم الدرجة الاولى النهائية");
  assert.equal(courtTypeName(lookups, 9), "");
});

test("a detail with no ruling text is not stored as verbatim", () => {
  const raw = JSON.stringify({
    model: { id: "00000000-0000-0000-0000-000000000000", judgmentNumber: "100000", judgmentTextofRulling: "" },
  });
  const row = normalizeJudgement(raw, "2026-11-03T00:00:00.000Z");
  assert.equal(row.verbatimStatus, "blocked");
  assert.equal(row.fullText, "");
  assert.equal(row.isSample, false);
});

test("a detail without a published number is rejected", () => {
  const raw = JSON.stringify({ model: { id: "00000000-0000-0000-0000-000000000000", judgmentTextofRulling: "<p>نص</p>" } });
  assert.throws(() => normalizeJudgement(raw, "2026-11-03T00:00:00.000Z"), /judgment number/);
});

test("stored judgments keep the official fields", async () => {
  const names = (await readdir(dir)).filter((name) => /^\d+\.json$/.test(name));
  assert.ok(names.length >= 2);
  for (const name of names) {
    const record = JSON.parse(await readFile(path.join(dir, name), "utf8"));
    assert.deepEqual(localDefects(name, record), []);
    assert.ok(record.fullText.length > 40);
  }
});
