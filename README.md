# المحامي الإلكتروني المتقدم

Saudi legal-drafting workspace for lawsuit, defense, reply, and appeal memos. The web app, admin console, and Expo app (iOS and Android from one codebase) talk to one NestJS API.

The corpus shipped with this repository is a **sample catalog**. Every sample row is marked `isSample`. It is not an official statute book. Replace it through the admin import before relying on a draft in a real matter.

## Layout

- `apps/api` — NestJS, Prisma, PostgreSQL with pgvector, Redis/BullMQ, Socket.IO
- `apps/web` — Next.js workspace (port 4720)
- `apps/admin` — aggregate dashboard and corpus import (port 4730)
- `apps/mobile` — Expo
- `packages/types`, `packages/i18n`, `packages/tokens`, `packages/api-client`

Arabic and English strings are complete. Urdu, Hindi, Punjabi (Shahmukhi), Sinhala, Bengali, Nepali, Filipino, Turkish, and Amharic keep the same keys with the value `TODO`.

## Local run

Requirements: Node.js 22, pnpm 10, PostgreSQL 16 with the `vector` extension, Redis. Optional: Tesseract (`ara`+`eng`) and Poppler for scanned documents.

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

`OTP_DEBUG=true` returns the one-time code in the signup response so a local machine can sign in without an SMS provider. Turn it off outside development.

The local admin account is created from `ADMIN_EMAIL` and `ADMIN_PASSWORD` on the first boot. The checked-in example uses placeholders. A development database in this workspace may use `admin@example.sa` / `AdminPass123!`. Change both before any shared deployment.

Checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
pnpm --filter @elawyer/mobile build
```

`USE_TESTCONTAINERS=1` starts `pgvector/pgvector:pg16` for the API integration tests. Leave it at `0` to use `TEST_DATABASE_URL`.

## VPS (Hostinger)

1. Install Docker and Docker Compose.
2. Copy the repository and create `.env` from `.env.example`. Set `KMS_MASTER_KEY`, `JWT_SECRET`, `OTP_PEPPER`, `ADMIN_PASSWORD`, `OTP_DEBUG=false`, and `PUBLIC_API_URL` to the public origin plus `/api` (the web bundle reads it at image build time).
3. `docker compose build && docker compose up -d`
4. The site is on port 80. The admin console is on port 8081. Put TLS in front of Nginx.
5. Migrations run against Postgres directly, then the API uses PgBouncer (`pgbouncer=true`, transaction pooling).
6. Import an official corpus as JSON or CSV from the admin screen. Rows with `isSample: false` are rejected unless the request includes `?confirmOfficial=true`.

## Credentials the operator must supply

| Variable | Purpose |
| --- | --- |
| `MODEL_API_KEY`, `MODEL_BASE_URL`, `MODEL_NAME` | Remote draft model. Set `LLM_PROVIDER=remote`. The mock provider is the default. |
| `EMBEDDING_API_KEY`, `EMBEDDING_BASE_URL`, `EMBEDDING_MODEL` | Remote embeddings, 384 dimensions. Set `EMBEDDING_PROVIDER=remote`. |
| `ALRAJHI_TRANPORTAL_ID`, `ALRAJHI_TRANPORTAL_PASSWORD`, `ALRAJHI_RESOURCE_KEY` | Al Rajhi hosted payment. Also set `ALRAJHI_HOSTED_URL`, `ALRAJHI_RESPONSE_URL`, `ALRAJHI_ERROR_URL`, and `PAYMENT_GATEWAY=alrajhi`. The resource key must be 16 or 32 bytes. This build encrypts `trandata` with AES-CBC and IV `PGKEYENCDECIVSPC`. Confirm that IV and key length against the bank kit before going live. |
| `KMS_MASTER_KEY` | Base64 of 32 bytes. Wraps each account's data key. Losing it makes stored content unreadable. |
| `SMS_API_KEY`, `SMS_BASE_URL`, `SMS_SENDER` | OTP delivery. Set `SMS_PROVIDER` to anything other than `mock`. |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Error reporting. Request bodies are stripped. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URL` | Google Drive. Set `INTEGRATIONS_MODE=live` for a real upload. |
| `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_REDIRECT_URL` | OneDrive and calendar OAuth. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Mail export. |
| `SELLER_VAT_NUMBER`, `SELLER_NAME`, `SELLER_ADDRESS` | Invoice seller block. The QR is a phase-1 ZATCA TLV payload. A cryptographic stamp is not included. |

## Plans

Free: 5 chats, 5 memos, general and labor courts, PDF. Basic: 99 SAR, 30 memos. Professional: 249 SAR, 100 memos, every court, case dates, Word. Office: 599 SAR, 5 seats, letterhead. A single extra memo is 29 SAR when the wallet can cover it (`PAY_PER_MEMO_HALALAS`). Prices are inclusive of 15% VAT.

## Privacy

Chats, documents, memos, and hearing titles are encrypted with a per-account key. The admin API returns counts only. Account export and deletion are under `/api/me/export` and `DELETE /api/me`.
