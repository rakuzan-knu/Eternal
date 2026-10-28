import { describe, expect, it, vi } from 'vitest';
import { toggleReaction } from './chat';

vi.mock('@/shared/lib/e2ee/messageE2ee', () => ({}));
vi.mock('@/shared/lib/e2ee/e2eeState', () => ({}));
vi.mock('@/shared/lib/e2ee/random', () => ({ secureRandomUuid: () => 'uuid' }));
vi.mock('@/shared/api/client', () => ({}));
vi.mock('../api/chatApi', () => ({ chatApi: {} }));
vi.mock('./socket', () => ({}));

const { resolveEditBody, EditNotEncryptedError } = await import('./queries');

const envelope = (v: number, conversationId = 'c1', seq = 7) =>
  JSON.stringify({
    e2ee: true,
    v,
    iv: 'AAAAAAAAAAAAAAAA',
    ct: 'AAAA',
    ...(v > 1
      ? {
          from: 'dev',
          aad: { conversationId, senderId: 'me', senderDevice: 'dev', seq },
          ...(v === 3 ? { keys: { dev: { iv: 'AAAAAAAAAAAAAAAA', k: 'AAAA' } } } : {}),
        }
      : {}),
  });

describe('editing keeps the original protection', () => {
  it('edits plain messages as plain text without encrypting', async () => {
    const encrypt = vi.fn();
    expect(await resolveEditBody('hello', 'hello!', 'c1', encrypt)).toBe('hello!');
    expect(encrypt).not.toHaveBeenCalled();
  });

  it('re-encrypts with the original sequence number of this dialog', async () => {
    const encrypt = vi.fn(async () => 'cipher');
    expect(await resolveEditBody(envelope(3), 'new', 'c1', encrypt)).toBe('cipher');
    expect(encrypt).toHaveBeenCalledWith(7);
    await resolveEditBody(envelope(2, 'other-dialog'), 'new', 'c1', encrypt);
    expect(encrypt).toHaveBeenLastCalledWith(undefined);
    await resolveEditBody(envelope(1), 'new', 'c1', encrypt);
    expect(encrypt).toHaveBeenLastCalledWith(undefined);
  });

  it('refuses to downgrade an encrypted message to plain text', async () => {
    await expect(
      resolveEditBody(envelope(3), 'new', 'c1', async () => null),
    ).rejects.toBeInstanceOf(EditNotEncryptedError);
    await expect(
      resolveEditBody(envelope(3), 'new', 'c1', async () => {
        throw new Error('pin changed');
      }),
    ).rejects.toThrow('pin changed');
  });
});

describe('reaction toggling', () => {
  it('adds, joins and removes reactions like the server summary', () => {
    const added = toggleReaction([], '🔥');
    expect(added).toEqual([{ emoji: '🔥', count: 1, selfReacted: true, users: [] }]);
    const joined = toggleReaction([{ emoji: '🔥', count: 2, selfReacted: false, users: [] }], '🔥');
    expect(joined[0]).toMatchObject({ count: 3, selfReacted: true });
    expect(toggleReaction(added, '🔥')).toEqual([]);
    expect(toggleReaction(joined, '🔥')[0]).toMatchObject({ count: 2, selfReacted: false });
  });
});
