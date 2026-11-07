import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { load } from 'js-yaml';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const stepSchema = z
  .object({
    name: z.string().optional(),
    uses: z.string().optional(),
    run: z.string().optional(),
    env: z.record(z.string(), z.string()).optional(),
    with: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
const jobSchema = z
  .object({
    if: z.string().optional(),
    permissions: z.record(z.string(), z.string()).optional(),
    steps: z.array(stepSchema),
  })
  .passthrough();
const workflowSchema = z.object({
  permissions: z.record(z.string(), z.string()),
  jobs: z.record(z.string(), jobSchema),
});
type Job = z.infer<typeof jobSchema>;

async function workflow(name: string) {
  const text = await readFile(
    resolve(import.meta.dirname, '../../../.github/workflows', name),
    'utf8',
  );
  return workflowSchema.parse(load(text));
}

function secretExpressionValue(
  expression: string,
  event: string,
  publish: string,
  secret: (name: string) => string,
): string | boolean {
  const source = expression.replace(/^\$\{\{\s*|\s*\}\}$/g, '');
  const atom = (value: string): string | boolean => {
    if (/^'[^']*'$/.test(value)) return value.slice(1, -1);
    if (value === 'github.event_name') return event;
    if (value === 'needs.prepare.outputs.publish') return publish;
    if (/^secrets\.[A-Z_]+$/.test(value)) return secret(value.slice('secrets.'.length));
    const comparison = /^(.*?)\s+(==|!=)\s+(.*?)$/.exec(value);
    if (comparison) {
      const equal = atom(comparison[1]) === atom(comparison[3]);
      return comparison[2] === '==' ? equal : !equal;
    }
    throw new Error(`Unsupported workflow expression atom: ${value}`);
  };
  for (const alternatives of source.split(/\s+\|\|\s+/)) {
    let result: string | boolean = true;
    for (const term of alternatives.split(/\s+&&\s+/)) {
      if (!result) break;
      result = atom(term);
    }
    if (result) return result;
  }
  return '';
}

describe('desktop workflow trust boundaries', () => {
  it.each(['desktop.yml', 'desktop-stores.yml'])(
    '%s runs the dependency-free provenance gate from workflow code before the resolved source',
    async (filename) => {
      const current = await workflow(filename);
      expect(current.permissions).toEqual({ contents: 'read' });
      const prepare = current.jobs.prepare;
      expect(prepare).toBeDefined();
      if (!prepare) throw new Error('Missing source gate');
      const checkout = prepare.steps.find((step) => step.uses?.startsWith('actions/checkout@'));
      expect(checkout?.with?.ref).toBe('${{ github.workflow_sha }}');
      expect(checkout?.with?.['persist-credentials']).toBe(false);
      const gate = prepare.steps.find(
        (step) => step.run === 'node apps/desktop/scripts/release-source.ts',
      );
      expect(gate?.env?.TRUSTED_WORKFLOW_SHA).toBe('${{ github.workflow_sha }}');
      expect(prepare.steps.some((step) => /pnpm (?:install|exec)/.test(step.run ?? ''))).toBe(
        false,
      );
      for (const step of prepare.steps) expect(JSON.stringify(step)).not.toMatch(/secrets\./);
      if (filename === 'desktop-stores.yml') expect(gate?.env?.STABLE_ONLY).toBe('true');
    },
  );

  it.each(['desktop.yml', 'desktop-stores.yml'])(
    '%s never restores or saves dependency caches from resolved checkout jobs',
    async (filename) => {
      const current = await workflow(filename);
      for (const job of Object.values(current.jobs)) {
        for (const step of job.steps) {
          if (step.uses?.startsWith('actions/setup-node@')) {
            expect(step.with?.cache).toBeUndefined();
            expect(step.with?.['package-manager-cache']).toBe(false);
          }
          expect(step.uses?.startsWith('actions/cache')).not.toBe(true);
        }
      }
    },
  );

  it('does not resolve signing secrets for PR packages even with a forged publish output', async () => {
    const current = await workflow('desktop.yml');
    const build = current.jobs.build;
    if (!build) throw new Error('Missing build job');
    const signing = build.steps.find(
      (step) => step.name === 'Package each distribution without publishing',
    );
    const env = signing?.env;
    if (!env) throw new Error('Missing package environment');
    const secret = vi.fn((name: string) => `private-${name}`);
    const keys = [
      'CSC_LINK',
      'CSC_KEY_PASSWORD',
      'WIN_CSC_LINK',
      'WIN_CSC_KEY_PASSWORD',
      'APPLE_ID',
      'APPLE_APP_SPECIFIC_PASSWORD',
      'APPLE_TEAM_ID',
    ];
    for (const key of keys) {
      const expression = env[key];
      if (!expression) throw new Error(`Missing protected signing field ${key}`);
      expect(secretExpressionValue(expression, 'pull_request', 'false', secret)).toBe('');
      expect(secretExpressionValue(expression, 'pull_request', 'true', secret)).toBe('');
      expect(secretExpressionValue(expression, 'workflow_dispatch', 'false', secret)).toBe('');
    }
    expect(secret).not.toHaveBeenCalled();
    expect(secretExpressionValue(env.CSC_LINK, 'workflow_dispatch', 'true', secret)).toBe(
      'private-CSC_LINK',
    );
    expect(secret).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(current)).not.toContain('CSC_FOR_PULL_REQUEST');
  });

  it('keeps write-token publication on workflow code and reverifies API provenance before secrets', async () => {
    const current = await workflow('desktop.yml');
    const publish: Job | undefined = current.jobs.publish;
    if (!publish) throw new Error('Missing publication job');
    expect(publish.if).toContain("github.event_name != 'pull_request'");
    expect(publish.if).toContain('github.ref_protected');
    const checkout = publish.steps.find((step) => step.uses?.startsWith('actions/checkout@'));
    expect(checkout?.with?.ref).toBe('${{ github.workflow_sha }}');
    expect(checkout?.with?.['persist-credentials']).toBe(false);
    const gateIndex = publish.steps.findIndex(
      (step) => step.name === 'Reverify release provenance before using signing credentials',
    );
    const signingIndex = publish.steps.findIndex((step) => step.env?.GPG_PRIVATE_KEY !== undefined);
    expect(gateIndex).toBeGreaterThanOrEqual(0);
    expect(signingIndex).toBeGreaterThan(gateIndex);
    expect(publish.steps[gateIndex]?.env?.EXPECTED_COMMIT).toBe(
      '${{ needs.prepare.outputs.commit }}',
    );
    expect(publish.steps[gateIndex]?.run).toBe('node apps/desktop/scripts/release-source.ts');
    const attach = publish.steps.find(
      (step) => step.name === 'Attach assets to existing semantic-release release',
    );
    expect(attach?.run).toContain('node apps/desktop/scripts/release-source.ts');
    expect(attach?.run).not.toMatch(/git (?:fetch|checkout|rev-parse)/);
    for (const [name, job] of Object.entries(current.jobs))
      if (name !== 'publish') expect(job.permissions?.contents).not.toBe('write');
  });
});
