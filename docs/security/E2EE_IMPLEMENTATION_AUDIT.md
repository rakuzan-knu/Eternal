# E2EE Implementation Audit (code vs claims)

**Date:** 2026-09-09 · **Remediated:** 2026-09-10 (F1–F4, see status below) ·
**Message layer:** 2026-09-10 (M1–M3 + send-path wired, see Appendix A) ·
**Scope:** call media path + key directory (backend `src/crypto/e2ee/*`,
frontend `features/chat/lib/e2ee/*`, `features/chat/model/useWebRTC.ts`,
`docs/security/CRYPTOGRAPHIC_AUDIT_REPORT.md`

- ProVerif/Tamarin models) · **Method:** source review + test review, no
  dynamic testing, no side-channel lab.

## Verdict

**Do not claim end-to-end encryption for calls.** The deployed call path
derives media keys from server-known data (F1). Accurate label today:
_transport-obfuscated media on top of browser DTLS-SRTP_ — meaningful only
against passive outsiders who see neither signaling nor code.

The existing `CRYPTOGRAPHIC_AUDIT_REPORT.md` ("0 vulnerabilities") models a
_different protocol_ (hybrid X25519 + ML-KEM-768 + ML-DSA + HKDF + SAS
ceremony) than `useWebRTC.ts:463` executes. A proved model of protocol A
says nothing about deployed protocol B. Until the code matches the model
(or the report is rescoped), quote neither "post-quantum" nor "formally
verified" for calls — in UI, docs, or marketing.

## Remediation status (2026-09-10)

| Finding                      | Status            | Evidence                                                                                                                                                                                                          |
| ---------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1 server-computable key     | **FIXED**         | `e2ee/callKeyExchange.ts` (ECDH P-256 + HKDF, RFC 5869-anchored tests); handshake wired through `CALL_INITIATE`/`CALL_ACCEPT` (`e2eeEphemeralKey` relay, opaque); legacy derivation deprecated, zero prod callers |
| F2 false `verified`          | **FIXED**         | states `unverified` → `verified` only via `confirmE2eeSasMatch` (SAS-modal button); store default `disabled`                                                                                                      |
| F3 fail-open frames          | **FIXED**         | encrypt path drops on error (main thread + worker)                                                                                                                                                                |
| F4 IV reuse                  | **FIXED**         | random 12B IV per frame everywhere; single `0xe2` tag (legacy `0x7e` accepted on decrypt)                                                                                                                         |
| F5 directory accepts garbage | OPEN              | fix specified below                                                                                                                                                                                               |
| F6 unaudited PQC/MLS in-tree | OPEN, quarantined | dead code, tests only                                                                                                                                                                                             |
| F7 no forward secrecy        | PARTIAL           | per-call ephemerals give session freshness; no prekeys/rotation yet                                                                                                                                               |
| F8 curve allowlist noise     | OPEN              | one-line change, see below                                                                                                                                                                                        |

"FIXED" means implemented + tested (24 frontend / 186 backend green); it does
NOT mean externally audited. The verdict above stands until an independent
review signs off — the honest product label today is _"encrypted, peer
unverified by default"_ rather than "E2EE".

## Findings

### F1 — Call media key is server-computable [CRITICAL]

`frontend/.../e2ee/frameCrypto.ts:112-125` (`deriveCallCryptoKey`):
`key = SHA-256("eternal-call-e2ee:" + callId + ":" + salt)`, salt defaulting
to the hardcoded public string `'eternal-e2ee-salt'`. Wired as the live path
in `useWebRTC.ts:463` + `:1229`. `callId` travels in plaintext signaling the
server creates and relays — the server (or anyone with signaling/logs) holds
everything needed to recompute the AES-GCM key and decrypt all media.
_Fix:_ ECDH via the existing key directory (`E2eeService` + non-extractable
WebCrypto helpers already in the file, currently unwired) with per-call
ephemerals; HKDF with both contributories; keep `deriveCallCryptoKey` only
behind an explicit `INSECURE_` name for local dev. Effort: 1–2 weeks.

### F2 — UI reports `verified` with zero verification [HIGH]

`useWebRTC.ts:468`: `setE2EEInfo('verified', …)` immediately after local
derivation — no SAS comparison, no key exchange. Users see a verified lock
for a key nobody verified. With F1 unfixed, SAS values match even under
server MITM.
_Fix:_ rename state to `unverified`, add a SAS-compare ceremony UI before any
`verified` label; gate the label on ECDH completion (F1). Effort: 3–5 days.

### F3 — Encryption fails OPEN [HIGH]

`frameCrypto.ts:186-188`: on `encrypt()` error the frame is sent
**unaltered (plaintext)** with a console warning; the receiver passes
untagged frames through (`:202-205`). One transient WebCrypto error silently
downgrades the call.
_Fix:_ fail closed — drop the frame, count `e2ee.encrypt_failures`. Effort: hours.

### F4 — IV reuse across sessions [HIGH]

IV = `SFRM_MAGIC || frameIndex`, counter restarting at 1 per transform
instance (`:164-168`, `:238`). Same key + repeated IV under AES-GCM destroys
confidentiality and integrity. Rekey or random session salt is missing.
_Fix:_ mix a per-session random into the IV (or re-key per call via F1) and
reject reused (key, IV) pairs. Effort: 1–2 days with F1, else band-aid only.

### F5 — Key directory accepts unparseable keys [MEDIUM]

`e2ee.service.ts:60-70`: fallback treats any 32–4096-byte base64 blob as a
"valid public key", contradicting the function's own docstring. Poisoned
directory entries break future sessions opaquely.
_Fix:_ enforce strict SPKI parse (drop the fallback) and store/return a
`SHA-256(SPKI)` fingerprint so clients can pin and display keys. Effort: 1 day.

### F6 — Unaudited PQC/MLS code ships in-tree [MEDIUM]

`pqcKeyExchange.ts` (hand-rolled ML-KEM-768) and `mlsTreeKem.ts` are imported
only by their own tests — dead in production. Hand-rolled PQC without KAT
vectors (NIST ACVP) must never be wired in on looks alone.
_Fix:_ keep quarantined; add KAT tests from FIPS 203 vectors before ANY
production use; delete if no owner in 1 quarter. Effort: 2–3 days for KATs.

### F7 — No forward secrecy design [MEDIUM, by design gap]

Static identity keys + no rotation/signed-prekey story: identity-key
compromise decrypts retained ciphertext. `initiateKeyExchange` (`:129-151`)
validates and returns success without persisting or relaying anything.
_Fix:_ per-conversation ephemerals (F1 covers 1:1), rotation policy, then
prekeys. Effort: 2–4 weeks after F1.

### F8 — Curve allowlist noise [LOW]

DTO permits `secp256k1` with no consumer need; default stays `prime256v1`.
_Fix:_ allow `x25519` (+ `prime256v1` legacy), drop the rest. Effort: hours.

## What is already right (keep)

- Key registration is auth-bound (`@CurrentUser`, `AuthGuard`) — no anonymous
  key overwrite; DTO validation + 4096-char cap + global `ThrottlerGuard`.
- `computeSharedSecret` / server keygen are test-only (no prod callers) — no
  live key escrow. Consider moving them to test helpers so the production
  service cannot derive secrets at all.
- Non-extractable WebCrypto helpers exist (`extractable: false`) — the right
  primitive, just unwired (see F1).
- Decrypt-side failures already drop frames (fail-closed); extend the same
  discipline to the sender (F3).

## Remediation order

1. ~~F1 (ECDH wiring) + F2 (honest UI states)~~ — DONE 2026-09-10.
2. ~~F3 + F4 (fail-closed, IV hygiene)~~ — DONE 2026-09-10.
3. F5 (directory strictness + fingerprints) — enables client key pinning.
4. Re-scope or re-prove: point ProVerif/Tamarin at the _implemented_
   handshake, or mark the current report "reference design, not deployed".
5. F6/F7/F8 as follow-ups; message-layer E2EE send-path is wired for 1:1
   DIRECT (Appendix A) — groups, attachments, and key verification remain
   follow-ups.

## Reviewer note on vectors

This repo's convention (golden vectors enforced on both sides, e.g.
`packages/*/vectors/`) should extend to any crypto that ships: KAT vectors
for KEM/cipher suites, SAS vectors, and handshake transcripts — so the next
audit diffs bytes, not prose.

## Appendix A — message-layer E2EE (`shared/lib/crypto/e2ee.ts`, reviewed 2026-09-10)

Separate from calls; largely sounder, with its own gaps:

- GOOD: genuine client-side ECDH P-256 + AES-GCM-256, random IV per message,
  versioned `{e2ee, v, iv, ct}` envelope. No server-computable secrets.
- M1 [MEDIUM]: ~~identity private key lives **extractable** in `localStorage`
  (`extractable: true` + JWK export). Any XSS exfiltrates it permanently.~~
  **FIXED 2026-09-10:** storage ladder IndexedDB (non-extractable) → legacy
  `localStorage` one-time migration (re-import `extractable: false`, same
  identity, localStorage copy wiped) → fresh non-extractable generation →
  in-memory fallback with console warning. Covered by
  `shared/lib/crypto/__tests__/e2ee.test.ts` +
  `e2ee-migration.test.ts`.
- M2 [LOW-MEDIUM]: ~~encrypt/decrypt/send paths have no production callers~~
  **FIXED 2026-09-10:** send-path wired in `useMessageActions`
  (send + retry, socket + REST fallback; DIRECT 1:1 with a peer `message`-slot
  key → envelope on the wire, optimistic bubble stays plaintext; every miss →
  plaintext as before). Decrypt wired in `MessageBubble` via
  `useDecryptedMessageBody` (`MessageList` passes the 1:1 peer; groups render
  the locked label). Identity auto-registers `purpose: 'message'` on
  conversation open. Covered by `messageE2ee.test.ts` (two-party roundtrip
  cross-verified with raw WebCrypto, degradation matrix). Out of scope in v1:
  group chats, attachment bodies, key verification (TOFU, no fingerprints yet).
- M3 [LOW]: ~~`isEncrypted` sniffs substrings~~ **FIXED 2026-09-10:**
  parse-then-validate (`e2ee === true && v === 1 && string iv/ct`, 64 KiB cap);
  regression tests in `e2ee.test.ts`. Legacy dev-preview `{e2ee:true,text}`
  shape still renders its plaintext via the display layer (never encrypted,
  never claimed otherwise).

## Appendix B — message-layer hardening, round 2 (2026-09-10)

Found by wiring review; all fixed same day:

- P0-1 [FUNCTIONAL]: backend zod capped `text/body` at 4096 chars, but a
  v1 envelope inflates ~4/3 in base64 — encrypted long messages 400'd while
  plaintext passed. `chat.ts` now refines: ≤4096 plaintext OR a well-formed
  v1 envelope ≤8192 (`MESSAGE_PLAINTEXT_MAX`/`MESSAGE_ENVELOPE_MAX`,
  `isE2eeV1EnvelopeShape`; shape-checked, never decrypted server-side).
  DB column is unbounded TEXT, so no migration. Enforced by
  `chat.contract.spec.ts` "E2EE envelope headroom" (5 tests) + Playwright
  `message-e2ee.spec.ts` (3500-char envelope fits the cap in real Chromium).
- P0-2 [UX LEAK]: toasts rendered raw envelope JSON via
  `getMessageToastPreview`. Now returns "New encrypted message" for
  envelopes (M3 parity: marker-mentioning plaintext still shows).
- P0-3 [DOWNGRADE]: `editMessage` sent the edited body plaintext, permanently
  downgrading encrypted messages; the edit prompt even prefilled raw
  envelope JSON. Now: shared `promptEditMessage` resolves decrypted prefill
  (refuses undecryptable messages instead of corrupting them), and
  `editMessage` re-encrypts when the stored original was an envelope —
  fail-closed when the peer key is gone. Covered by
  `useMessageActions.e2ee.test.ts` (7 tests).
- P0-4 [UX BREAK]: server-side `forwardMessage` copied envelopes verbatim
  into foreign dialogs (permanently locked for recipients). Now client-side
  decrypt-with-source-peer → re-encrypt-per-target via `sendMessage` with
  `forwardedFromId` preserved; explicit targets without E2EE go plaintext
  (same rule as send); undecryptable envelopes refuse. Same suite.
- Drive-by [REAL BUG]: `e2ee.service.getPublicKey` returned legacy unslotted
  records untrimmed while `registerPublicKey` trims on write — canonicalize
  on read now; `e2ee.service.spec.ts` 8/8.
- P2 [VECTORS]: `frontend/src/shared/lib/crypto/vectors/v1.json` — OpenSSL
  cross-implementation AES-256-GCM anchor (byte-identical reproduce),
  ECDH P-256 agreement, golden v1 envelope; enforced by
  `e2ee-vectors.test.ts`. Single-side by design (no Rust counterpart for
  browser WebCrypto). Generation: throwaway script, fixed output committed.
- P2 [DEVICE]: message-slot registration sends a stable per-install
  `deviceId` (`e2ee_device_id`, v4) instead of hardcoded `'web'`.
- P2 [CI]: `playwright-calls.yml` runs `e2e/message-e2ee.spec.ts`
  (two isolated Chromium realms) with path triggers on crypto/send/contract.

## Known limitations (documented product contract, v1)

- 1:1 DIRECT text only. Groups, attachment bodies, voice transcripts stay
  plaintext. Server search cannot match ciphertext (client-side search in
  open conversations only); push payloads stay generic.
- TOFU directory trust: message-slot keys are NOT pinned yet (calls are via
  `identityKeys.ts`) — a directory MITM is invisible. Pinning is the next
  crypto work item, before any "verified" claim for messages.
- No forward secrecy / rotation: one identity until the user clears site
  data. Rotation policy: new identity on demand (settings action) + peers
  re-fetch directory keys (5-min TTL bounds staleness); old history becomes
  unreadable on the rotating device — this is inherent, communicated in UX
  copy when the action ships. New device = new identity = old history
  unreadable (no encrypted backup yet).
- Single slot per user per purpose: a second device overwrites the first's
  key (per-install `deviceId` is metadata today). Multi-device fan-out is
  the follow-up; until then cross-device history gaps are expected.
- Envelopes carry no AAD binding (conversation/sender) and no sequence —
  a malicious server can transplant, replay, drop, or reorder messages
  undetectably at the crypto layer. AAD + per-conversation sequence is the
  envelope-v2 design task.
- Fixed alongside: `CallSchemaOrg` SEO text dropped the false
  "post-quantum security" claim; `p2pTurnRelay` header softened.
