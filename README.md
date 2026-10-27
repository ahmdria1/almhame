# المحامي الإلكتروني المتقدم

Saudi legal-drafting workspace for lawsuit, defense, reply, and appeal memos. The web app, admin console, and Expo app (iOS and Android from one codebase) talk to one NestJS API.

Statute text is stored under `corpus/official/boe`. The fetcher tries `laws.boe.gov.sa` first. When that host does not answer, it reads the current consolidated text from the Ministry of Justice legislation gateway and keeps the Bureau URL the gateway returns. Instruments the gateway does not carry are taken from a public snapshot of the same Bureau pages (`corpus/snapshot_fallback.py`). Re-run `node corpus/fetch-official.mjs`, then `node apps/api/dist/cli.js import-corpus`.

`نظام العمل` is not imported. The live Bureau site did not answer, the justice gateway does not list it, and the available page snapshot mixes amendment notes into the articles, so the wording is not reliable. Legal maxims (`القواعد الفقهية`) are not imported: no machine-readable edition of a published qawaid work was available. Quran text is the Tanzil Uthmani file (6,236 verses). Hadith text is the Arabic editions of Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasai, Ibn Majah, and Malik from the open hadith-api dataset, with book, number, and grade.

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
2. `pnpm typecheck` on every package, with `strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, and `forceConsistentCasingInFileNames`
3. `pnpm lint` with zero warnings
4. Jest unit and integration tests against PostgreSQL 16 with pgvector and Redis
5. Line coverage of at least 90% on `apps/api/src/domain`
6. Playwright end-to-end tests
7. Production builds of the API, web app, and admin console, with no `.map` files and obfuscated client JavaScript
8. Locale completeness: missing keys and `TODO` values fail `packages/i18n`
9. Secret scan with gitleaks, and `pnpm audit --audit-level high`
10. A scan that rejects tool or model attribution in the source, commit authors, commit messages, and build output

`extract-zip` has no patched release. Those two CVEs stay in `pnpm.auditConfig.ignoreCves` because PDF export uses the system browser and does not extract browser archives.

```bash
pnpm lint
pnpm typecheck && node scripts/ci/check-tsconfig.mjs
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
```

`USE_TESTCONTAINERS=1` starts `pgvector/pgvector:pg16` for the API integration tests. Leave it at `0` to use `TEST_DATABASE_URL`.

## VPS (Hostinger)

1. Install Docker and Docker Compose.
2. Copy the repository and create `.env` from `.env.example`. Set `KMS_MASTER_KEY`, `JWT_SECRET`, `OTP_PEPPER`, `NODE_ENV=production`, real `LLM_PROVIDER`, `EMBEDDING_PROVIDER`, `PAYMENT_GATEWAY`, `SMS_PROVIDER`, and SMTP. Set `NEXT_PUBLIC_API_URL` to the public origin plus `/api` (the web bundle reads it at image build time).
3. `docker compose build && docker compose up -d`
4. The site is on port 80. The admin console is on port 8081. Put TLS in front of Nginx.
5. Migrations run against Postgres directly, then the API uses PgBouncer (`pgbouncer=true`, transaction pooling).
6. From the admin corpus screen, run an update, or import with `node apps/api/dist/cli.js import-corpus` after `node corpus/fetch-official.mjs`. Rows marked official still require `confirmOfficial=true` on the manual import route.

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
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Account confirmation, password reset, and admin activation. Required in production. |
| `SELLER_VAT_NUMBER`, `SELLER_NAME`, `SELLER_ADDRESS` | Invoice seller block. The QR is a phase-1 ZATCA TLV payload. A cryptographic stamp is not included. |

## Plans

Free: 5 chats, 5 memos, general and labor courts, PDF. Basic: 99 SAR, 30 memos. Professional: 249 SAR, 100 memos, every court, case dates, Word. Office: 599 SAR, 5 seats, letterhead. A single extra memo is 29 SAR when the wallet can cover it (`PAY_PER_MEMO_HALALAS`). Prices are inclusive of 15% VAT.

## Privacy

Chats, documents, memos, and hearing titles are encrypted with a per-account key. The admin API returns counts only. Account export and deletion are under `/api/me/export` and `DELETE /api/me`.
