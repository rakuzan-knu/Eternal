# @social-network/text-pipeline — portable text pipeline v1

One-pass user-text processing for every client: **sanitize (XSS-safe) +
linkify + `@mention` / `#hashtag` extraction + spam triage**. Pure string
scanning, zero dependencies, no Node APIs — web, React Native / Hermes,
Electron renderer/preload, and Node.js.

The backend consumes it through `TextPipelineService`
(`backend/src/common/text-pipeline/`) with an optional Rust prebuild behind
the same signatures (see `@social-network/native` accelerators).

## API

```ts
import { processText } from '@social-network/text-pipeline';

const r = processText('Hello @alex, see https://example.com #hi', { mode: 'rich' });
// r.text      — sanitized plain text
// r.html      — allowlisted HTML with autolinked URLs
// r.mentions  — ['alex'] (+ mentionSpans with UTF-16 offsets)
// r.hashtags  — ['#hi']  (+ hashtagSpans)
// r.links     — [{ value, start, end, url }]
// r.spam      — { score: 0..1, reasons: [...] }
// r.capped    — any cap exceeded (caller maps to product rules)
// r.truncated — input exceeded maxLength
```

Granular exports: `sanitizeText`, `sanitizeRich`, `findLinks`,
`extractMentions` / `extractHashtags` (+ `*Spans` variants),
`scoreSpamText`, `isSafeHttpUrl`, `escapeHtml`.

Extraction semantics mirror the legacy backend scanners exactly (proven by the
backend parity spec): `@` needs start-or-punctuation boundary, `#` matches
anywhere, Cyrillic tags supported, values truncated to legacy limits.

## Measured results (portable TS core)

`pnpm bench:text` · Node v24.19.0, win32-x64, Ryzen 5 7235HS · per-op `hrtime`.
Legacy = `sanitize-html` + legacy scanners ported verbatim.

| Case              | Op          | Legacy mean (p99)     | New mean (p99)       | Speedup      |
| ----------------- | ----------- | --------------------- | -------------------- | ------------ |
| strip-all/post    | sanitize    | 4.02 µs (10.10 µs)    | 0.53 µs (1.30 µs)    | **x7.60**    |
| strip-all/bio     | sanitize    | 18.67 µs (54.50 µs)   | 3.20 µs (7.40 µs)    | **x5.83**    |
| strip-all/5k-html | sanitize    | 272.26 µs (611.50 µs) | 83.86 µs (190.00 µs) | **x3.25**    |
| rich/post         | sanitize    | 4.08 µs (10.40 µs)    | 0.38 µs (0.80 µs)    | **x10.67**   |
| rich/xss          | sanitize    | 28.18 µs (81.50 µs)   | 8.86 µs (21.60 µs)   | **x3.18**    |
| extract/post      | mentions    | 1.21 µs (2.90 µs)     | 1.23 µs (3.10 µs)    | x0.98 parity |
| extract/post      | hashtags    | 1.25 µs (2.90 µs)     | 1.11 µs (2.30 µs)    | x1.13 parity |
| combo/post        | san+extr    | 9.91 µs (24.90 µs)    | 3.63 µs (8.80 µs)    | **x2.73**    |
| full/post         | prc+spam    | 9.53 µs (22.70 µs)    | 11.32 µs (26.50 µs)  | x0.84 +spam  |
| fuzzy/names       | levenshtein | 25.80 µs (63.40 µs)   | 0.71 µs (1.80 µs)    | **x36.35**   |
| fuzzy/64ch        | levenshtein | 47.01 µs (115.40 µs)  | 8.77 µs (38.70 µs)   | **x5.36**    |

Reading the table honestly: sanitize wins big (no HTML parser startup, tight scans); the re-escape pass for
sanitize-html byte-parity costs ~2x on plain text and is worth every nanosecond of it. Extraction was already an
optimal loop — the win there is structural (no ReDoS surface, no time-budget wrapper, UTF-16 spans for clients),
not speed. Spam scoring is a **new capability** the legacy path lacks. Fuzzy search is the standout (x36/x5.4).

Full machine-readable baseline: `benches/report.json`.

## Conformance contract (`vectors/`)

`vectors/v1.json` is the cross-language authority (see msg-codec pattern):
golden pipeline outputs incl. spans, links, spam scores. Cases tagged
`"rust"` run in `cargo test` too; rich-HTML rendering cases may stay
TS-only with `"implementations": ["ts"]`. Spans are UTF-16 code-unit offsets.

## Testing

- `pnpm test:text` — 43 `node:test` cases: golden vectors, XSS attack battery
  (script/event-handler/`javascript:`/malformed markup, both modes), rich
  idempotence, caps/truncation/edges.
- Backend parity spec proves legacy-scanner equivalence on a fixed corpus.
- `cargo test` in `rust/` — Rust core unit + golden-vector tests (CI job).

## Rust accelerator (`rust/`, napi-rs)

Mirrors the TS core (extract/linkify/sanitize-text/spam; rich rendering stays
TS-only in v1 — enforced by the `implementations` tags). napi surface:
`process_text(input, options_json) -> JSON`, `sanitize_text`,
`extract_mentions`, `extract_hashtags`. Loaded opportunistically by
`@social-network/native` (`MSG_TEXT=auto|ts|native`) with cross-check.

## Fuzzy matching (similarity)

`levenshtein(a, b, maxDist)` (bounded Ukkonen band + length gate — exact
within the cap), `trigramProfile` / `trigramDice`, and `rankFuzzy` (trigram
order, Levenshtein-verified cutoff). Powers backend user search; the Dice
score is a _ranking_ signal only, never a correctness gate (documented
counterexample in `similarity.ts`). Vectors: `vectors/similarity.v1.json`.

| Case                       | Legacy mean | New mean | Speedup    |
| -------------------------- | ----------- | -------- | ---------- |
| fuzzy/names (10×usernames) | 24.08 µs    | 0.79 µs  | **x30.35** |
| fuzzy/64ch worst case      | 43.47 µs    | 10.42 µs | **x4.17**  |

## Rules for contributors

1. No regex with backtracking risk, no `Buffer`/`node:*`/`process.env` in `src/`.
2. Extraction semantics are frozen by the parity spec — change them only with
   a corpus + vector bump and backend sign-off.
3. Spam weights change only with a labeled corpus; vectors lock the scores.
