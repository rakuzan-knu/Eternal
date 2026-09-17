# 📐 Architecture Decision Records (ADR)

Architecture Decision Records (ADRs) capture significant architectural decisions, their context, rationale, and consequences. They provide durable historical context for new contributors and team members.

---

## 📋 ADR Registry

| ADR                                                                 | Title                                                             | Status       | Date    | Primary Driver                    |
| :------------------------------------------------------------------ | :---------------------------------------------------------------- | :----------- | :------ | :-------------------------------- |
| **[ADR 001](001-monorepo-nx-and-zod-contracts.md)**                 | Monorepo Hardening with Nx & Single-Source-of-Truth Zod Contracts | **Accepted** | 2026-08 | Performance & Type Safety         |
| **[ADR 002](002-zero-packages-folder-and-path-aliases.md)**         | Zero-Package Monorepo Topology via Direct Path Aliases            | **Accepted** | 2026-08 | Developer Experience & Simplicity |
| **[ADR 003](003-supply-chain-security-and-cosign.md)**              | Software Supply Chain Hardening with Cosign, SBOM, and Trivy      | **Accepted** | 2026-08 | Security & Compliance             |
| **[ADR 004](004-correlation-id-and-observability-architecture.md)** | Unified Correlation ID and Observability Pipeline                 | **Accepted** | 2026-08 | Reliability & SRE                 |

---

## 🎯 ADR Lifecycle & Statuses

- **Proposed**: Under community review and discussion in GitHub Discussions or a Pull Request.
- **Accepted**: Approved by maintainers and actively implemented in the codebase.
- **Superseded**: Replaced by a newer ADR (must include reciprocal link to the replacing ADR).
- **Rejected**: Discussed and declined with recorded rationale.

---

## ✍️ How to Propose a New ADR

1. Create a new file in `docs/adr/` named with sequential 3-digit numbering:
   ```text
   docs/adr/005-<kebab-case-title>.md
   ```
2. Follow our standard ADR template:
   - **Title**: `# ADR XXX: <Concise Title>`
   - **Status**: `Proposed`
   - **Context**: The problem, constraints, and forces at play.
   - **Decision**: The chosen technical approach and alternatives considered.
   - **Consequences**: Positive benefits, negative trade-offs, and maintenance obligations.
3. Open a Pull Request for community review.
