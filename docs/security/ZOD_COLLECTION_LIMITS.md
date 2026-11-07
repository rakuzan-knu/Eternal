# Zod collection size checks

The web client uses the published Zod 4.6.7 release. Backend, mobile and shared
contracts retain Zod 3.25.76 for API compatibility, with a local pnpm patch.

The patch adapts the early upper-bound rejection from
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

`pnpm test:security` resolves the actual backend Zod package in both CommonJS and
ESM formats. The collection tests check oversized sync/async parsing with child
call counters, error paths/messages, accepted transforms, lower bounds, in-bound
child errors and union alternatives. Frozen pnpm installs verify the patch hash.
