# Eternal licensing and contributions

The proprietary terms for Eternal are set out in [LICENSE.md](../../LICENSE.md). All rights reserved. Use of proprietary code, protected design assets, or brand materials requires the authorization specified in that notice.

## Contributions

Read Section 7 of the license before submitting code, documentation, artwork, or other material for inclusion. Unless a separate written agreement provides otherwise, the contributor license takes effect when an intentionally submitted Contribution is accepted under those terms. It authorizes proprietary distribution, modification, commercial use, transfer, and sublicensing, without further consent or payment, subject to applicable law.

Confirm the contribution terms and authority to submit in the [pull request template](../../.github/pull_request_template.md). Identify third-party components and their licenses before acceptance. Contributions must not impose incompatible restrictions. Acceptance of a contribution does not grant its author permission to use Eternal proprietary materials.

## Third-party components

Third-party components and fonts retain their applicable licenses and attribution requirements. Project-maintained attributions are in [licensesData.ts](../../apps/web/src/pages/Licenses/data/licensesData.ts); preserve the relevant upstream notices and license files in distributions.

## Package metadata

Private workspace npm packages declare `UNLICENSED`. Native Rust manifests reference the repository license through `license-file` and disable registry publication with `publish = false`. These declarations are subject to the governing terms in LICENSE.md.
