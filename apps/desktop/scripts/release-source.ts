import { execFileSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export interface ReleaseSourceInput {
  event: string;
  ref: string;
  refProtected: boolean;
  repository: string;
  workflowSha: string;
  runSha: string;
  tag?: string;
  expectedCommit?: string;
  stableOnly?: boolean;
}

export interface ReleaseSource {
  version: string;
  tag: string;
  commit: string;
  branch: 'main' | 'develop' | '';
  publish: boolean;
}

type GithubApi = (endpoint: string) => Promise<unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function object(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('Invalid GitHub provenance response');
  return value;
}

function commitSha(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{40}$/.test(value))
    throw new Error('Invalid provenance commit');
  return value;
}

async function tagCommit(api: GithubApi, base: string, tag: string): Promise<string> {
  let target = object(object(await api(`${base}/git/ref/tags/${tag}`)).object);
  for (let depth = 0; depth < 10; depth++) {
    const sha = commitSha(target.sha);
    if (target.type === 'commit') return sha;
    if (target.type !== 'tag') throw new Error('Release tag must resolve to a commit');
    target = object(object(await api(`${base}/git/tags/${sha}`)).object);
  }
  throw new Error('Too many nested release tags');
}

async function assertAncestor(
  api: GithubApi,
  base: string,
  ancestor: string,
  branchHead: string,
): Promise<void> {
  const comparison = object(await api(`${base}/compare/${ancestor}...${branchHead}`));
  if (
    !['identical', 'ahead'].includes(String(comparison.status)) ||
    comparison.behind_by !== 0 ||
    object(comparison.merge_base_commit).sha !== ancestor
  )
    throw new Error('Release source is not an ancestor of its trusted branch');
}

export async function verifyReleaseSource(
  input: ReleaseSourceInput,
  api: GithubApi,
): Promise<ReleaseSource> {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(input.repository))
    throw new Error('Invalid GitHub repository');
  if (input.event === 'pull_request') {
    if (input.expectedCommit || input.stableOnly)
      throw new Error('Pull requests cannot publish release packages');
    return {
      version: '0.0.0',
      tag: '',
      commit: commitSha(input.runSha),
      branch: '',
      publish: false,
    };
  }
  if (!['workflow_dispatch', 'push', 'workflow_call'].includes(input.event))
    throw new Error('Unsupported release workflow event');
  const match = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-beta\.(0|[1-9]\d*))?$/.exec(
    input.tag ?? '',
  );
  if (!match) throw new Error('Unsupported release tag');
  const tag = match[0];
  const beta = Boolean(match[4]);
  if (input.stableOnly && (beta || match[1] === '0'))
    throw new Error('Store packages require a stable release >= 1.0.0');
  const branch = beta ? 'develop' : 'main';
  if (input.ref !== `refs/heads/${branch}` || !input.refProtected)
    throw new Error('Run the release workflow from its protected release branch');
  const base = `repos/${input.repository}`;
  const branchInfo = object(await api(`${base}/branches/${branch}`));
  if (branchInfo.name !== branch || branchInfo.protected !== true)
    throw new Error('The release branch must exist and be protected');
  const branchHead = commitSha(object(branchInfo.commit).sha);
  await assertAncestor(api, base, commitSha(input.workflowSha), branchHead);
  const release = object(await api(`${base}/releases/tags/${tag}`));
  if (release.tag_name !== tag || release.draft !== false || release.prerelease !== beta)
    throw new Error('Release status does not match its stable/beta channel');
  const commit = await tagCommit(api, base, tag);
  if (input.expectedCommit && commit !== commitSha(input.expectedCommit))
    throw new Error('The release tag changed after source verification');
  await assertAncestor(api, base, commit, branchHead);
  return { version: tag.slice(1), tag, commit, branch, publish: true };
}

async function githubApi(endpoint: string): Promise<unknown> {
  return JSON.parse(
    execFileSync('gh', ['api', endpoint], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const source = await verifyReleaseSource(
      {
        event: process.env.GITHUB_EVENT_NAME ?? '',
        ref: process.env.GITHUB_REF ?? '',
        refProtected: process.env.GITHUB_REF_PROTECTED === 'true',
        repository: process.env.GITHUB_REPOSITORY ?? '',
        workflowSha: process.env.TRUSTED_WORKFLOW_SHA ?? '',
        runSha: process.env.GITHUB_SHA ?? '',
        ...(process.env.REQUESTED_TAG ? { tag: process.env.REQUESTED_TAG } : {}),
        ...(process.env.EXPECTED_COMMIT ? { expectedCommit: process.env.EXPECTED_COMMIT } : {}),
        stableOnly: process.env.STABLE_ONLY === 'true',
      },
      githubApi,
    );
    const output = process.env.GITHUB_OUTPUT;
    if (!output) throw new Error('Missing workflow output destination');
    await appendFile(
      output,
      Object.entries(source)
        .map(([key, value]) => `${key}=${value}\n`)
        .join(''),
    );
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message.split('\n')[0] : 'Release provenance failed'}\n`,
    );
    process.exitCode = 1;
  }
}
