# Zod collection size checks

Web, backend, mobile and shared contracts use the published Zod 4.6.7 release.
The backend formatter uses zod-validation-error 5, whose default entry supports
Zod 4 issues, including nested unions. The lockfile retains the local patch for
Zod 3.25.76 used by transitive tooling dependencies; application dependencies are
not forced back to v3 or globally overridden to v4.

The retained v3 patch adapts the early upper-bound rejection from
[upstream PR 6652](https://github.com/colinhacks/zod/pull/6652), merged as
`e06a510b6fc1e6e28e3201fd116ca2a76212f6be`, to Zod 3's parser. It is a local
backport, not an upstream Zod 3 release or a claim that every Zod advisory is fixed.
The dependency's upstream MIT license continues to apply.

## Scope and compatibility

Oversized arrays with `.max()` or `.length()` and sets with `.max()` or `.size()`
return an invalid parse result before parsing children. Source, CommonJS and ESM
implementations receive the same change. Both synchronous and asynchronous paths
are covered. Lower bounds and accepted-input transformations remain unchanged.

An oversized collection reports its size error without child errors. Refinements
and transformations after that invalid parse do not run. This intentionally
changes error aggregation for rejected inputs to avoid unbounded child parsing
and issue allocation despite a declared upper bound.
Failed unions can consequently report `invalid_union` instead of a direct size
issue. Consumers must not depend on the previous error shape for those inputs.

Unbounded collections, input JSON decoding, preprocessing before the collection,
and arbitrary user refinements are outside this mitigation. Zod 3 maps do not
offer the equivalent upper-bound API; this patch does not add one. Callers still
need request size limits and appropriate bounds on accepted collections.
The embedded `zod/v4` entry point inside the 3.25.76 distribution is not patched;
this backport covers its v3 API only.

Version-only scanners can continue to report Zod 3.25.76. Do not suppress all
Zod findings or describe this backport as a clean dependency audit. Replace it
with an upstream fixed compatible release when one is available, or migrate
callers to Zod 4 with contract verification.

## Verification

`pnpm test:security` resolves the actual backend Zod 4 package in both CommonJS
and ESM formats. The collection tests check oversized sync/async parsing with child
call counters, error paths/messages, accepted transforms, lower bounds, in-bound
child errors and union alternatives. Frozen pnpm installs also verify the retained
v3 patch hash. Backend compatibility tests cover omitted optional fields, partial
updates without inserted creation defaults, optional unknown call fields,
explicit authentication messages, record keys and nested union HTTP error
status/shape/paths. Existing UUID-like
contracts use `.guid()` to preserve v3 acceptance rather than adopt v4's stricter
UUID variant checks. Standard generated Zod error wording may differ from v3;
explicit application messages remain unchanged.
