# Screen audit

Audit of every web, admin, and mobile screen on `main` at `06ba3f6`. A screen is **wired** when the data it shows comes from the API. Published marketing copy is marked **content**. A screen is **static** when account data is hardcoded or a control does not call the API that already exists.

Open pull requests own some of the gaps. This audit does not copy that work.

| PR | Owns |
| --- | --- |
| #1 | One-time plans, assessment, hearing prep, Najiz lawyer check |
| #2 | Admin notice translation into all locales |
| #3 | Social card and the approved tagline |
| #6 | Account navigation and a visual pass over the same screens |
| #7 | Tracked cases and filing alerts |
| #8 | Draft-check unit tests only |
| #9 | Judgment corpus, load, and security gates |
| #10 | Sandbox checkout and mock SMS kept out of production |

## Web, public

| Screen | Route | Data | Missing |
| --- | --- | --- | --- |
| Home | `/{locale}` | Content. Prices come from `PUBLISHED_PLANS` in code (free 0, basic 99, pro 249), not from `GET /plans`. | Owner prices (free assessment + 1 memo, 9, 39 / 15, 119 / 50). Brand mark is the scale drawing, not «سنّ القلم». |
| Article | `/{locale}/{slug}` | Content from the locale catalog. | Same visual system. |
| Security | `/{locale}/security` | Content. | Same visual system. |
| Public search | `/{locale}/q` | Filters the public page catalog. It does not call `/search`. | Nothing for a public page. Account search is a different screen. |
| Not found, error | `/{locale}/not-found`, error boundaries | Translated static copy. | — |

## Web, session

| Screen | Route | Data | Missing |
| --- | --- | --- | --- |
| Login | `/{locale}/login` | `POST /auth/login`. Error text goes through `userFacingError`. | — |
| Signup | `/{locale}/signup` | `POST /auth/signup`. Consent is a checkbox with the privacy and terms links. | The consent line is 14px-tight beside the checkbox. |
| Email code | `/{locale}/otp` | `POST /auth/verify` and `POST /auth/resend`. | — |
| Forgot password | `/{locale}/forgot` | `POST /auth/forgot`. | — |
| Reset password | `/{locale}/reset` | `POST /auth/reset`. | — |
| Payment result | `/{locale}/pay/result` | Reads `status` from the return URL. No second charge. | — |
| Sandbox checkout | `/{locale}/pay/sandbox/[id]` | `POST /payments/confirm`. | Leave this to PR #10. Do not restyle it here. |

## Web, account

| Screen | Route | Data | Missing |
| --- | --- | --- | --- |
| Workspace | `/{locale}/app` | `GET/POST /chats`, messages, `PATCH` court and type, upload, draft. Free-plan counter uses the session. Quota modal opens only after `QUOTA_CHATS` or `QUOTA_MEMOS`. | Upload has a text label, not a progress bar. No file preview. Completeness is a percent, not the missing items. No Riyadh greeting. Chat load failure is swallowed. Errors sit inline. Drag-and-drop has no drop state. Voice sends the label «تسجيل صوتي», not the audio. |
| Memos | `/{locale}/app/memos` | `GET /memos` with paging. Skeleton, error and retry, empty, infinite scroll. | `?q=` from the header is ignored. No court, type, or date filter. No sort control. Every row is labeled draft even when `status` differs. No recently opened list. |
| Memo | `/{locale}/app/memos/[id]` | `GET/PATCH /memos/:id`, PDF and Word download, citation filters, diff, PDF preview. | Autosave writes `localStorage` only. The line says the copy is on this device. No clock for the last server save. No word count. No breadcrumbs. Word export stays enabled and fails after the request when the plan has no Word. `isSample` on a citation is a corpus flag, not filler text. |
| Cases | `/{locale}/app/cases` | `GET /cases`. Skeleton and empty state. | A failed load is shown as an empty list. No retry. |
| Case | `/{locale}/app/cases/[id]` | `GET /cases/:id`, health, `POST` hearings. | A failed load clears the page. Hearings for non-pro plans show the plan note. Tracked-case alerts belong to PR #7. |
| Vault | `/{locale}/app/vault` | `GET /documents`. Skeleton and empty state. | A failed load looks empty. Rows do not call `GET /documents/:id/download`. |
| Saved | `/{locale}/app/saved` | `GET /saved`, `DELETE /saved/:id`. Empty state. | No loading state. A failed load looks empty. |
| Integrations | `/{locale}/app/integrations` | `GET /integrations`, start, Drive export. | No loading or error state. Drive export sends the first memo only. The note after export says the file is recorded and the real upload waits on Drive credentials. |
| Plans | `/{locale}/app/plans` | `GET /plans`, `POST /billing/checkout`. Current plan button is disabled. | Monthly and yearly toggle. The large price has no «ر.س» beside it (the caption carries the currency). Catalog is still 99 and 249 until PR #1. |
| Wallet | `/{locale}/app/wallet` | `GET /wallet`, top-up checkout. Loading, error, retry, empty lists. | Transaction amounts omit «ر.س». |
| Referral | `/{locale}/app/referral` | `GET/POST /referrals`. | No loading or error state. A failed load shows a blank code. |
| Settings | `/{locale}/app/settings` | `PATCH /me`, theme, all 11 locales, hearing toggle, export, delete. | Saved confirmation is inline. No toast. |
| Header | account layout | Bell calls `GET /me/notifications` when opened. Search submits `/app/memos?q=`. | The query is not applied. No unread badge. `POST /me/notifications/:id/read` is unused. The socket gateway only streams chat tokens (`send` / `token` / `done`). It does not emit notifications. |
| Command palette | account layout | Ctrl+K opens fixed links. | No memo search and no recent searches. |

## Admin

Admin copy is Arabic only. It is an operator console, not one of the 11 client locales. PR #2 adds translation of admin notices, not a translated shell. Every dashboard page reads a live admin endpoint. None of them render sample rows.

| Screen | Route | Data | Missing |
| --- | --- | --- | --- |
| Login | `/` | `POST /admin/login` | — |
| Activate | `/activate` | `POST /admin/activate` | — |
| Overview | `/dashboard` | `GET /admin/stats` | Loading and error share one line. |
| Users | `/dashboard/users` | `GET /admin/users` | No separate empty state. |
| Memos | `/dashboard/memos` | Counts from `GET /admin/stats` | No memo text, by design. |
| Plans | `/dashboard/plans` | `GET/PATCH /admin/plans` | Prices follow the database, which is still the old catalog. |
| Payments | `/dashboard/payments` | `GET /admin/payments` | — |
| Audit | `/dashboard/audit` | `GET /admin/audit` | — |
| Costs | `/dashboard/costs` | `GET /admin/costs` | — |
| Corpus | `/dashboard/corpus` | `GET /admin/corpus`, refresh | The “sample” count is the number of unattested articles in the corpus, not placeholder UI. |
| Operations | `/dashboard/operations` | `GET /admin/operations`, pending updates, scan | — |
| Settings | `/dashboard/settings` | `GET /admin/settings` | — |

## Mobile

The app calls the API with the stored token. Visible strings are Arabic only (`translate("ar", …)` or hardcoded Arabic). There is no locale switch, so the other ten locales never appear.

| Screen | Route | Data | Missing |
| --- | --- | --- | --- |
| Splash | `/` | Restores the session, then opens home. | Hardcoded Arabic. Brand icon is the existing asset. |
| Onboarding | `/onboarding` | Three local steps, then signup. No account data. | Hardcoded Arabic, not the locale files. Completion is not stored. |
| Login | `/login` | `POST /auth/login` | Hardcoded Arabic placeholders. No error text from the API code. |
| Signup | `/signup` | `POST /auth/signup` | Same. No consent control. |
| Email code | `/otp` | `POST /auth/verify` | Arabic only. |
| Home | `/home` | `GET /me`, `GET /chats`, `POST /chats` | No greeting, no loading or error state. No search. |
| Chat | `/chat/[id]` | Messages, document picker, camera, library, draft. | Upload has no progress and no preview. PDF export is absent. Errors are generic. |
| Memos | `/memos` | `GET /memos` | Title is hardcoded «مذكراتي». No search, filter, loading, or error state. |
| Memo | `/memo/[id]` | `GET /memos/:id` | No PDF export, no loading or error state. |
| Plans | `/plans` | Renders `PUBLISHED_PLANS` and service prices from code. | Not `GET /plans`. No link out to web checkout. Amounts are 99 and 249. Showing a plan without a store purchase is correct; the link out is missing. |
| Wallet | `/wallet` | `GET /wallet`. Loading, error, retry. | No link out for top-up. |
| Account | `/account` | Logout and `DELETE /me` work. | Wallet, memos, saved, integrations, plans, and settings are plain text, not links. Language names do not change the locale. No dark mode. No notification switch. |

PR #6 adds mobile settings, saved, and integrations. PR #7 adds tracked cases. Those screens are not on `main` and are not duplicated here.

## Review list, as of this commit

| Item | State on main |
| --- | --- |
| 1. Header search filters memos | Not applied. `GET /search` exists. |
| 2. Upload progress | Text only, web and mobile. |
| 3. File preview before upload | Missing. |
| 4. Completeness names the gaps | Percent only. |
| 5. Live notification badge | Bell loads on open. Socket has no notification event. |
| 6. Memo filters: court, type, date | Missing. List rows already include those fields. |
| 7. Recently opened | Missing. |
| 8. Mobile upload and PDF | Upload exists. PDF export does not. |
| 9. Breadcrumbs | Back link on the memo only. |
| 10. Human errors | `userFacingError` on some web forms. Other screens swallow the failure. |
| 11. Quota pre-warning | Free-plan counter and a modal after the request fails. |
| 12. Editor autosave | Device copy only. |
| 13. Last-saved indicator | Inline “saved”, no time, and it is not a server save. |
| Skeletons | Memos, cases, vault. |
| Empty states | Memos, cases, vault, saved, wallet, workspace. |
| Prefetch | Not used. |
| Infinite scroll | Memo list. |
| Ctrl+K | Fixed links. |
| Diff, PDF preview | Memo editor, web only. |
| Sort, word count, drop feedback, recent searches | Missing. |
| Favorites | Saved list is wired. The memo screen does not add to it. |
| «ر.س» on every amount | Wallet balance and invoices yes. Plans figure, wallet lines, and home services no. |
| Disabled current plan | Yes. |
| Disabled Word export with a tooltip | No. `features.word` is on the session. |
| Header dark-mode control | Not present. Settings has the control. Lowest priority. |
| Languages hidden | No on web. Mobile cannot switch. |
| In-app digital purchase | Web checkout redirects. Mobile plans do not charge and do not link out. |

## Visual system

Tokens are navy `#17345F`, teal `#176373`, canvas `#F8FAFC`. The approved palette is primary `#0B1E3B`, depth `#163A63`, facet `#22527F`, secondary `#0F6B72`, accent `#7FD4CB` (not for text on light), slate `#5B6B82`, fog `#E3E8EF`, paper `#F6F8FB`, ink `#0A1424`. Type is Cairo. The header mark is an inline scale, not logo v3.
