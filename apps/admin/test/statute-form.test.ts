import assert from "node:assert/strict";
import test from "node:test";
import { pastedStatuteBlock, statuteImportBody, unchangedOfficialImport } from "../src/lib/statute-form.ts";

const article = { number: "المادة الأولى", textAr: "نص رسمي" };

test("a paste with no citation is not sent", () => {
  const draft = { key: "labor", nameAr: "نظام العمل", sourceUrl: "https://laws.boe.gov.sa/x", version: "  ", articles: [article] };
  assert.equal(pastedStatuteBlock(draft), "الاستشهاد الرسمي مطلوب.");
});

test("a paste with no articles is not sent", () => {
  const draft = { key: "labor", nameAr: "نظام العمل", sourceUrl: "https://laws.boe.gov.sa/x", version: "م/51", articles: [] };
  assert.match(pastedStatuteBlock(draft) || "", /لا توجد مواد/);
});

test("the body keeps empty source and empty article text for the API to reject", () => {
  const draft = { key: "labor", nameAr: "نظام العمل", sourceUrl: "  ", version: "م/51", articles: [{ number: "", textAr: "  " }] };
  assert.equal(pastedStatuteBlock(draft), null);
  const body = statuteImportBody(draft);
  assert.equal(body.laws[0].sourceUrl, "");
  assert.equal(body.laws[0].version, "م/51");
  assert.equal(body.laws[0].articles[0].number, "");
  assert.equal(body.laws[0].articles[0].textAr, "");
  assert.equal(body.laws[0].articles[0].textEn, "");
  assert.equal(body.laws[0].nameEn, "نظام العمل");
});

test("an import file is not rewritten and is refused when it has no citation or no articles", () => {
  const raw = ' \n{"laws":[{"key":"labor","nameAr":"نظام العمل","version":"م/51","sourceUrl":"","articles":[{"number":"","textAr":""}]}]}\n ';
  const accepted = unchangedOfficialImport(raw);
  assert.deepEqual(accepted, { body: raw.trim() });

  const noCitation = unchangedOfficialImport('{"laws":[{"key":"labor","version":" ","articles":[{"number":"1","textAr":"نص"}]}]}');
  assert.deepEqual(noCitation, { error: "الاستشهاد الرسمي مطلوب في الملف." });

  const noArticles = unchangedOfficialImport('{"laws":[{"key":"labor","version":"م/51","articles":[]}]}');
  assert.deepEqual(noArticles, { error: "الملف لا يحتوي مواد النظام." });
});
