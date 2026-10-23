# Community notifications rollout — 23 October 2026

Status: production migration applied; sequential API rollout in progress, web promotion pending.

## Behavior and compatibility

Active members edit only their own server/channel notification preferences. Server mode is ALL, MENTIONS or NONE; a nullable channel override inherits the server mode. Temporary server mute and existing conversation message mute independently suppress alerts until expiry. Calls retain existing mute controls. Message delivery and canonical unread projection do not depend on alert preferences.

Mentions carry at most 50 explicit participant IDs validated inside the authorized message transaction. IDs persist in history, outbox and replay; idempotent retry returns the original message. Forwarded messages start without mentions. Encrypted offline retry reuses its persisted envelope and IDs; losing that envelope cannot silently send the optimistic plaintext. The feature controls existing in-app toasts and sound. The existing offline worker remains a log-only path, so external push delivery is not claimed.

The additive `20261022220000_community_notification_preferences` migration adds the notification enum, server member preferences, nullable conversation overrides and a default-empty message mention array. Older clients keep reading additive responses and default to their previous behavior. Apply the migration through Core before publishing new Messenger handlers or the web client. Do not drop these additive columns during rollback. Older web clients cannot honor the new preference modes until updated.

Personal COMMUNITY_CHANGED events trigger reconciliation without changing the administrator channel revision. Reconnect/resync resets verified preference generations so an inactive cached ALL detail cannot override a newer NONE or mute. Alert delivery waits for current detail and suppresses alerts if it cannot load it. Channel badges use the same unread projection as conversation/global counts, including unloaded pages.

## Verification evidence

- Backend: nine focused suites, 181 tests passed; backend build and shared-contract typecheck passed. Final backend typecheck passed independently.
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
