import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
import { verifyReleaseSource } from './release-source';
import type { ReleaseSourceInput } from './release-source';

const sourceSha = 'a'.repeat(40);
const workflowSha = 'b'.repeat(40);
const branchSha = 'c'.repeat(40);
const tagSha = 'd'.repeat(40);
const root = 'repos/rakuzan-knu/Eternal';

function fixture(beta = false) {
  const tag = beta ? 'v1.2.3-beta.1' : 'v1.2.3';
  const branch = beta ? 'develop' : 'main';
  const input: ReleaseSourceInput = {
    event: 'workflow_dispatch',
    ref: `refs/heads/${branch}`,
    refProtected: true,
    repository: 'rakuzan-knu/Eternal',
    workflowSha,
    runSha: workflowSha,
    tag,
  };
  const responses = new Map<string, unknown>([
    [`${root}/branches/${branch}`, { name: branch, protected: true, commit: { sha: branchSha } }],
    [
      `${root}/compare/${workflowSha}...${branchSha}`,
      { status: 'ahead', behind_by: 0, merge_base_commit: { sha: workflowSha } },
    ],
    [`${root}/releases/tags/${tag}`, { tag_name: tag, draft: false, prerelease: beta }],
    [`${root}/git/ref/tags/${tag}`, { object: { type: 'commit', sha: sourceSha } }],
    [
      `${root}/compare/${sourceSha}...${branchSha}`,
      { status: 'ahead', behind_by: 0, merge_base_commit: { sha: sourceSha } },
    ],
  ]);
  const api = vi.fn(async (endpoint: string): Promise<unknown> => {
    if (!responses.has(endpoint)) throw new Error('Unexpected GitHub API request');
    return responses.get(endpoint);
  });
  return { input, api, responses, branch, tag };
}

describe('release source authorization', () => {
  it('keeps stable and beta aligned with the actual semantic-release branch policy', async () => {
    const require = createRequire(import.meta.url);
    const release: unknown = require('../../../release.config.cjs');
    expect(release).toMatchObject({
      branches: ['main', { name: 'develop', prerelease: 'beta', channel: 'beta' }],
    });
    for (const beta of [false, true]) {
      const { input, api, branch, tag } = fixture(beta);
      expect(await verifyReleaseSource(input, api)).toEqual({
        version: tag.slice(1),
        tag,
        commit: sourceSha,
        branch,
        publish: true,
      });
    }
  });

  it('never authorizes PR publication or accesses privileged release APIs for PR code', async () => {
    const { input, api } = fixture();
    const preview = await verifyReleaseSource(
      {
        ...input,
        event: 'pull_request',
        ref: 'refs/pull/145/merge',
        refProtected: false,
      },
      api,
    );
    expect(preview).toEqual({
      version: '0.0.0',
      tag: '',
      commit: workflowSha,
      branch: '',
      publish: false,
    });
    expect(api).not.toHaveBeenCalled();
    await expect(
      verifyReleaseSource({ ...input, event: 'pull_request', expectedCommit: sourceSha }, api),
    ).rejects.toThrow('cannot publish');
  });

  it.each([
    { ref: 'refs/heads/feature', refProtected: true },
    { ref: 'refs/heads/main', refProtected: false },
    { ref: 'refs/tags/v1.2.3', refProtected: true },
  ])('rejects an untrusted workflow ref before resolving its tag %#', async (overrides) => {
    const { input, api } = fixture();
    await expect(verifyReleaseSource({ ...input, ...overrides }, api)).rejects.toThrow(
      'protected release branch',
    );
    expect(api).not.toHaveBeenCalled();
  });

  it('checks current server-side protection instead of trusting a supplied SHA or context alone', async () => {
    const { input, api, responses } = fixture();
    responses.set(`${root}/branches/main`, {
      name: 'main',
      protected: false,
      commit: { sha: branchSha },
    });
    await expect(verifyReleaseSource(input, api)).rejects.toThrow('exist and be protected');
    expect(api).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the beta release branch is missing or unprotected', async () => {
    const { input, api, responses } = fixture(true);
    responses.delete(`${root}/branches/develop`);
    await expect(verifyReleaseSource(input, api)).rejects.toThrow();
    responses.set(`${root}/branches/develop`, {
      name: 'develop',
      protected: false,
      commit: { sha: branchSha },
    });
    await expect(verifyReleaseSource(input, api)).rejects.toThrow('exist and be protected');
  });

  it.each(['behind', 'diverged'])(
    'rejects a released off-branch tag with compare status %s',
    async (status) => {
      const { input, api, responses } = fixture();
      responses.set(`${root}/compare/${sourceSha}...${branchSha}`, {
        status,
        behind_by: 1,
        merge_base_commit: { sha: tagSha },
      });
      await expect(verifyReleaseSource(input, api)).rejects.toThrow('not an ancestor');
    },
  );

  it('also rejects a workflow implementation from outside the protected release branch', async () => {
    const { input, api, responses, tag } = fixture();
    responses.set(`${root}/compare/${workflowSha}...${branchSha}`, {
      status: 'diverged',
      behind_by: 1,
      merge_base_commit: { sha: tagSha },
    });
    await expect(verifyReleaseSource(input, api)).rejects.toThrow('not an ancestor');
    expect(api).not.toHaveBeenCalledWith(`${root}/releases/tags/${tag}`);
  });

  it('does not accept an inconsistent ancestor response even if its status says ahead', async () => {
    const { input, api, responses } = fixture();
    responses.set(`${root}/compare/${sourceSha}...${branchSha}`, {
      status: 'ahead',
      behind_by: 0,
      merge_base_commit: { sha: tagSha },
    });
    await expect(verifyReleaseSource(input, api)).rejects.toThrow('not an ancestor');
  });

  it('resolves annotated tags and detects tag movement before credentials or publication', async () => {
    const { input, api, responses, tag } = fixture();
    responses.set(`${root}/git/ref/tags/${tag}`, { object: { type: 'tag', sha: tagSha } });
    responses.set(`${root}/git/tags/${tagSha}`, { object: { type: 'commit', sha: sourceSha } });
    expect((await verifyReleaseSource({ ...input, expectedCommit: sourceSha }, api)).commit).toBe(
      sourceSha,
    );
    await expect(
      verifyReleaseSource({ ...input, expectedCommit: workflowSha }, api),
    ).rejects.toThrow('tag changed');
  });

  it.each([
    { draft: true, prerelease: false },
    { draft: false, prerelease: true },
    { draft: false, prerelease: false, tag_name: 'v9.9.9' },
  ])('rejects a draft or mismatched release provenance %#', async (release) => {
    const { input, api, responses, tag } = fixture();
    responses.set(`${root}/releases/tags/${tag}`, { tag_name: tag, ...release });
    await expect(verifyReleaseSource(input, api)).rejects.toThrow('Release status');
  });

  it('rejects cross-channel invocation and prerelease store packages', async () => {
    const { input, api } = fixture(true);
    await expect(verifyReleaseSource({ ...input, ref: 'refs/heads/main' }, api)).rejects.toThrow(
      'protected release branch',
    );
    await expect(verifyReleaseSource({ ...input, stableOnly: true }, api)).rejects.toThrow(
      'Store packages require',
    );
    expect(api).not.toHaveBeenCalled();
  });

  it('propagates API failures instead of falling back to unverified local tags', async () => {
    const { input, api } = fixture();
    api.mockRejectedValue(new Error('GitHub unavailable'));
    await expect(verifyReleaseSource(input, api)).rejects.toThrow('GitHub unavailable');
  });
});
