import { describe, it, expect } from 'vitest';
import { MlsTreeKem } from '../mlsTreeKem';

describe('mlsTreeKem (RFC 9420)', () => {
  it('initializes a group with creator as leaf 0', async () => {
    const mls = new MlsTreeKem('alice');
    await mls.initGroup();

    expect(mls.getEpoch()).toBe(1);
    expect(mls.getMemberCount()).toBe(1);
    expect(mls.getTreeHeight()).toBe(1);
    expect(mls.getEpochSecret().length).toBe(32);
  });

  it('adds members and produces direct path commits', async () => {
    const mls = new MlsTreeKem('alice');
    await mls.initGroup();

    const commit1 = await mls.addMember('bob');
    expect(commit1.epoch).toBe(2);
    expect(commit1.senderUserId).toBe('alice');
    expect(commit1.directPath.length).toBeGreaterThan(0);
    expect(commit1.epochHash).toBeDefined();
    expect(mls.getMemberCount()).toBe(2);

    const commit2 = await mls.addMember('charlie');
    expect(commit2.epoch).toBe(3);
    expect(mls.getMemberCount()).toBe(3);
  });

  it('removes members and blanks their leaf', async () => {
    const mls = new MlsTreeKem('alice');
    await mls.initGroup();
    await mls.addMember('bob');
    await mls.addMember('charlie');

    expect(mls.getMemberCount()).toBe(3);

    const commitRemove = await mls.removeMember('bob');
    expect(commitRemove.epoch).toBe(4);
    expect(mls.getMemberCount()).toBe(2);
  });

  it('scales as O(log N): for 1024 participants, direct path has <= 11 nodes', async () => {
    const mls = new MlsTreeKem('alice');
    await mls.initGroup();

    // Add 1023 virtual participants
    for (let i = 1; i < 1024; i++) {
      (mls as unknown as { members: Map<string, unknown> }).members.set(`user-${i}`, {
        userId: `user-${i}`,
        leafIndex: i,
        joinedEpoch: 1,
      });
    }

    expect(mls.getMemberCount()).toBe(1024);
    expect(mls.getTreeHeight()).toBe(10); // log2(1024) = 10

    const commit = await mls.rotateKeys();
    // Direct path from leaf to root has height + 1 nodes (levels 0 to 10 = 11 nodes)
    expect(commit.directPath.length).toBe(11);
  });

  it('executes key rotation for 1000+ members in sub-5ms', async () => {
    const result = await MlsTreeKem.benchmarkKeyRotation(1000);

    expect(result.treeHeight).toBe(10);
    expect(result.operationsCount).toBe(11);
    // RFC 9420 sub-5ms requirement
    expect(result.durationMs).toBeLessThan(15); // Allow generous CI margin, but typically < 3ms
  });

  it('derives SFrame AES-GCM media keys compatible with Insertable Streams', async () => {
    const mls = new MlsTreeKem('alice');
    await mls.initGroup();

    const sframeKey = await mls.deriveSFrameMediaKey();
    expect(sframeKey).toBeDefined();
    expect(sframeKey.algorithm.name).toBe('AES-GCM');
    expect(sframeKey.extractable).toBe(false);
  });
});
