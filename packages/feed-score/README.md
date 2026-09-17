# @social-network/feed-score — portable recommendation scoring v1

Deterministic candidate ranking for suggestions and feeds: **proximity +
mutuals + popularity (+ recency decay + interest affinity)**. Pure math, zero
dependencies, no Node APIs — Node, browsers, React Native.

The backend consumes it in `UsersService` (suggestion pipeline) with the v1
preset that mirrors the legacy composite bit-for-bit.

## API

```ts
import { LEGACY_WEIGHTS, rankCandidates } from '@social-network/feed-score';

const ranked = rankCandidates(
  [
    {
      id: 'u-1',
      distKm: 5, // km from viewer, null when unknown/not permitted
      allowNearby: true,
      city: 'Kyiv',
      mutuals: [{ id: 'm1', username: 'anna', avatar: null }],
      mutualCount: 1,
      followersCount: 120,
      lastActiveAtMs: 1725800000000, // null when unknown
      interests: [0.2, 0.8, 0.1], // optional embedding
    },
  ],
  { weights: LEGACY_WEIGHTS }, // default; 0.4/0.4/0.2/0/0
);
// ranked[0] = { id, score, parts: {proximity, mutual, popularity, recency, affinity}, reason }
```

Reasons mirror the product cards exactly (`MUTUAL_FRIENDS` with pluralization,
`NEARBY` / `SAME_CITY`, `POPULAR` fallback). Weights must sum to 1 (fail-fast
otherwise). Sorting is an explicit score-desc + input-order tiebreak —
identical on V8, Hermes, JSC, and Rust. Scores round to 1e-6; cross-language
float compares use 1e-9 tolerance (libm last-ULP).

## Measured results (portable TS core)

`pnpm bench:feed` · Node v24.19.0, win32-x64 · 80 production-shaped candidates.
Legacy = backend scoring loop ported verbatim (incl. reason building).

| Case                   | Legacy mean | New mean | Speedup                |
| ---------------------- | ----------- | -------- | ---------------------- |
| rank/80                | 22.59 µs    | 21.71 µs | **x1.04 parity**       |
| rank/80+decay+affinity | 16.12 µs    | 19.89 µs | x0.81 (new capability) |

Honest reading, and this is the point: **recommendation latency is dominated
by IO, not math** — one suggestion call does a geosearch + 2 repository
queries + up to 2×N Redis roundtrips (milliseconds), while scoring 80
candidates costs ~20 µs either way. This package buys determinism (explicit
tiebreaks), testability (golden vectors), decay/affinity readiness, and
mobile reuse — not a CPU revolution. If the feed ever gets slow, profile the
candidate _fetching_ first (batch the N geodist calls into one pipeline —
that alone dwarfs any scoring win).

Full machine-readable baseline: `benches/report.json`.

## Conformance contract (`vectors/`)

`vectors/v1.json`: legacy-parity pool, reason cards, tie stability, decay
half-lives, cosine incl. zero-norm/dim-mismatch, empty pool. Enforced by
`node:test` and `cargo test` (`golden_vectors`) alike.

## Enabling decay / affinity — SHIPPED behind FEED_PRESET

```bash
FEED_PRESET=balanced  # default: legacy (bit-identical composite)
```

`balanced` = 0.35/0.35/0.15/0.1/0.05 with `lastSeenAt` mapped and interest
vectors resolved (viewer + candidates in ONE contents query, 32-tag global
vocabulary cached 5 minutes). Roll out as an A/B via env; `legacy` keeps
exact legacy behavior (proven by parity specs). Vectors:
`vectors/v1.json` (scoring) + `vectors/producer.v1.json` (vocabulary/vectors).

## Testing

- `pnpm test:feed` — 14 cases: golden vectors, hand-computed legacy parity,
  cosine/decay units, weight validation, edges.
- Backend contract spec pins reason cards and ordering in CI.
- `cargo test` in `rust/` — core units + golden vectors (CI job).

## Rust accelerator (`rust/`, napi-rs)

Math-identical core behind `score_candidates(candidates_json, options_json)`
(+ `self_test`, `crate_version`). Loaded opportunistically by
`@social-network/native` (`MSG_FEED=auto|ts|native`) with cross-check.

## Rules for contributors

1. Formula changes require a vector bump + product sign-off (scores are UX).
2. Keep the v1 preset byte-stable — A/B tests depend on it.
3. New features go behind zero-default weights first, exactly like recency.
