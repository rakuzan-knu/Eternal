# @social-network/msg-codec — portable msg-codec v1 core

Binary packet framing shared by **every client**: web (React), React Native /
Hermes, Electron renderer/preload, and Node.js. Pure `Uint8Array`, zero
dependencies, zero Node.js APIs — if you import `node:*` or `Buffer` here,
the PR is wrong.

Node-specific concerns (Buffer ergonomics, `napi` accelerator, metrics,
micro-benchmarks) live in `@social-network/native`, which depends on this
package. The backend consumes the codec through `@social-network/native`.

## Wire format (FROZEN — v1)

Big-endian, 36-byte header. Byte-identical to the legacy backend encoding.

| Bytes  | Field                | Type         |
| ------ | -------------------- | ------------ |
| 0..1   | magic `0x45 0x54`    | 2 bytes      |
| 2..3   | type                 | uint16 BE    |
| 4..7   | seq                  | uint32 BE    |
| 8..15  | timestampMs (< 2^53) | uint64 BE    |
| 16..31 | callId               | 16 raw bytes |
| 32..35 | payloadLength        | uint32 BE    |
| 36..   | payload              | raw bytes    |

Any format change requires a new version (bump + new magic), never an in-place edit.

## Usage (any platform)

```ts
import { decodeHeader, decodePacket, encodeAlloc, encodeInto } from '@social-network/msg-codec';

// Stateless (allocates exactly header + payload)
const bytes: Uint8Array = encodeAlloc({
  type: 7,
  seq: 424242,
  timestampMs: Date.now(),
  callId: '123e4567-e89b-12d3-a456-426614174000', // or raw 16 bytes
  payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
});

// Zero-copy into a reused slab (games/RN bridge buffers, audio frames)
const end: number = encodeInto(slab, slabOffset, input);

// Header-only parse for routing without touching the payload
const header = decodeHeader(bytes);
const packet = decodePacket(bytes); // payload is a zero-copy view
```

Corruption surfaces as typed `MsgCodecError` with stable `code`s
(`INVALID_MAGIC`, `TRUNCATED`, `INVALID_UUID`, `PAYLOAD_TOO_LARGE`, …) —
safe to switch on at call sites on every platform.

## Platform notes

- **Web (Vite/webpack):** tree-shakeable (`sideEffects: false`), no polyfills needed.
- **React Native / Hermes:** no `BigInt`, no `DataView` on hot paths, no
  `Error.captureStackTrace` (structurally detected), ES2022 syntax only.
  Import from `@social-network/msg-codec` — never from `@social-network/native`
  (Metro cannot load `.node` binaries or `node:*` modules).
- **Electron:** renderer/preload use this package; the main process may use
  `@social-network/native` (full Node.js, `napi` prebuilds load there).
- **Node.js:** `Buffer` extends `Uint8Array`, so Buffers work as inputs and
  `subarray` views of Buffers come back as Buffers. Prefer
  `@social-network/native` on the server for metrics + acceleration.

## Conformance contract (`vectors/`)

`vectors/v1.json` is the cross-language authority: golden packets that every
implementation (TS core, Rust crate, any future Swift/Kotlin port) must
reproduce byte-for-byte. Regenerate with `node vectors/generate.cjs`, enforce
with `pnpm test:codec` (node:test) and `cargo test` (Rust `golden_vectors_v1`
reads the same file via `include_str!`).

## Testing

- `pnpm test:codec` — 19 `node:test` cases: frozen-layout bytes, cross-check
  against an independent naive decoder, 2000× fuzz roundtrips, full error
  taxonomy, slab/ownership semantics.
- Performance baseline for the algorithm lives with the Node adapter:
  `pnpm bench:msg-codec` → `packages/native/benches/report.json`.

## Rules for contributors

1. No `Buffer`, no `node:*`, no `process.env`, no `require` in `src/`.
   (`tsconfig` sets `types: []` so Node globals fail the build by design.)
2. No new allocations on the encode/decode happy path.
3. New protocol = new versioned module, never an edit to v1 behavior.
