# Expo node-forge RSA verification

Expo SDK 52's CLI and `@expo/code-signing-certificates@0.0.6` resolve to
`node-forge@1.4.1` through the root override and frozen lockfile.
The published [upstream release](https://github.com/digitalbazaar/forge/releases/tag/v1.4.1)
includes canonical DER DigestInfo verification and additional PEM, PKCS#12
and TLS fixes.

The earlier 1.4.0 backport has been removed. The security regression suite
continues to exercise the actual transitive package used by both Expo consumers.

## Verification contract

`pnpm test:security` checks both consumers resolve the same 1.4.1 package and
exercises seven malformed DigestInfo encodings for public exponents 3 and 65537.
It also checks canonical forms with and without NULL parameters, incorrect
digests, Node/OpenSSL SHA-256/384/512 signatures, RSA-PSS and raw NONE verification.

Expo checks cover certificate/key PEM roundtrips, self-signed certificate
validation, update-manifest signing with independent Node verification,
tampered-message rejection and CSR verification. The controlled malformed
fixtures use a private key to test verifier rejection.

Run these regressions and the Expo export after changing the resolved version.
The package's upstream license applies to the installed release.
