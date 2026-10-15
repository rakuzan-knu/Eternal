# Expo node-forge RSA verification backport

Expo SDK 52's CLI and `@expo/code-signing-certificates@0.0.6` depend on
`node-forge@1.4.0`. That version accepts non-canonical RSA PKCS#1 v1.5
DigestInfo encodings, including extra nested elements, content inside NULL
parameters and non-minimal lengths. These encodings provide attacker-controlled
slack relevant to [CVE-2026-85393 / GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv).

## Patch provenance

`patches/node-forge@1.4.0.patch` backports only `lib/rsa.js` from
[digitalbazaar/forge PR #1159](https://github.com/digitalbazaar/forge/pull/1159),
pinned to commit `db05494352dd3c9a5a07c5270333dcc78866cad2`. The installed
1.4.0 file matches that PR's base exactly, and the patched file matches its
head exactly. Its SHA-256 is
`c7b72e7ef41f4fc0e5228dce3e37851e9ca064c789365d5e392c25d1c5f6e710`.
The original package license and package name/version are preserved.

The verifier re-encodes the expected DigestInfo and checks its canonical bytes.
Both valid forms, with and without empty NULL parameters, remain accepted.
A nested element-count check alone is insufficient: a NULL can carry content
while the sequence still contains exactly two elements.

pnpm's exact-version `patchedDependencies` entry and lockfile patch hash apply
the change to both Expo consumers. Frozen installs preserve this patch; unused
or inapplicable patches are not silently allowed. CI runs `pnpm test:security`
after dependency installation or restoration from cache.

## Verification

`pnpm test:security` exercises the installed transitive dependency:

- Seven malformed encodings with valid PKCS#1 padding, for public exponents
  3 and 65537. Five encodings per exponent were accepted before this patch
  and are rejected afterward; existing outer-element/trailing-byte rejection
  is preserved.
- Canonical SHA-256 DigestInfo with and without NULL, incorrect digests,
  Node/OpenSSL SHA-256/384/512 signatures, RSA-PSS and raw NONE verification.
- Expo certificate/key PEM roundtrips, self-signed certificate validation,
  update-manifest signing with independent Node verification, tampered-message
  rejection and CSR verification.

The pinned upstream full unit suite also passed locally: 833 passing,
4 pending, with its existing deprecated `Buffer()` warning. Independent focused
review reproduced the difference between the element-count and canonical
encoding patches and checked Expo's verifier call sites.

The malformed fixtures use a private key to create controlled encodings. They
prove verifier rejection, not a complete private-key-free forgery. This remains
an unmerged upstream patch, rather than a published, maintainer-approved release.
The scope is the Node implementation used by Expo tooling; the package's browser
bundles are not rewritten or claimed to be protected by this backport.

## Remaining advisory and removal

GitHub Dependency Review and registry audits identify the original 1.4.0
version and may continue to flag it despite the installed-code fix. No advisory
exception, dependency renaming, fabricated release version or relaxed CI gate
is used. This backport therefore does not by itself make the PR merge-ready.

When upstream publishes an adequate fixed release, replace this exact-version
patch with that release, remove its patch entry/file, regenerate the lockfile
and update the original-version assertion in the security test. Rerun the
security tests and Expo build/export checks before removing the backport.
