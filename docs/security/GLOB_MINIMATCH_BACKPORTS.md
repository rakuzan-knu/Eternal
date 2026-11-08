# Glob cancellation and minimatch preprocessing backports

The application lockfile retains minimatch 9.0.9, 10.2.5 and 10.2.6 and glob
10.5.0 and 13.0.6. Five pnpm patches backport two upstream fixes without changing
the published versions, package exports, or legacy matching/walking APIs.

- [minimatch 77a0f5c](https://github.com/isaacs/minimatch/commit/77a0f5c4b80bdc641c3c930a1d9edf5ad2db57f8)
  limits level-two `**/..` splitting to `braceExpandMax` (default 100,000) and
  skips the quadratic second-phase deduplication pass above 1,000 patterns.
  The check happens before another pattern is pushed. This bounds that
  optimization; it is not a general resource limit for every possible pattern.
- [glob 4682e8c](https://github.com/isaacs/node-glob/commit/4682e8c9babee1b385202ede36389634e12076d7)
  returns the completion callback immediately in all four aborted walker paths.
  Its `onResume` change is also included; the separate aborted `resume` guard
  remains intact. Already issued filesystem calls can finish, but the aborted
  walk must not start further directory reads.

## Published entry points

All three minimatch versions receive the same runtime guard in CommonJS and
ESM. The v9 declaration additionally exposes the optional preprocessing ceiling;
it does not change v9's existing brace-expansion API.

Both glob versions have patched CommonJS and ESM walkers. Glob 13's default
exports are self-contained `index.min.js` bundles: both receive the walker fix
and the embedded minimatch guards as well. Its separate `glob/raw` exports
continue to use the patched walkers and external minimatch dependency.
No package exports were redirected and no dependency bundle was regenerated.

Source maps were composed from exact textual edits and the published maps using
the already installed magic-string and @jridgewell/remapping tools. Existing
upstream TypeScript `sourcesContent` is preserved; inserted guards map to the
original function context rather than a newly generated TypeScript source.
Regression checks verify that subsequent matching/walking methods still map to
their original source lines. Map payloads account for most of the patch size.
The original packages' ISC licenses remain applicable.

## Verification and limits

`pnpm test:security` resolves the installed packages through real consumers:
Electron universal (v9), Nx (10.2.5), Stryker (10.2.6), Expo (glob 10) and Nest
CLI (glob 13). It exercises CommonJS/ESM and both default/raw glob 13 exports.
Adversarial pattern compilation runs only in child processes, each with a
20-second timeout, a 512 MiB V8 heap ceiling and bounded output. Tests cover
16/64-pattern ceilings, the default preprocessing ceiling, large-set deduplication,
normal four-branch matching, legacy `set`/`makeRe`, UNC/dot/noglobstar behavior,
exact abort reasons, read counters, completion callbacks and paused streams.
Frozen installs validate the committed patch hashes.

These are local backports, not upstream releases. Version-based dependency
scanners can continue to report the original versions. GitHub alerts are not
automatically dismissed, and these patches do not establish that every advisory
for these packages is fixed. Review remaining findings individually and replace
the backports with compatible upstream releases when available.

## Separate deepmerge advisory

The installed package is `deepmerge`, version 4.3.1.
The [CVE Project record for CVE-2026-93753](https://raw.githubusercontent.com/CVEProject/cvelistV5/main/cves/2026/93xxx/CVE-2026-93753.json)
was marked `REJECTED` on 2026-11-02 because the reported behavior does not describe
a security vulnerability. This primary-source status conflicts with the stale
GitHub advisory observed during this review; it does not mean the GitHub alert
has been closed or that other deepmerge findings can be ignored.
