# @social-network/native — Node.js adapter for msg-codec v1

Server-side entry point to the codec: Buffer-typed facade, process metrics,
and an optional Rust (`napi-rs`) accelerator. Runs **inside the backend
process** — no separate server, no extra deploy.

- Wire format + portable core: `@social-network/msg-codec` (web, React Native,
  Electron renderer, Node).
- This package: Node-only glue (`Buffer`, `process.env`, dynamic `require`).
  Never import it from web/RN/Electron-renderer bundles.

## Usage (backend)

```ts
import { getActiveCodec, getCodecInfo, getCodecMetrics } from '@social-network/native';

const codec = getActiveCodec(); // native when verified, else portable TS
const bytes: Buffer = codec.encodeAlloc({ type, seq, timestampMs, callId, payload });
```

Backend selection: `MSG_CODEC=auto` (default) | `ts` | `native`.
`native` fails fast at startup when no verified binary exists — explicit opt-in,
never a silent downgrade. `getCodecMetrics()` exposes lock-free counters
(encodes/decodes/bytes/errors by code) for the Prometheus endpoint.

## Measured results (TS backend = portable core)

`pnpm bench:msg-codec` · Node v24.19.0, win32-x64, Ryzen 5 7235HS ·
60k iters/case (20k for 8 KiB), per-op `hrtime` samples. Legacy = previous
inline implementation inlined verbatim; compat gate asserts byte-identical
output first.

| Case            | Op           | Legacy mean (p99) | New mean (p99)    | Speedup   |
| --------------- | ------------ | ----------------- | ----------------- | --------- |
| empty/0B        | encode       | 1.74 µs (3.60 µs) | 0.42 µs (1.00 µs) | **x4.09** |
| empty/0B        | decode       | 1.56 µs (3.20 µs) | 0.50 µs (1.10 µs) | **x3.13** |
| voice/256B      | encode       | 1.56 µs (3.40 µs) | 0.48 µs (1.20 µs) | **x3.23** |
| voice/256B      | decode       | 1.56 µs (3.10 µs) | 0.51 µs (0.90 µs) | **x3.03** |
| video-mtu/1200B | encode       | 1.82 µs (3.40 µs) | 0.51 µs (1.00 µs) | **x3.61** |
| video-mtu/1200B | decode       | 1.49 µs (3.00 µs) | 0.51 µs (0.90 µs) | **x2.95** |
| jumbo/8192B     | encode       | 2.65 µs (5.20 µs) | 1.41 µs (2.40 µs) | **x1.88** |
| jumbo/8192B     | decode       | 1.90 µs (3.30 µs) | 0.50 µs (1.00 µs) | **x3.78** |
| uuid            | parse+format | 2.88 µs (5.30 µs) | 0.38 µs (0.70 µs) | **x7.59** |

Where the win comes from: UUID via lookup tables (no regex/substring/`parseInt`),
timestamp via two u32 ops (no `BigInt`), explicit-shift integers (JIT-inlined,
no `DataView`), header-only decode path. Large-payload encode converges toward
`memcpy` speed.

Full machine-readable baseline: `benches/report.json` (CI uploads it as an artifact).

## Testing

- `pnpm test:native` — adapter surface: backend selection, Buffer in/out,
  metrics, fail-fast without a binary. Wire conformance lives in `msg-codec`.
- `backend/src/messenger/services/__tests__/off-heap-buffer-pool.spec.ts` —
  NestJS integration (slab + codec together).

## Rust accelerator (`rust/`, napi-rs)

`rust/src/lib.rs` mirrors the portable core 1:1. Loader contract
(`src/native-bindings.ts`): no hard dependency, `tryLoadNative()` never throws
on load problems, every binary is cross-checked against the TS core before use.

### Setting up the Rust toolchain on Windows (one time)

PowerShell as a normal user (no admin needed except for Build Tools install):

```powershell
# 1. C++ linker (required by Rust on Windows) — needs admin, one time:
winget install Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive"

# 2. Rust itself (restart the shell afterwards):
winget install Rustlang.Rustup

# 3. Verify:
rustup default stable-x86_64-pc-windows-msvc
cargo --version
rustc --version
```

Then, from the repo root:

```powershell
# Rust unit tests (no Node involved):
cargo test --manifest-path packages/native/rust/Cargo.toml

# Optional: build a local dev binary and let the loader pick it up
# (loads from packages/native/prebuilds/, gitignored):
cargo build --release --manifest-path packages/native/rust/Cargo.toml
```

The first `cargo` run creates `packages/native/rust/Cargo.lock` — **commit it**
(it is intentionally not gitignored: we ship compiled prebuilds and two devs
build locally, so locked deps mean reproducible binaries). After it is
committed, prefer `cargo --locked` in CI to fail fast on lock drift.

For production prebuilds (`.node` per platform, published as
`@social-network/native-<platform>-<arch>[-libc]`), the CI template is
`.github/workflows/native.yml` — extend it with an `napi prebuild` matrix job
when the first publish is needed. Until then the TS core carries the load.

## Accelerator host

Besides msg-codec, this package opportunistically loads Rust prebuilds for
the portable cores (`src/accelerators.ts`, same cross-check contract):

| Core                             | Loader                   | Selection env                |
| -------------------------------- | ------------------------ | ---------------------------- |
| `@social-network/text-pipeline`  | `tryLoadTextPipeline()`  | `MSG_TEXT=auto\|ts\|native`  |
| `@social-network/blinded-crypto` | `tryLoadBlindedCrypto()` | `MSG_BLIND=auto\|ts\|native` |
| `@social-network/feed-score`     | `tryLoadFeedScore()`     | `MSG_FEED=auto\|ts\|native`  |

Prebuild specifiers: `@social-network/<pkg>-<triple>` (or
`prebuilds/<pkg>.<triple>.node` for local dev). The backend services use them
transparently with TS fallback.

## Layout

```
packages/native/
  src/            Node facade: buffer wrappers, metrics, napi loader
  rust/           Rust napi crate (CI-tested, prebuild-ready)
  tests/          adapter tests (wire conformance lives in msg-codec)
  benches/        legacy-vs-new microbench + report.json baseline
  prebuilds/      local .node binaries (gitignored, never commit)
  dist/           built output (gitignored, built on install/CI/docker)
```

Package-local benches/tests stay with the package by design: root
`benchmarks/` is for system-level suites (socket storms, k6, clinic), not for
unit-adjacent micro-benchmarks.
