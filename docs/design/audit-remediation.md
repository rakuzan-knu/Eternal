# Audit remediation — 21 October 2026

This changeset addresses concrete trust, recovery, navigation and accessibility defects from the Eternal browser audit. It preserves the existing visual identity and service boundaries. It is not a claim that all 78 recommendations or all production scenarios are complete.

## Implemented scope

- Native downloads: remove fabricated installers and fake success, show release availability honestly in all five existing locales, offer the real web app. Do not expose unsupported native availability or invented ratings through Download schema.
- Reels: remove automatic sample feed/counters and fabricated success for comments, save, hide, report and share metrics. Preserve failed comment/report drafts, permit retry, update caches after confirmation, and distinguish an empty page from misleading totals.
- Chat: named new-group dialog with input Escape, accessible close/search/clear actions and recoverable creation errors. Semantic global-search button; desktop shortcut hidden on narrow screens. Folder creation no longer overlays the scroll rail; overflow has an explicit button and visible scrollbar.
- Settings: narrow screens show navigation separately from the active form and restore focus to a visible control. Preserve desktop layout and existing save behavior.
- Search/auth: named controls and useful empty-search recovery, named family-name field, recovery validation/error association, individual auth page titles.
- Feed/presence: compact empty-story creation; correct English singular dates and year boundaries; provider-neutral music status instead of incorrectly attributing SoundCloud playback to Spotify.
- Public content: standalone Creators shell and corrected crisis support instructions with geography and an official source link.

The initial package was frontend-only. The continuation below adds bounded backend persistence and auth-related client fixes. No billing, production deployment or live database mutations are included. Tests and builds provide bounded evidence, not proof of production delivery or complete security.

## Canonical behavior owners

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Form | `shared/ui/Input`, existing feature forms and schema | existing schemas + `ui-writing.md` | existing auth and group forms | targeted component tests |
| Select/Listbox | `shared/ui/Select` | existing component | maintained authored select | existing Select tests; unchanged here |
| Date | `shared/lib/formatRelativeTime` | timestamp values | English relative labels | threshold/singular tests |
| Scrollbar | `apps/web/src/index.css` | existing runtime styles | local rail geometry | narrow browser regression |
| Toast | existing message toast store | server acknowledgement | success after confirmation; inline recoverable failure | Reels regression tests |
| CRUD | existing API hooks and query cache | owning service response | failed draft + retry | Reels comments/report tests |

## Deliberately unfinished work

- Real signed native builds and store distribution require genuine release artifacts, not frontend placeholders.
- Saved Reels persistence/API is now implemented with its own additive table, separate from SavedPost. It still requires migration and coordinated backend/frontend release before production use.
- Community/server workflows, invitation roles and moderation need product/domain contracts and end-to-end implementation; adding an empty navigation destination would not address the audit.
- Client refresh races and transient-error logout are addressed below; actual production session expiry, nearby recommendation eligibility and data quality still need live-data investigation. No account records are deleted or filtered by guessed test-name heuristics.
- Full locale migration, comprehensive privacy enforcement and subscription rules remain. Registration defaults and gender transport are corrected below; no new legal age policy is inferred.
- Profile/feed hierarchy, broad marketing claim verification, all themes, native touch/keyboard, calls across peers and full production accessibility remain outside the passing checks for this changeset.

## Crisis resource evidence

Verified 21 October 2026 against [Crisis Text Line](https://www.crisistextline.org/) (US: HOME to 741741; separate international options) and [Kids Help Phone](https://kidshelpphone.ca/) (Canada: CONNECT to 686868). The UI links to the official resource rather than implying the US short code works globally. Other directory entries were not comprehensively revalidated by this correction.

## Verification record

The following initial-package record is retained for traceability; the continuation has additional checks below.

- Passed targeted Vitest suites covering NewGroupModal, ChatFolderRail, ChatListPanel, EditProfileModal, SearchPage, FindAccount, RegisterForm, auth pages, StoriesBar, relative time, music presence, Reels API/UI integrity, Download, shared SEO and standalone public routes.
- Passed `pnpm --filter frontend build` (TypeScript, Vite and 32 prerendered public pages), changed-file ESLint/Prettier, `git diff --check` and `pnpm design:check` after regenerating the design inventory.
- All six Playwright scenarios passed at 1280×900 and 390×844: group-dialog keyboard/focus recovery, honest Download availability without horizontal page overflow, and settings navigation/focus recovery. The first combined run passed four and failed two settings scenarios during concurrent build/dev-server activity with a dynamic-import fetch error. Both settings scenarios passed on an isolated rerun after the build completed. This was not a single uninterrupted six-test green run.
- `playwright.audit.config.ts` isolates these mocked-API browser regressions from an existing developer server on a separate port. They do not establish real multi-user/server behavior. A local Chrome mobile preview was also inspected.
- The scoped premium static audit still reports 16 findings in existing controls/forms (four native-control ownership findings and 12 rule violations). They remain follow-up work; this changeset does not claim a clean repository-wide audit. The complete web test suite, all themes, real calls and production journeys were not rerun.

## Premium continuation — preserve every existing feature

User constraint: do not remove or hide interface elements, sections, effects or capabilities without explicit consent. Preserve purple identity, customization, store, music and all navigation destinations. Improvements extend existing primitives and workflows.

- Navigation: add an explicit pin and collapse action, persist only the pin preference, retain automatic hover expansion and every destination. Session reset preserves this device preference without persisting user content or modal state.
- Registration: keep every field, require deliberate date/gender selection, validate real calendar dates/future dates, clear invalid day after month changes, connect inline errors to the shared Select. Gender now crosses the optional validated register contract and existing User.gender column; older clients remain compatible. No extra public profile response fields or legal minimum age rule are introduced.
- Saved Reels: authenticated account-bound API, idempotent POST save/DELETE unsave, additive SavedReel table, unique ownership, cascade cleanup, stable saved-row cursor, private-author/accepted-follow and bidirectional-block filtering. The same visibility predicate protects Reels read/action surfaces. Unsave remains possible after visibility loss while withholding inaccessible aggregate counts. Feed exclusions apply before pagination. Production no longer substitutes demo feed on empty/error responses; demo assets remain available in source fixtures.
- Saved UI: add Saved reels alongside all existing post collections, explicit loading/error/retry/empty/pagination, semantic video links, server-confirmed cache updates. Existing post collections remain local to the browser and are labelled accordingly. Replace browser confirm with named in-app confirmation; saved posts remain after collection deletion. Content tabs scroll to their panel without removing the profile header or widgets.
- Sessions: bind pending refresh, retries and successful resource responses to their original identity, prevent stale completion after logout/account switch, deduplicate same-session refresh, retain auth on network/rate-limit/server failures. Cross-tab refresh and logout reject stale or mismatched ownership. Legacy unbound refresh is ignored; legacy logout applies only after shared credentials are already absent. Shared localStorage still means tabs intentionally share account switching; this does not create independent per-tab sessions.
- Profile safety: direct profile report/block actions use existing server boundaries and block state, confirmation, pending/error recovery, visible names and keyboard focus. Starting a failed conversation retains the profile and offers retry. Reports preserve selected reason, map existing categories and announce success only after confirmation.
- Store: preserve all purchase/gift/preview/wishlist actions, add visible sale availability explanation; card actions work on keyboard and touch as well as hover.

### Rollout and limits

Do not deploy the frontend Saved controls against the old backend. Verify a backup, apply the additive migration on core first, then release the reels service and corresponding frontend, following SERVICE_OWNERSHIP.md. Registration gender persistence needs the matching core release. Keep the additive table on rollback; older code ignores it. No migration was executed against a database during this work. Prisma validation/generation and mocked repository tests do not prove migration execution, database concurrency or a production rollback.

Independent backend review identified an inaccessible-save-count leak in DELETE; it was fixed and regression-tested. The separate auth review subsequently completed without actionable findings in the scoped session changes; its reviewer ran 45 frontend and 51 backend tests. These are mocked checks, not live multi-account verification.

### Continuation verification

- Final frontend production build passed TypeScript/Vite and prerendered 32 pages after all runtime refinements, including the deferred-header alignment and successful-response session guard. The guard also passed frontend typecheck and 42 auth/broadcast/socket regression tests in three suites.
- Passed 63 tests in eight frontend suites for refresh/broadcast/auth store, Saved/Reels, profile and report recovery; 43 additional tests in five suites for registration, navigation, profile safety and Shop. Prior worker checks passed registration/schema/Select (55), HTTP/broadcast/socket and routing suites.
- After the profile scrolling and block-cache changes, two affected suites passed another 29 tests. Changed backend ESLint reported no errors and one existing unsafe-assignment warning on a test matcher; final touched profile/UI lint passed without errors.
- Backend Reels controller/service/repository: 24 tests passed after the count-leak correction. Auth/user/contract checks: 51 tests passed for gender compatibility. Local Prisma validation/generation and backend typecheck passed.
- All ten browser scenarios passed across desktop/mobile: registration/date dropdown, Saved alongside post collections, group keyboard/focus, Download availability/overflow and settings navigation/focus. The combined final run passed eight and failed two: desktop registration stayed in cold dev loading past the assertion timeout; mobile Saved exposed header reflow moving the selected panel. The panel now tracks deferred header sizing until user interaction. Both failed scenarios passed on an isolated rerun (26.1s and 17.5s). This is not a single uninterrupted ten-test green run. Profile tests passed again after the fix; latest frontend typecheck and touched-file lint passed.
- Changed-source frontend ESLint reported zero errors and eight existing ShopPage warnings (unused imports and one effect dependency). These warnings are not presented as a clean lint result. Final design generation/check and diff whitespace checks passed after the source refinements.

Remaining original audit recommendations are not automatically closed by these changes: broad layout refinement, full localization, content/marketing evidence, live two-account delivery/calls/privacy, all themes/assistive technology and genuine native distribution still require implementation or verification. Community implementation is recorded below separately from production rollout.

## Servers, channels and invitations continuation

- Added public community search and member counts, paginated own communities, server creation/editing, member-only channels mapped to the existing GROUP conversation model and channel creation. Existing groups are preserved. Community channels inherit existing group-message transport; this is not a claim of group end-to-end encryption.
- Added owner/admin/member authorization, owner transfer, voluntary leave, kick, persistent bans and unban. The legacy group administration endpoints reject mutations of community channels so they cannot bypass central membership and role rules. Channel UI routes these actions to community management.
- Added SHA-256 hashed, random bearer invitation tokens, expiry, bounded uses, revocation, public preview and explicit authenticated acceptance. Active-member retries do not increment use count or reset join history. Community and participant changes use a transaction with deterministic row locks and transactional outbox events.
- Added invitation sharing by copied URL, Telegram/WhatsApp/Facebook links, native share where available and server-confirmed direct messages using the existing chat encryption policy. Links are not stored in offline query snapshots and invite URLs are excluded from telemetry. Invite pages suppress referrers. External sharing is only initiated by the user's button action.
- Account deletion is rejected for community owners until ownership is transferred. The additive migration preserves existing data and does not convert existing groups. Apply a verified backup and the migration on core before releasing the dependent messenger/core/web changes; retain additive tables on rollback. No database migration or deployment was performed.
- Independent review identified three concrete defects: admin voluntary leave, stale removal events after rejoin, and edited-message/reaction leakage through lingering channel rooms. All three were fixed and re-reviewed. Content fanout resolves active participants; stale retractions recheck membership and preserve outbox retry on database errors.
- Added locale-aware dates and language names using existing language selection, clearer mutual-friend empty states and recoverable user-search errors. This does not establish complete translation of all interface copy.
- Reels sharing retains every visible action. Direct-message delivery now confirms each recipient, preserves drafts and only retries failed recipients with stable delivery IDs. Empty connections no longer invent recipients. Repost remains visible with an honest unavailable explanation; a Reels repost backend/feed model is not implemented. Clipboard, popup and download failures no longer announce false success. Share dialogs use the shared accessible Modal.

### Checks and remaining verification

- Community repository/service: 38 tests passed. Gateway/user deletion/redacted logging: 42 tests passed. In a combined 87-test backend run, 86 passed and one new outbox assertion incorrectly expected a third argument; after correcting the assertion to the existing repository signature, all seven outbox tests passed. No runtime behavior was changed to satisfy that assertion.
- Reels sender/encryption policy, pooled card, persistence and telemetry: 23 tests passed in five suites. Search/group/realtime: 24 tests passed in five suites. Reels share dialog: 10 tests passed. Shared Modal/persistence/telemetry passed 16 tests before the additional persistence regression, which passed in the later sender batch.
- First community Playwright run: all six scenarios passed at 390px and 1280px, covering discovery/private access, creation and sharing of an invitation, explicit acceptance failure and retry availability. APIs are mocked. Final combined browser and production-build results are recorded below when complete.
- The combined desktop/mobile browser run subsequently passed all 16 scenarios in one run, including successful invitation retry, registration, Saved, group keyboard recovery, Download and settings. Production TypeScript/Vite build and all 32 SEO prerenders passed. Backend typecheck, contract mirror parity and design checks passed.
- Manual Chrome inspection of the production preview exposed a missing response boundary: same-origin SPA fallback HTML could be treated as a successful directory response and crash the screen. All community reads and writes now validate their response contract. Query selection also validates previously persisted cache data. Seven regressions passed for malformed/HTML responses, legitimate empty data, stale offline snapshots, write acknowledgements and incomplete invite previews. The real database migration is still not represented as tested by these checks.
- Prisma schema validation passed. Final touched backend lint has zero errors and 12 existing warnings in gateway/user test code; touched frontend lint has zero errors and three existing warnings in ConversationDetailsPanel. Initial production type checking caught outdated hook mocks and invalid testing-library options in new tests; those test types were corrected without casts or configuration bypasses.
- Real database concurrency, migration execution/rollback and multi-user WebSocket delivery remain unverified. Docker CLI is installed but its Linux engine is not running; no live database was substituted for the isolated test environment. Production publication remains outside this change.

### Final artifact verification

- Final production build after response/cache validation passed TypeScript, Vite and all 32 SEO prerenders. The matching backend typecheck passed; shared/backend community contract files have identical hashes.
- All **18 Playwright scenarios passed in a single production-preview run** (1.2 minutes), using the built assets at 390px and 1280px with mocked APIs. This includes the two new malformed-response recovery scenarios and the existing ten audit regressions. The prior 16-test development-server run also passed. No build or source edit ran concurrently with this final browser run.
- Chrome manual recheck confirmed that the same-origin HTML API fallback now renders the community error/retry surface instead of the global application error, including after the earlier bad response had been cached.
- Final response-boundary suite: seven tests passed. Final hook-consumer/recipient retry compatibility run: 13 tests passed. Design generation/check, changed-boundary ESLint and diff whitespace checks passed with the existing lint warnings described above; no lint/typecheck rule was disabled.
- Production-preview screenshots with explicit fixture data: `C:/Users/unbeatable/.codex/visualizations/2026/10/21/01a15dda-4c8f-7312-bd97-55ab0f50e492/premium-community-invite-desktop.png` and `premium-community-invite-mobile.png` in the same folder. They show the UI and are not proof of a deployed backend or real message delivery.

## Community workspace redesign — 22 October 2026

The user rejected the previous visual/UX direction and authorized read-only inspection of their open Discord application. Actual desktop navigation, channel browser, server menu, settings and roles were observed. Private identities/content were not copied. The detailed observations, decisions and capability gaps are in [Discord reference and implementation](discord-reference-2026-10-22.md); interaction ownership is in [UX-CONTRACT.md](../../UX-CONTRACT.md).

- Replaced the long community detail layout with server navigation, channel navigation, overview, members/about views and the existing real ChatThread embedded inside a channel route. Existing message, media, call, search, theme, moderation and invitation capabilities retain their original owners.
- Added stable channel URLs, local filtering, back/focus restoration, active-conversation integration and mobile list/detail scrolling. The channel header includes the community name; no duplicated messenger workspace or second composer was introduced.
- Redesigned discovery with compact identity cards and independent own-server pagination. Search supports committed URL restoration, IME composition and explicit clear/focus.
- Added invitation-link entry to discovery. It extracts only an expected internal invite path/token and opens preview without changing membership or following the pasted host.
- Fixed stale-role administrator controls and stale cached conversation rendering after an access error. The focused independent read-only review found no further concrete material regression in the reviewed navigation/access boundaries after those corrections; this is not a repository-wide review.
- The 21st catalog request failed. Existing authored UI, theme variables and primitives were used; no generated 21st component or external asset is claimed.

### Scope and verification limits

The changes above implement community navigation and chat integration. The capability matrix explicitly lists unfinished domain features: categories/order, channel lifecycle management, private-channel permissions, granular roles, persistent voice channels, server notification inheritance, audit logs and community-specific moderation workflows. Other product areas retain their earlier audit record; this revision does not claim an entire-product redesign.

Focused UI verification passed 20 tests across directory/workspace/conversation boundaries, 18 across join/directory/existing ChatThread, and a subsequent eight-test workspace rerun with stale OWNER cache/error coverage. These runs overlap; they are not 46 distinct tests. An earlier combined run exposed slow deferred ChatThread overlays; a bounded five-second assertion wait preserved the same pinned-dialog requirement, and all seven existing ChatThread tests then passed.

The scoped premium static audit reports zero violations and one unresolved native-control ownership finding. Manual source inspection resolves it to the existing imported authored `Select`; the scanner treats capitalized JSX `Select` as a native select. No ownership manifest was falsified to force a clean audit. Repository-wide static/UI coverage is not claimed.

Production services, database migrations, two-account delivery, actual calls, all themes/languages and assistive-technology behavior were not verified by these fixture tests. No production publication or database mutation was performed in this redesign.

### Final workspace verification

- Final production build passed `tsc -b`, Vite and all 32 SEO prerenders after the community-name header and theme text-token refinements.
- All **24 Playwright scenarios passed in one production-preview run (1.9 minutes)** at 390px, 1280px and 1440px, with mocked APIs. This includes six new workspace scenarios for context, existing chat/draft continuity, channel filtering/focus, members, forged-channel rejection and invitation preview without acceptance. The previous run passed 22 and failed two invitation tests because a global locator matched both legitimate Invite people buttons. Scoping that locator to Community navigation fixed the tests without removing either action.
- After the final header refinement, all 11 resolver/ChatThread tests passed. The existing JSDOM chat tests still log unsuccessful background XMLHttpRequests; the suite passes, but this is not evidence of real network delivery.
- Final changed-boundary ESLint has zero errors and two existing ChatThread hook-dependency warnings. Design inventory generation/check, 26-guide documentation validation and diff whitespace checks passed. No lint rule, hook or type constraint was bypassed.
- Final desktop/mobile channel screenshots and overview were visually inspected. Stable artifacts: `C:/Users/unbeatable/.codex/visualizations/2026/10/21/01a15dda-4c8f-7312-bd97-55ab0f50e492/eternal-community-workspace-desktop.png`, `eternal-community-workspace-mobile.png` and `eternal-community-overview.png` in the same directory. All use explicit fictional fixtures; no private Discord content is included.

## Channel organization continuation — 22 October 2026

Categories and channel ordering/name/description editing now use one versioned, atomic community layout mutation. Active OWNER/ADMIN authorization, tenant-bound category FK, transactional Conversation metadata/outbox updates and optimistic revision conflicts retain existing membership/history semantics. The shared Modal supports a pre-animation dismissal veto for dirty draft confirmation. See the continuation and database rollout limits in [Discord reference](discord-reference-2026-10-22.md).

Verified 96 backend unit tests, 30 frontend unit tests and four real PostgreSQL transaction/isolation tests. The new migration applied in the disposable database through a temporary copy of the 58 valid SQL migrations; an existing untracked empty migration directory prevents direct deployment from the original local migration tree (P3015). This workaround was confined to temporary test files and does not certify the original tree for deployment. No production state changed.

Final continuation checks: 31/31 community/Modal frontend unit tests; 8/8 ChatThread tests including delayed-close cancellation, with existing CommunityConversation compatibility checked separately. Final production build and all eight affected workspace Playwright scenarios passed on 390/1440px (1.5m; mocked API). The preceding full browser run passed 25/26 and exposed the now-fixed delayed-close navigation race; no final all-26 rerun is claimed. Final design generation/check and diff whitespace checks passed. Database integration remains four real isolated PostgreSQL tests; production/multi-account/live sockets remain unverified.

## Channel archive continuation — 22 October 2026

Implemented reversible global archive/restore with active admin authorization, scoped channel ownership, revision conflicts and transactional outbox. Archived history/search/read acknowledgements remain available; send/forward-in/edit/new-reaction/pin/new-call writes recheck archive after the existing participant locks. Authorized deletion/reaction removal/unpin remain cleanup operations. Active DB calls block archive; current web clients stop mesh tracks/connections on refreshed archive state, with denied/late/repeated microphone joins covered by regressions.

Verified 181 focused backend tests, 34 focused frontend tests, mapper/interface compatibility, 14 conversation-repository/call-reconnect tests and six real isolated PostgreSQL scenarios (overlapping runs). Backend and frontend builds passed, with 32 frontend SEO prerenders. All ten workspace Playwright scenarios passed in one production-preview run on 390/1440px (1.3m; API mocked). The database migration used a temporary copy excluding the pre-existing empty migration directory; original-tree direct deployment is still not certified. No production database/deployment or real two-account call test was performed.
