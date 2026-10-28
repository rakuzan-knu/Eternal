import { createHash, randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { E2eeProtocol, parseEnvelope } from '@social-network/shared-crypto';
import { createNobleBackend, generatePrivateKey, publicSpkiFromPrivate } from './nobleBackend';

const random = (length: number) => new Uint8Array(randomBytes(length));
const party = (deviceId: string) => {
  const priv = generatePrivateKey(random);
  return {
    deviceId,
    priv,
    spki: publicSpkiFromPrivate(priv),
    protocol: new E2eeProtocol(createNobleBackend(async () => priv, random)),
  };
};

const own = party('mobile-own');
const directory = new Map<string, unknown[]>();
const posts: unknown[] = [];
const storage = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    multiGet: async (keys: string[]) => keys.map((key) => [key, storage.get(key) ?? null]),
    setItem: async (key: string, value: string) => void storage.set(key, value),
  },
}));
vi.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digest: async (_: string, data: Uint8Array) =>
    new Uint8Array(createHash('sha256').update(data).digest()).buffer,
  digestStringAsync: async (_: string, text: string) =>
    createHash('sha256').update(text).digest('hex'),
}));
vi.mock('./deviceCrypto', () => ({
  initDeviceIdentity: async () => ({ publicKeySpki: own.spki }),
  getDeviceId: async () => own.deviceId,
  deviceProtocol: own.protocol,
}));
vi.mock('@/shared/api/client', () => ({
  getMobileApi: () => ({
    get: async (url: string) => {
      const user = decodeURIComponent(url.split('/')[3] ?? '');
      return { data: { keys: directory.get(user) ?? [] } };
    },
    post: async (_url: string, body: unknown) => {
      posts.push(body);
      return { data: {} };
    },
  }),
}));

const e2ee = await import('./messageE2ee');
const state = await import('./e2eeState');

const device = (p: ReturnType<typeof party>, version = 3) => ({
  deviceId: p.deviceId,
  publicKey: p.spki,
  e2eeVersion: version,
  purpose: 'message',
  updatedAt: '2026-01-01T00:00:00Z',
});
const ctx = { conversationId: 'conv-1', senderId: 'me', seq: 1 };

beforeEach(() => {
  storage.clear();
  directory.clear();
  posts.length = 0;
  state.__resetE2eeStateForTests();
  e2ee.__resetMessageE2eeForTests();
});

describe('message E2EE on mobile', () => {
  it('registers the device key and stays plaintext for keyless peers', async () => {
    expect(await e2ee.encryptMessageForPeer('hi', 'bob', ctx)).toBeNull();
    expect(posts).toEqual([
      expect.objectContaining({
        publicKey: own.spki,
        purpose: 'message',
        deviceId: own.deviceId,
        e2eeVersion: 3,
      }),
    ]);
  });

  it('picks v1, v2 or v3 by what every peer device supports', async () => {
    const legacy = party('legacy');
    directory.set('bob', [device(legacy, 1)]);
    expect(parseEnvelope((await e2ee.encryptMessageForPeer('a', 'bob', ctx)) as string).v).toBe(1);

    e2ee.__resetMessageE2eeForTests();
    storage.clear();
    state.__resetE2eeStateForTests();
    directory.set('bob', [device(party('b1'))]);
    expect(parseEnvelope((await e2ee.encryptMessageForPeer('a', 'bob', ctx)) as string).v).toBe(2);

    e2ee.__resetMessageE2eeForTests();
    storage.clear();
    state.__resetE2eeStateForTests();
    directory.set('bob', [device(party('b1')), device(party('b2'))]);
    const v3 = parseEnvelope((await e2ee.encryptMessageForPeer('a', 'bob', ctx)) as string);
    expect(v3.v).toBe(3);
    if (v3.v === 3) expect(Object.keys(v3.keys)).toEqual(['mobile-own', 'b1', 'b2']);
  });

  it('blocks sending when a pinned key changes, until the user accepts it', async () => {
    directory.set('bob', [device(party('b1'))]);
    await e2ee.encryptMessageForPeer('first', 'bob', ctx);
    e2ee.evictPeerDeviceCache();
    directory.set('bob', [device(party('b1'))]);
    await expect(e2ee.encryptMessageForPeer('second', 'bob', ctx)).rejects.toBeInstanceOf(
      e2ee.E2eePinChangedError,
    );
    await e2ee.acceptPeerKeyChanges('bob');
    expect(await e2ee.encryptMessageForPeer('third', 'bob', ctx)).not.toBeNull();
  });

  it('decrypts a peer message, reads its own history and rejects replays', async () => {
    const bob = party('bob-phone');
    directory.set('bob', [device(bob)]);
    directory.set('me', [device(own)]);
    const fromBob = await bob.protocol.encryptV3(
      'hello from bob',
      [{ deviceId: own.deviceId, publicKeySpki: own.spki }],
      {
        from: bob.deviceId,
        ownPublicSpki: bob.spki,
        conversationId: 'conv-1',
        senderId: 'bob',
        seq: 1,
      },
    );
    const read = { peerUserId: 'bob', conversationId: 'conv-1', senderId: 'bob' };
    expect(await e2ee.decryptMessageForDisplay(fromBob, read)).toEqual({
      status: 'decrypted',
      text: 'hello from bob',
    });
    expect((await e2ee.decryptMessageForDisplay(fromBob, read)).status).toBe('replay');

    const mine = (await e2ee.encryptMessageForPeer('note to self', 'bob', ctx)) as string;
    expect(
      await e2ee.decryptMessageForDisplay(mine, {
        peerUserId: 'bob',
        conversationId: 'conv-1',
        senderId: 'me',
      }),
    ).toEqual({ status: 'decrypted', text: 'note to self' });
  });

  it('locks transplanted or undecryptable envelopes instead of showing ciphertext', async () => {
    const bob = party('bob-phone');
    directory.set('bob', [device(bob)]);
    const other = await bob.protocol.encryptV3(
      'not for you',
      [{ deviceId: 'someone-else', publicKeySpki: party('x').spki }],
      {
        from: bob.deviceId,
        ownPublicSpki: bob.spki,
        conversationId: 'conv-1',
        senderId: 'bob',
        seq: 2,
      },
    );
    const read = { peerUserId: 'bob', conversationId: 'conv-1', senderId: 'bob' };
    expect(await e2ee.decryptMessageForDisplay(other, read)).toMatchObject({
      status: 'locked',
      text: e2ee.LOCKED_LABEL,
    });
    expect(
      (await e2ee.decryptMessageForDisplay(other, { ...read, conversationId: 'conv-2' })).status,
    ).toBe('error');
    expect(await e2ee.decryptMessageForDisplay('plain text', read)).toEqual({
      status: 'plain',
      text: 'plain text',
    });
  });
});
