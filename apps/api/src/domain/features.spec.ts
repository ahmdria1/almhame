import { createHmac } from "crypto";
import { blindTokens, searchWords } from "./blind-index";
import { caseHealthScore } from "./case-health";
import { lineDiff } from "./line-diff";
import { pageMeta, pageQuery } from "./paging";
import { officialTitle, smsProviderFor, verifierModel } from "./sms-provider";
import { loadConfig } from "../config";

describe("paging, search, and notices", () => {
  it("pages with a bounded take", () => {
    expect(pageQuery("2", "100")).toEqual({ page: 2, take: 50, skip: 50 });
    expect(pageQuery(undefined, "0")).toEqual({ page: 1, take: 1, skip: 0 });
    expect(pageMeta(45, 2, 20)).toEqual({ total: 45, page: 2, take: 20, totalPages: 3 });
  });

  it("hashes search words with the user key and hides the word", () => {
    const dek = Buffer.from("0123456789abcdef0123456789abcdef");
    const other = Buffer.from("abcdef0123456789abcdef0123456789");
    const tokens = blindTokens(dek, "قضية عمالية أجر");
    expect(searchWords("قضية عمالية أجر").length).toBeGreaterThan(0);
    expect(tokens[0]).toHaveLength(64);
    expect(tokens[0]).not.toContain("قضية");
    expect(tokens[0]).not.toBe(blindTokens(other, "قضية عمالية أجر")[0]);
    expect(tokens[0]).toBe(createHmac("sha256", dek).update("قضية").digest("hex"));
  });

  it("scores a file from what is present", () => {
    expect(caseHealthScore({ facts: 10, parties: 0, documents: 0, citations: 0 })).toBe(0);
    expect(caseHealthScore({ facts: 40, parties: 2, documents: 2, citations: 2 })).toBe(30 + 40 + 10 + 10);
  });

  it("diffs lines", () => {
    expect(lineDiff("أ\nب", "أ\nج")).toEqual([
      { kind: "same", text: "أ" },
      { kind: "del", text: "ب" },
      { kind: "add", text: "ج" },
    ]);
  });

  it("refuses a mock SMS provider in production and a verifier that matches the drafter", () => {
    const config = loadConfig({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://db",
      JWT_SECRET: "x".repeat(40),
      KMS_MASTER_KEY: Buffer.from("0123456789abcdef0123456789abcdef").toString("base64"),
      OTP_PEPPER: "y".repeat(40),
      SMS_PROVIDER: "mock",
      LLM_PROVIDER: "remote",
      EMBEDDING_PROVIDER: "remote",
      PAYMENT_GATEWAY: "alrajhi",
      SMTP_HOST: "smtp.example.sa",
      SMTP_FROM: "no-reply@emuhami.com",
    });
    expect(smsProviderFor(config)).toBeNull();
    expect(verifierModel("draft-model", "draft-model")).toBeNull();
    expect(verifierModel("draft-model", "check-model")).toBe("check-model");
    expect(officialTitle("<html><title>نظام المرور</title></html>")).toBe("نظام المرور");
  });
});
