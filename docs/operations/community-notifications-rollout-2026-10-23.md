# Community notifications rollout — 23 October 2026

Status: production rollout and two-account notification UI acceptance complete.

## Behavior and compatibility

Active members edit only their own server/channel notification preferences. Server mode is ALL, MENTIONS or NONE; a nullable channel override inherits the server mode. Temporary server mute and existing conversation message mute independently suppress alerts until expiry. Calls retain existing mute controls. Message delivery and canonical unread projection do not depend on alert preferences.

Mentions carry at most 50 explicit participant IDs validated inside the authorized message transaction. IDs persist in history, outbox and replay; idempotent retry returns the original message. Forwarded messages start without mentions. Encrypted offline retry reuses its persisted envelope and IDs; losing that envelope cannot silently send the optimistic plaintext. The feature controls existing in-app toasts and sound. The existing offline worker remains a log-only path, so external push delivery is not claimed.

The additive `20261022220000_community_notification_preferences` migration adds the notification enum, server member preferences, nullable conversation overrides and a default-empty message mention array. Older clients keep reading additive responses and default to their previous behavior. Apply the migration through Core before publishing new Messenger handlers or the web client. Do not drop these additive columns during rollback. Older web clients cannot honor the new preference modes until updated.

Personal COMMUNITY_CHANGED events trigger reconciliation without changing the administrator channel revision. Reconnect/resync resets verified preference generations so an inactive cached ALL detail cannot override a newer NONE or mute. Alert delivery waits for current detail and suppresses alerts if it cannot load it. Channel badges use the same unread projection as conversation/global counts, including unloaded pages.

## Verification evidence

- Final affected backend run: eight focused suites, 162 tests passed after correcting the transaction argument assertion. Backend build, shared-contract typecheck and all 16 workspace typechecks passed.
- Real isolated PostgreSQL 17: six notification tests and eleven existing community/private/layout tests passed, including actual persisted mentions, private revocation, unread under NONE and rollback on outbox failure. The disposable fixture was stopped; unrelated development databases were preserved.
- Web chat: eight focused suites, 39 tests passed; subsequent replay/reconnect tests and dialog tests passed (16 tests in the final two-suite run). Frontend typecheck passed.
- Community form/API/page: 23 tests passed. Two browser journeys passed at 390px and 1440px, including keyboard selection, failed save/retry, persisted server mode, channel inheritance reset and retained unread badges. Screenshots were visually inspected.
- A focused independent review found one stale-preference reconnect issue. It was fixed with generation reset and regression coverage; no other concrete blocking auth, isolation or transaction/outbox issue was identified in that review.
- Fresh production public-schema backup: 4,180,200 encrypted bytes, authenticated decryption verified, restored with all 60 applied migrations. The notification migration applied successfully to that restored copy; all four new columns were verified. No plaintext dump was retained. Only the fixture's existing CREATE SCHEMA public entry was omitted from its restore list; application objects and migration records were retained.
- Frontend production build, design generation/check and touched lint passed. The narrow premium static audit reports zero violations and three unresolved Select detections: these are authored React Select imports, not native selects. Browser keyboard and narrow/wide selection journeys passed; a clean static audit is not claimed.

## Release order

1. Take and verify a fresh encrypted production-schema backup and rehearse the additive migration on its restored copy.
2. Commit and push through normal hooks; inspect relevant CI, preserving existing gates.
3. Build web without promoting production domains.
4. Follow the Redis-safe Core background-disabled stage, deploy compatible Messenger and other schema consumers sequentially, and restore Core background work after old processes drain. Apply migrations only on Core; observe actual Redis connections before every deployment.
5. Promote the verified web build after dependency readiness and role smoke checks.
6. Verify real two-account settings, mentions, muted delivery/unread, reload, reconnect and private-access denial on the dedicated QA community. Restore acceptance preferences afterward.

Private-channel rollout, scoped storage and real bidirectional audio acceptance are recorded in [the preceding rollout](private-channel-rollout-2026-10-22.md). Protected-branch approval remains required for merge. Existing platform scroll/focus CI failures have a documented main-branch baseline; they must not be described as green or bypassed.

## CI follow-up and live migration

Core staging `dep-dbdhd7oae00c7387ai8g` and Messenger `dep-dbdhgjoae00c7387jql0` are live on `5034d7d6`. Core temporarily has background work disabled. A separate verified-TLS query confirms all61 applied migrations, including the notification migration; both services passed database/Redis readiness and Redis drained to18/30 clients before each subsequent role update.

CI exposed a newly added channel-preference test that matched only one argument of `recordEvent`, although the implementation correctly supplies the Prisma transaction as its second argument. The assertion now explicitly verifies both event and transaction; a final affected eight-suite backend run passed162 tests.

The unchanged main/previous lockfile was affected by DOMPurify advisory GHSA-cg2g-xh64-v4q7. The follow-up updates only DOMPurify3.4.16→3.4.17 and its direct allowed range/integrity; frozen installation changes one package. Current production audit reports zero critical findings and four pre-existing high findings; no security threshold was lowered. Markdown rendering tests passed15/15.

Startup initially exceeded the existing350KiB budget. Message preview formatting and its crypto dependency now load only when displaying a toast; generic fallback remains available on import failure. Recheck account, active conversation and preference generation before showing a deferred preview. Three affected suites passed34 tests, including new cancellation regressions. The actual production build startup graph is347.6KiB, with no forbidden startup or chat-overlay imports. Contract-purity experiments were discarded; no validation behavior changed.

## Production rollout checkpoint

All four API roles are live on `5034d7d6`. Core final restore `dep-dbdht83ncjis73a8s0ng` succeeded, with background work restored. Reels `dep-dbdhlunavr4c73a47ui0` and Music `dep-dbdhq37avr4c73a4mocg` succeeded after the preceding Core/Messenger stages. Final Redis observation was 23/30 clients. All four services passed readiness, owned-route, wrong-service rejection and WebSocket boundary smoke checks.

Web follow-up `a20a1e7a` was promoted as `dpl_4iYbofRzdEhs6ayyaiJSbPVkEqJ3`; the canonical domain serves `/assets/index-D2PXxfea.js` with HTTP 200 and the expected media Permissions-Policy. Production REST acceptance verified own preferences, server inheritance, channel override, independent server mute, unchanged unread, anonymous denial and wrong-role rejection. QA preferences were restored. Production UI persisted MENTIONS plus temporary mute across reload; QA ALL/unmuted was restored afterward. Final real two-account acceptance passed: with primary MENTIONS and inherited private channel, a plain QA message increased unread to1 without a toast; @subvinc produced a visible toast and unread2; a mention under server mute arrived with unread3 and no toast. Opening the channel subsequently cleared its unread badge. Reload retained server mute and channel inheritance. Primary ALL/unmuted and channel inheritance were restored and verified; QA preferences were also restored.

Current Security CI passed, including Trivy; affected build/typecheck and API contract jobs passed. Backend unit CI reports 946 passing tests and one media decode failure. Its validator/test/fixtures are byte-identical to main: passing main used FFmpeg 6.1.1, current runner uses 8.0.1. Exact failing format is unconfirmed; local reproduction lacked FFmpeg. This is an environment compatibility lead, not a proven root cause or a green full-suite result. Existing main platform scroll/focus failures remain separate. No gates or decoder validation were weakened.
