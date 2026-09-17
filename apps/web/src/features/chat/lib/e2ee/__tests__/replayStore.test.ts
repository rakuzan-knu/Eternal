import { describe, it, expect, beforeEach } from 'vitest';
import {
  __resetReplayStoreForTests,
  checkInboundFreshness,
  clearReplayScopesForDevice,
  getReplayDiagnostics,
  isKnownDuplicate,
  nextMessageSeq,
} from '../replayStore';

describe('replayStore freshness', () => {
  beforeEach(() => {
    __resetReplayStoreForTests();
    window.localStorage.clear();
  });

  it('issues monotonic per-conversation seqs that survive reloads', () => {
    expect(nextMessageSeq('c1')).toBe(1);
    expect(nextMessageSeq('c1')).toBe(2);
    expect(nextMessageSeq('c2')).toBe(1);
  });

  it('accepts first delivery, rejects exact replays, flags gaps', async () => {
    const scope = 'conv-1:alice:dev-a';
    await expect(checkInboundFreshness({ scope, seq: 1, ctHash: 'h1' })).resolves.toMatchObject({
      verdict: 'fresh',
    });
    await expect(checkInboundFreshness({ scope, seq: 1, ctHash: 'h1' })).resolves.toMatchObject({
      verdict: 'replay',
    });
    // Same seq, NEW bytes (counter anomaly, e.g. tab race): accepted, flagged.
    await expect(checkInboundFreshness({ scope, seq: 1, ctHash: 'h2' })).resolves.toMatchObject({
      verdict: 'gap',
    });
    // Jump ahead: accepted, gap flagged.
    await expect(checkInboundFreshness({ scope, seq: 5, ctHash: 'h3' })).resolves.toMatchObject({
      verdict: 'gap',
      highest: 5,
    });
    await expect(checkInboundFreshness({ scope, seq: 6, ctHash: 'h4' })).resolves.toMatchObject({
      verdict: 'fresh',
    });
    expect(isKnownDuplicate(scope, 'h1')).toBe(true);
    expect(isKnownDuplicate(scope, 'nope')).toBe(false);
    expect(getReplayDiagnostics()).toMatchObject({ replaysDetected: 1, gapsDetected: 2 });
  });

  it('tracks seq-less v1 envelopes by exact bytes only', async () => {
    const scope = 'conv-1:alice:v1';
    await expect(checkInboundFreshness({ scope, ctHash: 'v1a' })).resolves.toMatchObject({
      verdict: 'fresh',
    });
    await expect(checkInboundFreshness({ scope, ctHash: 'v1a' })).resolves.toMatchObject({
      verdict: 'replay',
    });
    await expect(checkInboundFreshness({ scope, ctHash: 'v1b' })).resolves.toMatchObject({
      verdict: 'fresh',
    });
  });

  it('scopes replay windows per device and conversation', async () => {
    await expect(
      checkInboundFreshness({ scope: 'c:a:d1', seq: 1, ctHash: 'h' }),
    ).resolves.toMatchObject({ verdict: 'fresh' });
    // Same hash, different device scope: independent (NOT a replay).
    await expect(
      checkInboundFreshness({ scope: 'c:a:d2', seq: 1, ctHash: 'h' }),
    ).resolves.toMatchObject({ verdict: 'fresh' });
  });

  it('rotation recovery clears one device without touching others', async () => {
    await checkInboundFreshness({ scope: 'c:alice:dev-a', seq: 10, ctHash: 'h1' });
    await checkInboundFreshness({ scope: 'c:alice:dev-b', seq: 3, ctHash: 'h2' });
    clearReplayScopesForDevice('alice', 'dev-a');
    // dev-a restarts at low seq: accepted again.
    await expect(
      checkInboundFreshness({ scope: 'c:alice:dev-a', seq: 1, ctHash: 'h3' }),
    ).resolves.toMatchObject({ verdict: 'fresh' });
    // dev-b watermark intact: old seq still anomalous.
    await expect(
      checkInboundFreshness({ scope: 'c:alice:dev-b', seq: 2, ctHash: 'h4' }),
    ).resolves.toMatchObject({ verdict: 'gap' });
  });

  it('survives corrupt disk state by resetting safely', async () => {
    window.localStorage.setItem('e2ee_replay_v1', 'not-json{{{');
    await expect(
      checkInboundFreshness({ scope: 'c:a:d', seq: 1, ctHash: 'h' }),
    ).resolves.toMatchObject({ verdict: 'fresh' });
  });
});
