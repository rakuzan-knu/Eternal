# Visual CI and Chromatic

## Automatic pull request checks

The [Storybook workflow](../../.github/workflows/storybook.yml) builds and retains a three-day HTML artifact when stories, components, global styles, public assets, imported shared packages, build configuration or dependencies change. An unchanged story can still render differently after its component or tokens change; filtering only `*.stories.tsx` would miss these regressions. Backend-only and documentation-only edits do not rebuild this artifact.

The [main CI workflow](../../.github/workflows/ci.yml) retains the Windows design screenshot, keyboard and browser-matrix checks. These are independent of Chromatic billing. See [scenarios](scenarios.md#executable-reference-coverage) for local commands and reviewed baseline updates.

The [Chromatic workflow](../../.github/workflows/chromatic.yml) has one automatic PR operation: `chromatic --skip`. With the project secret configured, it reports an explicit skipped/passing result for the PR head commit without building Storybook, uploading its contents, rendering snapshots or approving visual changes. It runs even for unrelated changes because omitting Chromatic entirely can leave its external `UI Tests` status pending. Fork PRs do not receive the project token or run this authenticated operation.

This skipped result is not evidence that Chromatic visual tests ran. The local CI checks provide automatic design verification; Chromatic publication is optional. There are no automatic Chromatic uploads on PRs or pushes, and the Storybook artifact workflow no longer uploads a second copy.

## Optional manual publication

After this workflow is available on the default branch, open **GitHub Actions → Chromatic → Run workflow**, select the branch and run it when cloud snapshots are wanted. The workflow builds Storybook once, then uploads that existing directory. It requires the `CHROMATIC_PROJECT_TOKEN` repository secret and available Chromatic quota. It does not automatically accept baselines. A manual publication may require review or remain pending when the quota is exhausted.

Chromatic may retain a skipped build/status entry for an automatic PR operation. It does not produce the full Storybook builds and snapshots that consumed the quota previously.

## Removing the external badge entirely

To stop Chromatic from adding `UI Tests` to PRs altogether, disable **UI Tests** on the Chromatic project's manage page. This is an account setting, separate from these workflows. If GitHub requires that external check, an administrator must also reconcile the requirement; disabling it in Chromatic alone can leave a required check waiting indefinitely. These changes do not alter branch protection.

References: [Chromatic skip configuration](https://www.chromatic.com/docs/configure/#skip), [PR status and exhausted quota behavior](https://www.chromatic.com/docs/mandatory-pr-checks/), [disabling UI Tests](https://www.chromatic.com/docs/quickstart/#frequently-asked-questions).
