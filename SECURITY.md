# Ignored dependency advisories

`pnpm.auditConfig.ignoreCves` lists `CVE-2026-56876` and `CVE-2026-19693`. Both apply to `extract-zip` versions up to `2.0.1`. The npm registry still publishes `2.0.1` as the current release, and the upstream advisory has no patched version. The ignore stays until that changes.

## Where the package is

`pnpm why extract-zip` shows one copy, `extract-zip@2.0.1`:

- `@elawyer/api` depends on `puppeteer-core@24.15.0`, which depends on `@puppeteer/browsers@2.10.6`, which depends on `extract-zip@2.0.1`.
- The root dev dependency `@lhci/cli@0.15.1` reaches the same package through `lighthouse` and `puppeteer-core`.

`playwright@1.55.1` does not depend on `extract-zip`.

## Why it is not on the PDF path

`extract-zip` is imported by `@puppeteer/browsers` in `unpackArchive`, and `unpackArchive` is called from `install()` when a downloaded browser archive is unpacked.

`apps/api/src/render.ts` launches `puppeteer-core` with `executablePath` set to `CHROMIUM_PATH` or `/usr/bin/google-chrome`, then stamps the file with `pdf-lib`. That path does not download a browser and does not call `install()` or `unpackArchive`. No application source imports `extract-zip`.

## When to revisit

Remove both identifiers from `pnpm.auditConfig.ignoreCves` after `extract-zip` publishes a release greater than `2.0.1`, or after `puppeteer-core` and `@puppeteer/browsers` stop depending on it. Re-check with `pnpm why extract-zip` and `pnpm audit --audit-level high`.
