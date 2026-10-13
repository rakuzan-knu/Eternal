import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import test from 'node:test';
import { load } from 'js-yaml';

const workflowsDir = new URL('../../../.github/workflows/', import.meta.url);
const workflows = readdirSync(workflowsDir)
  .filter((file) => /\.ya?ml$/.test(file))
  .map((file) => ({
    file,
    workflow: load(readFileSync(new URL(file, workflowsDir), 'utf8')),
  }));
const chromatic = workflows.find(({ file }) => file === 'chromatic.yml').workflow;
const storybook = workflows.find(({ file }) => file === 'storybook.yml').workflow;
const steps = Object.values(chromatic.jobs).flatMap((job) => job.steps ?? []);

test('there is one snapshot publisher and it is manual, with no push-triggered duplicate', () => {
  const publishers = workflows.flatMap(({ file, workflow }) =>
    Object.values(workflow.jobs).flatMap((job) =>
      (job.steps ?? [])
        .filter(
          (step) =>
            (/\b(?:exec|npx)\s+chromatic\b/.test(step.run ?? '') && !/--skip\b/.test(step.run)) ||
            (step.uses?.startsWith('chromaui/action@') && step.with?.skip !== true),
        )
        .map((step) => ({ file, step })),
    ),
  );
  assert.equal(publishers.length, 1);
  assert.equal(publishers[0].step.if, "github.event_name == 'workflow_dispatch'");
  assert.ok('workflow_dispatch' in chromatic.on);
  assert.ok(!('push' in chromatic.on));
  assert.match(publishers[0].step.run, /--storybook-build-dir=/);
  assert.doesNotMatch(publishers[0].step.run, /--build-script-name|--auto-accept-changes/);
});

test('PRs explicitly settle Chromatic status without rendering or rebuilding snapshots', () => {
  assert.ok('pull_request' in chromatic.on);
  assert.ok(!('paths' in chromatic.on.pull_request));
  const skipSteps = steps.filter((step) => /\bchromatic\b.*--skip\b/.test(step.run ?? ''));
  assert.equal(skipSteps.length, 1);
  assert.match(skipSteps[0].if, /github\.event_name == 'pull_request'/);
  const builds = steps.filter((step) => /\brun build:storybook\b/.test(step.run ?? ''));
  assert.equal(builds.length, 1);
  assert.equal(builds[0].if, "github.event_name == 'workflow_dispatch'");
  const job = Object.values(chromatic.jobs)[0];
  assert.match(job.if, /head\.repo\.full_name == github\.repository/);
  assert.equal(job.env.CHROMATIC_SHA, '${{ github.event.pull_request.head.sha || github.sha }}');
  assert.equal(
    steps.find((step) => step.uses?.startsWith('actions/checkout@')).with.ref,
    job.env.CHROMATIC_SHA,
  );
});

test('PR Storybook still builds and publishes a local artifact without a second Chromatic upload', () => {
  const storybookSteps = Object.values(storybook.jobs).flatMap((job) => job.steps ?? []);
  assert.ok(storybookSteps.some((step) => /\brun build:storybook\b/.test(step.run ?? '')));
  assert.ok(storybookSteps.some((step) => step.uses?.startsWith('actions/upload-artifact@')));
  assert.ok(storybookSteps.every((step) => !/\bexec chromatic\b/.test(step.run ?? '')));
  assert.ok(storybookSteps.some((step) => step.run?.includes('chromatic-workflow.test.mjs')));
});

const paths = storybook.on.pull_request.paths;
const affected = (file) => paths.some((pattern) => posix.matchesGlob(file, pattern));

test('Storybook responds to stories, components, global styles, assets and runtime package inputs', () => {
  for (const file of [
    'apps/web/src/shared/ui/Button.stories.tsx',
    'apps/web/src/shared/ui/Button.tsx',
    'apps/web/src/index.css',
    'apps/web/.storybook/preview.tsx',
    'apps/web/public/mockServiceWorker.js',
    'apps/web/public/icons/favicon.png',
    'apps/web/package.json',
    'apps/web/vite.config.ts',
    'apps/web/tsconfig.app.json',
    'packages/shared/ui-primitives/src/tokens.ts',
    'packages/shared/contracts/src/index.ts',
    'packages/shared/socket/src/events.ts',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'tsconfig.base.json',
    '.npmrc',
    '.nvmrc',
    '.github/workflows/storybook.yml',
    '.github/workflows/chromatic.yml',
  ]) {
    assert.ok(affected(file), `Missing Storybook input: ${file}`);
  }
});

test('backend and documentation edits do not rebuild the standalone Storybook artifact', () => {
  for (const file of [
    'apps/backend/src/users/users.service.ts',
    'apps/backend/prisma/schema.prisma',
    'docs/design/foundations.md',
    'docs/architecture/frontend.md',
    'README.md',
  ]) {
    assert.ok(!affected(file), `Unrelated Storybook input: ${file}`);
  }
});
