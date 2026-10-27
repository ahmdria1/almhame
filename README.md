# المحامي الإلكتروني المتقدم

Saudi legal-drafting workspace for lawsuit, defense, reply, and appeal memos. The web app, admin console, and Expo app (iOS and Android from one codebase) talk to one NestJS API.

Statute text is stored under `corpus/official/boe`. The fetcher tries `laws.boe.gov.sa` first. When that host does not answer, it reads the current consolidated text from the Ministry of Justice legislation gateway and keeps the Bureau URL the gateway returns. Instruments the gateway does not carry are taken from a public snapshot of the same Bureau pages (`corpus/snapshot_fallback.py`). Re-run `node corpus/fetch-official.mjs`, then `node apps/api/dist/cli.js import-corpus`.

`نظام العمل` is imported from a public snapshot of its Bureau page. The live Bureau site did not answer, and the justice gateway does not list it. The same snapshot reader supplied the criminal statutes the gateway does not carry: narcotics, bribery, forgery, money laundering, terrorism and its financing, juveniles, weapons, abuse, trafficking, traffic, and the criminal-procedure regulation. `نظام الإجراءات الجزائية` was checked again against the justice gateway and still has 222 articles. `نظام المؤسسة العامة للسجون` was not imported. Legal maxims (`القواعد الفقهية`) are not imported: no machine-readable edition of a published qawaid work was available. Quran text is the Tanzil Uthmani file (6,236 verses). Hadith text is the Arabic editions of Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasai, Ibn Majah, and Malik from the open hadith-api dataset, with book, number, and grade.

Chat uploads are scanned with ClamAV before they are stored. Set `CLAMAV_HOST` to the daemon. Production refuses the upload when the scanner is down.

## Layout

- `apps/api` — NestJS, Prisma, PostgreSQL with pgvector, Redis/BullMQ, Socket.IO
- `apps/web` — Next.js workspace (port 4720)
- `apps/admin` — aggregate dashboard and corpus import (port 4730)
- `apps/mobile` — Expo
- `packages/types`, `packages/i18n`, `packages/tokens`, `packages/api-client`

Arabic, English, Urdu, Hindi, Punjabi (Shahmukhi), Sinhala, Bengali, Nepali, Filipino, Turkish, and Amharic share one key set. Urdu and Punjabi use right-to-left layout.

## Local run

Requirements: Node.js 22, pnpm 10, PostgreSQL 16 with the `vector` extension, Redis, and Chromium (`CHROMIUM_PATH`, or `/usr/bin/google-chrome`) for selectable Arabic PDF export. Optional: Tesseract (`ara`+`eng`) and Poppler for scanned documents.

```bash
cp .env.example .env
cp .env apps/api/.env
# Put a real 32-byte base64 KMS_MASTER_KEY in both files before any shared deployment.
createdb elawyer || true
createdb elawyer_test || true
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector"
psql "$TEST_DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector"
pnpm install
pnpm --filter @elawyer/api exec prisma generate
pnpm --filter @elawyer/api exec prisma migrate deploy
pnpm --filter @elawyer/api dev
pnpm --filter @elawyer/web dev
pnpm --filter @elawyer/admin dev
pnpm --filter @elawyer/mobile dev
```

- API: http://127.0.0.1:4710/api/health
- Web: http://127.0.0.1:4720
- Admin: http://127.0.0.1:4730
- Expo: port 4740

Sign-up stores a password and emails a confirmation code. The account cannot sign in until that code is used. With `EMAIL_DEBUG=true` outside production, the API also returns the code and writes `data/outbox`. Production refuses to boot when the model, embeddings, SMS, or payment provider is still `mock`/`sandbox`, and it requires SMTP.

The first admin is not created on boot:

```bash
pnpm --filter @elawyer/api build
node apps/api/dist/cli.js create-admin --email you@example.sa
```

Open the link in the email (or the outbox file), set a password, then sign in at the admin console.

## CI gates

`.github/workflows/ci.yml` runs on every push and pull request to `main`. Each step is required. A failed step fails the workflow, and the image build does not start unless every gate passed. There is no status badge.

1. `pnpm install --frozen-lockfile`
2. `node corpus/audit.mjs` checks article sequence, official text where the source answers, Quran ayah counts, and hadith numbering. A defect fails the workflow.
3. `pnpm typecheck` on every package, with `strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, and `forceConsistentCasingInFileNames`
4. `pnpm lint` with zero warnings
5. Jest unit and integration tests against PostgreSQL 16 with pgvector and Redis
6. Line coverage of at least 90% on `apps/api/src/domain`
7. Playwright end-to-end tests
8. Production builds of the API, web app, and admin console, with no `.map` files and obfuscated client JavaScript
9. Locale completeness: missing keys and `TODO` values fail `packages/i18n`
10. Secret scan with gitleaks, and `pnpm audit --audit-level high`
11. A scan that rejects tool or model attribution in the source, commit authors, commit messages, and build output
12. Web SEO tests for every public page in every locale: title, description, canonical URL, hreflang for all 11 locales plus `x-default`, and JSON-LD. Private routes are `noindex` and stay out of the sitemap
13. Lighthouse CI on a mobile profile for every Arabic public page and the home page of each other locale. The run fails under 95 for SEO, accessibility, and best practices, and under 90 for performance

`extract-zip` has no patched release. `CVE-2026-56876` and `CVE-2026-19693` stay in `pnpm.auditConfig.ignoreCves`. See `SECURITY.md` for the dependency path and why PDF export does not unpack a browser archive.

```bash
pnpm lint
pnpm typecheck && node scripts/ci/check-tsconfig.mjs
node corpus/audit.mjs
pnpm test
pnpm exec playwright install chromium
node scripts/ci/run-lighthouse.mjs
pnpm test:e2e
```

`USE_TESTCONTAINERS=1` starts `pgvector/pgvector:pg16` for the API integration tests. Leave it at `0` to use `TEST_DATABASE_URL`.

## VPS (Hostinger KVM 2)

The machine is 2 vCPU and 8 GB RAM. Compose caps Postgres at 2 GB (`shared_buffers=512MB`, 40 connections), the API at 1280 MB (Node heap 768 MB), the web app at 1 GB (heap 640 MB), the admin console at 512 MB (heap 384 MB), Redis at 384 MB (256 MB `maxmemory`, AOF, `noeviction`), PgBouncer at 128 MB (100 clients, pool of 10), and Nginx at 128 MB. About 1.6 GB stays with the operating system.

Public origins:

- Site and API: `https://emuhami.com` and `https://emuhami.com/api`
- Admin: `https://admin.emuhami.com`
- `www.emuhami.com` redirects to the apex
- Transactional mail defaults to `no-reply@emuhami.com` (`SMTP_FROM`)

1. Install Docker, Docker Compose, and Certbot.
2. Point `emuhami.com`, `www.emuhami.com`, and `admin.emuhami.com` at the VPS.
3. Issue the certificate while port 80 is free. Use an address you read for the expiry mail:

```bash
sudo mkdir -p /var/lib/emuhami/certbot
sudo certbot certonly --standalone \
  -d emuhami.com -d www.emuhami.com -d admin.emuhami.com
```

4. Copy the repository and create `.env` from `.env.example`. Set `NODE_ENV=production` and replace the local origins:

```bash
SITE_URL=https://emuhami.com
API_PUBLIC_URL=https://emuhami.com
PUBLIC_API_URL=https://emuhami.com/api
WEB_ORIGIN=https://emuhami.com
ADMIN_ORIGIN=https://admin.emuhami.com
CORS_ORIGINS=https://emuhami.com,https://admin.emuhami.com
NEXT_PUBLIC_API_URL=https://emuhami.com/api
COOKIE_DOMAIN=.emuhami.com
SMTP_FROM=no-reply@emuhami.com
```

Also set `KMS_MASTER_KEY`, `JWT_SECRET`, `OTP_PEPPER`, real `LLM_PROVIDER`, `EMBEDDING_PROVIDER`, `PAYMENT_GATEWAY`, `SMS_PROVIDER`, and the SMTP host. `SITE_URL` is baked into canonical URLs, the sitemap, robots metadata, and Open Graph. Leave it at `http://127.0.0.1:4720` for local development and CI. Session cookies use `COOKIE_DOMAIN` in production and stay host-only when it is empty.

5. `docker compose build && docker compose up -d`. Nginx listens on 80 and 443, serves the HTTP-01 challenge from `/var/lib/emuhami/certbot`, and reads `/etc/letsencrypt/live/emuhami.com/`. Renew with `sudo certbot renew` and `docker compose exec nginx nginx -s reload`.
6. Migrations run against Postgres directly, then the API uses PgBouncer (`pgbouncer=true`, transaction pooling).
7. From the admin corpus screen, run an update, or import with `node apps/api/dist/cli.js import-corpus` after `node corpus/fetch-official.mjs`. Rows marked official still require `confirmOfficial=true` on the manual import route.

## Credentials the operator must supply

| Variable | Purpose |
| --- | --- |
| `MODEL_API_KEY`, `MODEL_BASE_URL`, `MODEL_NAME` | Remote draft model. Set `LLM_PROVIDER=remote`. Production refuses `mock`. |
| `EMBEDDING_API_KEY`, `EMBEDDING_BASE_URL`, `EMBEDDING_MODEL` | Remote embeddings, 384 dimensions. Set `EMBEDDING_PROVIDER=remote`. Production refuses `mock`. |
| `ALRAJHI_TRANPORTAL_ID`, `ALRAJHI_TRANPORTAL_PASSWORD`, `ALRAJHI_RESOURCE_KEY` | Al Rajhi hosted payment. Also set `ALRAJHI_HOSTED_URL`, `ALRAJHI_RESPONSE_URL`, `ALRAJHI_ERROR_URL`, and `PAYMENT_GATEWAY=alrajhi`. The resource key must be 16 or 32 bytes. This build encrypts `trandata` with AES-CBC and IV `PGKEYENCDECIVSPC`. Confirm that IV and key length against the bank kit before going live. |
| `KMS_MASTER_KEY` | Base64 of 32 bytes. Wraps each account's data key. Losing it makes stored content unreadable. |
| `SMS_PROVIDER` | Not used for sign-up. Production refuses `mock`. Set `disabled` or a real provider. |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Error reporting. Request bodies are stripped. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URL` | Google Drive. Set `INTEGRATIONS_MODE=live` for a real upload. |
| `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_REDIRECT_URL` | OneDrive and calendar OAuth. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Account confirmation, password reset, and admin activation. Required in production. `SMTP_FROM` defaults to `no-reply@emuhami.com`. |
| `SELLER_VAT_NUMBER`, `SELLER_NAME`, `SELLER_ADDRESS` | Invoice seller block. The QR is a phase-1 ZATCA TLV payload. A cryptographic stamp is not included. |

## Plans

Free: 5 chats, 5 memos, general and labor courts, PDF. Basic: 99 SAR, 30 memos. Professional: 249 SAR, 100 memos, every court, case dates, Word. Office: 599 SAR, 5 seats, letterhead. A single extra memo is 29 SAR when the wallet can cover it (`PAY_PER_MEMO_HALALAS`). Prices are inclusive of 15% VAT.

## Privacy

Chats, documents, memos, and hearing titles are encrypted with a per-account key. The admin API returns counts only. Account export and deletion are under `/api/me/export` and `DELETE /api/me`.
