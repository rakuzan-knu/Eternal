# @social-network/blinded-crypto — portable blind-signature crypto v1

RSA blind-signature primitives for zero-trust rooms: windowed modular
exponentiation + `signBlinded` / `verifyTicket` over canonical hex. Pure
`BigInt`, zero dependencies, no Node APIs — Node, browsers, React Native
(Hermes ships `BigInt` since ES2020).

The backend consumes it through `BlindedSfuService`
(`backend/src/messenger/gateway/`), keys via `BLIND_RSA_*` env (production)
or an ephemeral per-process demo keypair (local dev).

## API

```ts
import { signBlinded, verifyTicket } from '@social-network/blinded-crypto';

// Server blinds-signs without seeing the message:
const s = signBlinded({ nHex, dHex, blindedHex }); // canonical hex out
// Anyone verifies with the public key:
const ok = verifyTicket({ nHex, eHex, ticketHex, signatureHex }); // boolean, never throws
```

`modPow` (adaptive: binary loop under 2^64, 4-bit sliding window above) and
`modPowBinary` (executable reference) are exported for embedding. Hex is
strict (even-length canonical out); out-of-range messages throw typed
`BlindedCryptoError`. Variable-time arithmetic is documented — side-channel
hardening comes from the Rust backend (Montgomery `modpow`).

## Measured results (portable TS core)

`pnpm bench:blind` · Node v24.19.0, win32-x64 · real 2048-bit RSA.
Legacy = backend `modPow` loop ported verbatim.

| Case    | Op          | Legacy mean (p99)    | New mean (p99)       | Speedup      |
| ------- | ----------- | -------------------- | -------------------- | ------------ |
| rsa2048 | sign        | 14.87 ms (16.06 ms)  | 11.05 ms (13.19 ms)  | **x1.34**    |
| rsa2048 | verify      | 84.84 µs (141.60 µs) | 87.68 µs (279.60 µs) | x0.97 parity |
| api     | signBlinded | 15.33 ms (16.49 ms)  | 11.05 ms (15.40 ms)  | **x1.39**    |

Honest reading: the window pays off on the slow op that matters (room-join
signing saves ~4 ms per join at 2048 bits); verification with tiny `e` stays
on the binary loop by design (adaptive dispatch — the window table would cost
more than it saves). The 50–100x step is the Rust Montgomery backend, loaded
opportunistically by `@social-network/native` (`MSG_BLIND=auto|ts|native`).

Full machine-readable baseline: `benches/report.json`.

## Conformance contract (`vectors/`)

`vectors/v1.json`: textbook RSA (p=61,q=53) sign/verify/edges, tamper case,
out-of-range error case, and a fixed 512-bit roundtrip. `modpow` is
deterministic, so signatures are byte-exact across languages. Enforced by
`node:test` and `cargo test` (`golden_vectors`) alike.

## Testing

- `pnpm test:blind` — 16 cases: golden vectors, windowed≡binary fuzz (200
  random moduli), fresh-key roundtrips, validation taxonomy.
- Backend spec exercises the real service incl. session registration.
- `cargo test` in `rust/` — `num-bigint` core + golden vectors (CI job).

## Rust accelerator (`rust/`, napi-rs)

`num-bigint` Montgomery `modpow` behind `sign_blinded` / `verify_ticket`
(+ `self_test`, `crate_version`). See the root note above on side channels:
rate-limit joins server-side regardless of backend.

## Rules for contributors

1. Never commit real key material — vectors use textbook/fixed test keys only.
2. Math changes require vector regeneration + both-language green CI.
3. The demo service keypair stays ephemeral/env-injected, never hardcoded.
