# Runbook: E2EE call verification (manual evening run)

Verifies the F1 ECDH handshake end-to-end across two REAL browsers + the real
backend relay. Do this once after every change to `callKeyExchange.ts`,
`frameCrypto.ts`, `e2eeTransform.worker.ts`, `useWebRTC.ts`, `useCallManager.ts`,
or the `e2eeEphemeralKey`/`e2eeBindingSignature` relay. Time: ~1 hour first
time, ~20 minutes after.

## 0. Prepare (5 min)

1. Free RAM (close heavy apps) and start the stack:
   - Backend: `pnpm dev:backend` (needs Postgres + Redis — `docker compose -f docker-compose.dev.yml up -d`).
   - Frontend: `pnpm dev:frontend`.
2. Two Chromium windows: one normal, one **incognito** (separate storage =
   separate identity keys, like two devices). Open DevTools console (F12) in both.
3. Register/login as two different users (Alice normal, Bob incognito).

## 1. Happy path: SAS matches, status flow is honest (15 min)

1. Alice calls Bob, Bob accepts. Open the shield badge → SAS modal on BOTH sides.
2. ✅ **CHECK 1**: the 4 emojis + `XXX-XXX` code are IDENTICAL on both screens.
   If they differ → STOP, file a P0 (active MITM or handshake bug).
3. ✅ **CHECK 2**: before touching anything, the badge reads **“Encrypted —
   Verify Peer”** (F2: never `verified` without ceremony).
4. Click **“Emojis Match — Mark Verified”** on both sides.
5. ✅ **CHECK 3**: badge flips to **“End-to-End Encrypted”** on both sides.
6. Talk for 30 seconds (video on). No freezes beyond normal jitter.

## 2. Tamper tests (15 min, the important part)

7. **Server-side key substitution**: in Bob's console, break the handshake once
   (e.g. block `CALL_ACCEPTED` in DevTools → Network → WS → message filter, or
   temporarily patch `completeE2eeHandshake` to derive with a wrong key via
   `await` in console). Re-call.
   ✅ **CHECK 4**: SAS emojis DIFFER between sides, status stays
   “Encrypted — Verify Peer”, media is garbage/black (GCM auth fails closed,
   F3). The call must NEVER show `verified` by itself.
8. **Plaintext-failure drill**: same as above — confirm no intelligible audio
   leaks on either side (fail-closed, F3).
9. Reload Bob mid-call → call drops or renegotiates; on re-join a FRESH
   ephemeral pair is used (DevTools → Application → IndexedDB must NOT contain
   call session keys; only the long-term identity key may persist).

## 3. Identity/TOFU behavior (10 min)

10. First call ever between the accounts → SAS ceremony required (CHECK 2/3).
11. Second call (same browsers, no storage clear) → still `unverified` until
    ceremony in v1 (auto-verify deliberately NOT implemented — see audit F2).
12. Clear Bob's site data (DevTools → Application → Clear storage) → new
    identity key on next call. In Alice's console you must see:
    `[E2EE] peer identity key CHANGED since pinning`.
    ✅ **CHECK 5**: Alice stays `unverified`, SAS still matches (session ECDH
    is independent of identity keys).

## 4. Interop matrix (10 min, each combo one 30-sec call)

| A (caller)               | B (callee)                                   | Expect                                     |
| ------------------------ | -------------------------------------------- | ------------------------------------------ |
| Chrome + ScriptTransform | Chrome + ScriptTransform                     | SAS match, media OK                        |
| Chrome (ScriptTransform) | Safari/Firefox (Insertable Streams fallback) | SAS match, media OK (0xe2 tag both ways)   |
| Any                      | peer that negotiated no E2EE                 | call works, badge “Encryption Unavailable” |

Safari note: ScriptTransform is Chromium-only; the fallback path is
`attachSenderEncryption`/`attachReceiverDecryption` with the same session key.

## 5. Automated counterpart (CI, no hands needed)

- `pnpm exec playwright test e2e/call-e2ee-handshake.spec.ts` — two isolated
  Chromium realms agree on SAS + frames roundtrip (runs in
  `playwright-calls.yml`; run it locally after freeing RAM).
- `cargo test` (Rust cores), `vitest` e2ee suites, backend relay specs —
  all green in CI before merge.

## If anything fails

- SAS mismatch on a clean network: P0, do NOT ship — capture both consoles +
  `e2eeFingerprint` values from the modal and open an incident.
- `verified` appearing without ceremony: P0 (F2 regression).
- One-sided audio/video with matching SAS: likely codec/transport, not crypto
  (check `chrome://webrtc-internals` before blaming E2EE).

## 6. Message-layer E2EE (10 min, two users + DB read)

Preconditions: backend + frontend running, users Alice and Bob registered,
a DIRECT 1:1 conversation between them.

1. **Key publication**: Alice opens the 1:1 conversation. In DevTools →
   Network confirm `POST /e2ee/keys` with `{"purpose":"message",...}` fires
   once. Same for Bob.
2. **Ciphertext on the wire**: Alice sends "meet at noon". In Network, the
   `sendMessage` payload `text` must be a JSON envelope
   `{"e2ee":true,"v":1,"iv":"...","ct":"..."}` — NOT plaintext. In the DB,
   `messages.body` for that row must be the same envelope.
3. **Peer decrypts**: Bob opens the conversation — he reads "meet at noon",
   no lock label. Alice sees her own plaintext bubble (optimistic +
   decrypted via the peer key after reload).
4. **Graceful degradation**: new user Carol (never opened a chat, so no
   message key) sends Alice a message → arrives as plaintext, no errors.
   Group chat messages stay plaintext.
5. **Tamper evidence**: change the last char of the envelope `ct` in the DB
   → Bob sees the lock label ("End-to-End Encrypted message"), never
   garbled text.
6. **Migration**: in Alice's browser console,
   `localStorage.getItem('e2ee_private_key_jwk')` → `null` (identity moved
   to non-extractable IndexedDB `e2ee-message-identity`); reload → Bob still
   decrypts old messages, proving no rotation happened.

Automated counterpart: `pnpm vitest run
src/shared/lib/crypto/__tests__/e2ee.test.ts
src/shared/lib/crypto/__tests__/e2ee-migration.test.ts
src/features/chat/lib/e2ee/__tests__/messageE2ee.test.ts` — 12 tests,
two-party roundtrip cross-verified with raw WebCrypto.

## 7. Message hardening round 2 (5 min, same two users)

1. **Long message**: Alice sends a 3500-char text → arrives, Bob reads it.
   (Regression: envelope must pass the backend cap — plaintext ≤4096,
   envelope ≤8192.)
2. **Toast**: with the conversation closed, Bob's incoming toast shows
   "New encrypted message", never JSON.
3. **Edit**: Alice edits her encrypted message → Bob sees the new text
   (re-encrypted); DB row stays an envelope. Kill Bob's peer key first
   (fresh profile) → Alice's edit of an old envelope refuses loudly,
   never downgrades to plaintext.
4. **Forward**: Alice forwards her encrypted message to Carol (1:1) →
   Carol reads it; DB row in Carol's dialog is a _different_ envelope.
   Forward to a group → plaintext there (explicit share). Forward an
   undecryptable message → refused.

Automated counterpart: `pnpm vitest run
src/features/chat/model/__tests__/useMessageActions.e2ee.test.ts
src/shared/lib/crypto/__tests__/e2ee-vectors.test.ts` (11 tests) +
`pnpm exec playwright test e2e/message-e2ee.spec.ts` (two Chromium realms).
