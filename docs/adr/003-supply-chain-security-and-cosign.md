# ADR 003: Supply Chain Security, SBOM Generation & Cosign Artifact Signing

## Status

Accepted

## Context

Modern software supply chains face risks from unverified third-party dependencies, malicious postinstall scripts, tampered container images, and untracked software bill of materials (SBOM).

## Decision

1. **Package Lifecycle Lockdown**:
   - Explicitly configure `allowScripts` in `package.json` to only allow audited native build hooks (`@swc/core`, `nx`, `prisma`, `esbuild`).
   - Configure `.npmrc` with `engine-strict=true`, `strict-peer-dependencies=true`, and `shamefully-hoist=true`.
2. **Container & Artifact Signing**:
   - Integrate **Cosign** (`sigstore/cosign-installer`) in CI workflows for keyless signing of release containers and SBOM artifacts using GitHub OIDC tokens.
   - Generate CycloneDX SBOMs via **Trivy** during Docker build steps.
   - Sign SBOM and provenance bundles with Cosign without requiring proprietary SaaS solutions.
3. **Vulnerability Scanning**:
   - Run Trivy vulnerability scanning across container images in CI and export SARIF reports to GitHub Security CodeQL tab.

## Consequences

### Positive

- Verifiable provenance and tamper-evident container image releases.
- Automated security compliance tracking without recurring SaaS license costs.
- Protection against unauthorized script execution during dependency installation.

### Negative / Trade-offs

- CI pipeline requires `id-token: write` permission to utilize GitHub Actions OIDC identity for keyless signing.
