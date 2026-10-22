# Private channel rollout — 22 October 2026

Status: backend rollout applied; Core worker restoration and client acceptance in progress.

## Completed operations

- Exported the existing Core configuration into a private, user-only local store.
  No credentials are included in this repository or the release artifact.
- Backed up the production application `public` schema with PostgreSQL 17
  `pg_dump`, TLS hostname/CA verification and the Supabase CA. Encrypted the
  4,156,516-byte archive with AES-256-GCM and authenticated decryption. Restored
  it into disposable PostgreSQL with the required `pg_trgm`/`btree_gin`
  extensions; all 60 migration records restored. Removed the plaintext archive.
- Confirmed there is no production migration record for
  `20261016000000_upload_budget`; removed only that empty, untracked local
  directory. No placeholder SQL, migration history rewrite or resolve was used.
- Rehearsed all five community/access/media migrations on the restored copy.
  Core subsequently applied all five in production; a separate verified-TLS
  database query confirmed their names and the applied count increasing 55→60.
- Created Standard R2 bucket `social-network-private-media`, with public access
  disabled and no public development URL or custom domain.
- Configured CORS for `https://eternalnet.vercel.app` and
  `https://eternal-mobile-web.vercel.app`: GET/HEAD/PUT, content-type,
  if-none-match and range; exposed ETag and content/range headers.
- With explicit operator confirmation, enabled deletion after one day only for
  `_incoming/`; retained the default multipart abort rule. No expiry rule applies
  to published `private-chat/` objects.
- With explicit operator confirmation, created an Object Read & Write token
  scoped only to the public and private media buckets. Its credentials are stored
  privately. Installed the key, its legacy MINIO aliases and `R2_PRIVATE_BUCKET`
  in all four Render configurations with Save only. Re-exported each service
  and verified exactly these five keys changed, no keys were removed, and the
  saved values match the scoped credentials. Existing instances keep their old
  configuration until the sequential deployments below.
- Actual R2 probe: a tiny synthetic `_incoming/` object returned 200 with a
  60-second signed GET and exact expected bytes. Unsigned S3 access returned 400
  (denied); preflight returned 204 and the exact allowed origin for both clients.
  This provider response differs from the isolated S3 fixture's 403. The temporary
  probe object is covered by the confirmed lifecycle rule.
- Created one dedicated acceptance account through the real registration API,
  with a non-deliverable test email and credentials stored privately. No test
  posts or messages were sent to existing users.

## Release preparation and discovered defect

The isolated `feat/private-channel-rollout` branch excludes unrelated local
Saved Reels, registration, profile and marketing edits. It includes communities,
layout/archive, private access, private attachment consumers and their dependency
boundaries. It is based on `4af5ccc9` from remote main; the update from the local
baseline changed only the release changelog.

A real authenticated production socket reached `gatewayReady`, but
`gatewayResume` acknowledgement timed out. The installed Nest adapter does not
inject the undecorated callback alongside decorated socket/body parameters.
Explicit `@Ack()` fixes the chat/reconnect/call callback boundaries. A real Nest
Socket.IO adapter regression covers replay data and idempotent send responses;
auth and persistence are mocked in this narrowly scoped test. Production still
had the old handler before this rollout. The updated Messenger now returns an
actual authenticated `gatewayResume` acknowledgement with `status: ok`.

The release is published in draft PR #135. Normal pre-push workspace typechecks
passed. CI built the backend Docker image and successfully exercised all four
roles with shared PostgreSQL/Redis fixtures. A read-only production role smoke
also passed for all four services; Redis reported 22 clients including the probe,
against a maximum of 30.

Browser access recovered after restarting Chrome. Vercel initially rejected the
commit author (`TEAM_ACCESS_REQUIRED`); after the owner linked GitHub, staging
deployment `dpl_AnqyA9jPEtWC9CTeyQGxmyYL2xGM` reached READY. Its actual HTTP
response allows first-party camera and microphone. Canonical domains have not
been promoted. This staging revision precedes the final sidebar/test follow-up.

CI caught a lazy-navigation heading ambiguity and laptop sidebar overflow from
the additional Communities link. The invitation assertion now targets its h1;
compact navigation uses 40px rows below 760px viewport height. The affected
invitation and laptop tests passed locally. Independently reviewed screenshot
differences were confined to the added/shifted sidebar icons; updated the 17
Windows baselines. Backend unit CI timed out while downloading FFmpeg before
running tests; its job was retried without changing the checks.

## Remaining release sequence

1. Stage the reviewed release client without assigning production domains.
2. Install the confirmed object-only credentials and `R2_PRIVATE_BUCKET` on the
   owning services. Preserve the existing credentials until all consumers drain.
3. Follow the sequential Redis-safe Core background-disabled stage in
   [DEPLOYMENTS.md](../DEPLOYMENTS.md), apply compatible migrations through Core,
   update all affected roles and wait for old instances to stop.
4. Restore Core background work, verify dependency/Redis readiness, then promote
   only the verified web client. Do not enable private-channel use beforehand.
5. Run two-account production acceptance: channel visibility and revoke/regrant,
   search, signed media and actual browser CORS, Socket.IO send/replay/reconnect,
   call signaling and media transport. Do not substitute mocked browser fixtures
   for these checks. The Expo feed currently opens desktop web for chat; there is
   no separate native private-channel renderer to claim as tested.

Core's background-disabled stage and Messenger, Reels and Music now run
`13d963ac`. Each new process passed dependency readiness; Redis returned to 18
clients including the probe after each drain. Final Core restoration with
`BACKGROUND_ENABLED=true` is deploying. The final web staging revision `6cc92cb6`
is READY, and its built JavaScript contains all four expected API origins.

A dedicated QA community/private channel and one-use, one-day invitation are
recorded outside Git. Actual Core direct upload → private R2 PUT → completion →
Messenger Socket.IO send succeeded. Replaying the same client message ID returned
the same message. Authorized private resolution returned 200 with `private,
no-store`; anonymous resolution returned 401, signed R2 reading returned 200,
and unsigned reading returned 400. Browser/two-account acceptance remains pending.

The follow-up regenerates the design inventory after compact-row CSS changed.
Another CI job failed before tests because the runner's unrelated Microsoft apt
repository returned 403. FFmpeg setup now refreshes only signed Ubuntu sources;
verified the exact command and FFmpeg candidate in disposable Ubuntu 24.04.
Workflow YAML/pinned-action validation and design checks passed. No certificate
or package-signature verification was disabled.

Follow protected-branch review; no merge or branch-protection bypass has occurred.
