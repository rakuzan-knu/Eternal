import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/shared/api/httpClient';
import { e2eeManager, parseEnvelope } from '@/shared/lib/crypto/e2ee';
import { getDeviceId } from '../identityKeys';
import {
  __resetMessageE2eeForTests,
  acceptPeerDeviceKeyChange,
  decryptMessageForDisplay,
  encryptMessageForPeer,
  ensureMessageIdentityRegistered,
  evictPeerDeviceCache,
  fetchPeerDevices,
  resolveDirectPeerUserId,
  resolveEditableText,
  type EncryptContext,
} from '../messageE2ee';
import { __resetReplayStoreForTests } from '../replayStore';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const getMock = vi.mocked(apiClient.get);
const postMock = vi.mocked(apiClient.post);
const hasSubtle = typeof window !== 'undefined' && Boolean(window.crypto?.subtle);

function b64encode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return window.btoa(binary);
}

function b64decode(b64: string): Uint8Array {
  const binary = window.atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

interface TestDevice {
  deviceId: string;
  spki: string;
  version: number;
}

describe('resolveDirectPeerUserId', () => {
  const conversations = [
    {
      id: 'c1',
      type: 'DIRECT',
      participants: [{ userId: 'me' }, { userId: 'peer-1' }],
    },
    {
      id: 'c2',
      type: 'GROUP',
      participants: [{ userId: 'me' }, { userId: 'peer-1' }, { userId: 'peer-2' }],
    },
  ];

  it('resolves the other participant for DIRECT', () => {
    expect(resolveDirectPeerUserId(conversations, 'c1', 'me')).toBe('peer-1');
  });

  it('returns null for groups, unknown conversations, missing ids', () => {
    expect(resolveDirectPeerUserId(conversations, 'c2', 'me')).toBeNull();
    expect(resolveDirectPeerUserId(conversations, 'nope', 'me')).toBeNull();
    expect(resolveDirectPeerUserId(conversations, 'c1', null)).toBeNull();
    expect(resolveDirectPeerUserId(null, 'c1', 'me')).toBeNull();
  });
});

describe.runIf(hasSubtle)('messageE2ee version dispatch + pins + replay', () => {
  const PEER = 'peer-1';
  const ME = 'me';
  const CONV = 'conv-1';
  const dir = new Map<string, TestDevice[]>();
  let legacyBackend = false;
  let ownDeviceId = '';
  let ownSpki = '';

  const ctx = (seq = 1): EncryptContext => ({ conversationId: CONV, senderId: ME, seq });
  const dctx = (peer: string | null = PEER, sender: string | null = ME) => ({
    peerUserId: peer,
    conversationId: CONV,
    senderId: sender,
  });

  async function makeSpki(): Promise<string> {
    const pair = await window.crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits'],
    );
    return b64encode(await window.crypto.subtle.exportKey('spki', pair.publicKey));
  }

  async function makePeer(): Promise<{ spki: string; privateKey: CryptoKey }> {
    const pair = await window.crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits'],
    );
    return {
      spki: b64encode(await window.crypto.subtle.exportKey('spki', pair.publicKey)),
      privateKey: pair.privateKey,
    };
  }

  async function importLocalPub(): Promise<CryptoKey> {
    return window.crypto.subtle.importKey(
      'spki',
      b64decode(ownSpki).buffer as ArrayBuffer,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      [],
    );
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    __resetMessageE2eeForTests();
    __resetReplayStoreForTests();
    window.localStorage.clear();
    dir.clear();
    legacyBackend = false;
    await e2eeManager.init();
    ownDeviceId = getDeviceId();
    ownSpki = (await e2eeManager.init()).publicKeySpki;
    dir.set(ME, [{ deviceId: ownDeviceId, spki: ownSpki, version: 3 }]);

    getMock.mockImplementation((url: string) => {
      const match = url.match(/\/e2ee\/keys\/([^/?]+)/);
      const userId = match ? decodeURIComponent(match[1]) : '';
      const devices = dir.get(userId) ?? [];
      if (url.includes('/devices?')) {
        if (legacyBackend) return Promise.reject(new Error('404'));
        return Promise.resolve({
          data: {
            keys: devices.map((d) => ({
              deviceId: d.deviceId,
              publicKey: d.spki,
              e2eeVersion: d.version,
              updatedAt: '2026-01-01T00:00:00.000Z',
            })),
          },
        });
      }
      const latest = devices[0];
      if (!latest) return Promise.reject(new Error('404'));
      return Promise.resolve({ data: { publicKey: latest.spki, deviceId: latest.deviceId } });
    });
    postMock.mockResolvedValue({ data: { success: true } });
  });

  it('v1 legacy path: old backend, single versionless key, cross-verified secret', async () => {
    legacyBackend = true;
    const peer = await makePeer();
    dir.set(PEER, [{ deviceId: 'web', spki: peer.spki, version: 1 }]);

    const envelope = (await encryptMessageForPeer('hello peer', PEER, ctx())) as string;
    expect(parseEnvelope(envelope).v).toBe(1);

    // Independent verification: the peer side derives the same secret from
    // ITS private half + OUR public half and decrypts manually.
    const sharedB = await window.crypto.subtle.deriveKey(
      { name: 'ECDH', public: await importLocalPub() },
      peer.privateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );
    const parsed = JSON.parse(envelope) as { iv: string; ct: string };
    const plain = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64decode(parsed.iv).buffer as ArrayBuffer },
      sharedB,
      b64decode(parsed.ct).buffer as ArrayBuffer,
    );
    expect(new TextDecoder().decode(plain)).toBe('hello peer');

    await expect(decryptMessageForDisplay(envelope, dctx())).resolves.toEqual({
      status: 'decrypted',
      text: 'hello peer',
    });
  });

  it('single v2 device → v2 envelope with dialog binding + monotonic seq', async () => {
    dir.set(PEER, [{ deviceId: 'dev-b', spki: await makeSpki(), version: 2 }]);

    const first = (await encryptMessageForPeer('one', PEER, ctx(1))) as string;
    const second = (await encryptMessageForPeer('two', PEER, ctx(2))) as string;
    for (const env of [first, second]) {
      const parsed = parseEnvelope(env);
      expect(parsed.v).toBe(2);
      if (parsed.v === 2) {
        expect(parsed.aad).toMatchObject({
          conversationId: CONV,
          senderId: ME,
          senderDevice: ownDeviceId,
        });
      }
    }
    expect((parseEnvelope(second) as { aad: { seq: number } }).aad.seq).toBe(2);

    await expect(decryptMessageForDisplay(first, dctx())).resolves.toEqual({
      status: 'decrypted',
      text: 'one',
    });
    // Transplant into another dialog fails loudly, not silently.
    await expect(
      decryptMessageForDisplay(first, { ...dctx(), conversationId: 'conv-EVIL' }),
    ).resolves.toMatchObject({ status: 'error' });
  });

  it('multi-device all-v3 → v3 hybrid readable by peer wraps and own wrap', async () => {
    const b1 = await makePeer();
    const b2 = await makePeer();
    dir.set(PEER, [
      { deviceId: 'dev-b1', spki: b1.spki, version: 3 },
      { deviceId: 'dev-b2', spki: b2.spki, version: 3 },
    ]);

    const envelope = (await encryptMessageForPeer('group of devices', PEER, ctx(5))) as string;
    const parsed = parseEnvelope(envelope);
    expect(parsed.v).toBe(3);
    if (parsed.v !== 3) throw new Error('expected v3');
    expect(Object.keys(parsed.keys).sort()).toEqual([ownDeviceId, 'dev-b1', 'dev-b2'].sort());
    expect(parsed.aad.seq).toBe(5);

    // Independent peer-side unwrap: dev-b1 derives ECDH(b1priv, senderPub),
    // unwraps the content key (wrap AAD bound), decrypts (message AAD bound).
    const enc = new TextEncoder();
    const sharedB1 = await window.crypto.subtle.deriveKey(
      { name: 'ECDH', public: await importLocalPub() },
      b1.privateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );
    const wrap = parsed.keys['dev-b1'];
    const rawK = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: b64decode(wrap.iv).buffer as ArrayBuffer,
        additionalData: enc.encode(`e2ee-wrap:3:${parsed.from}:dev-b1`),
      },
      sharedB1,
      b64decode(wrap.k).buffer as ArrayBuffer,
    );
    const contentKey = await window.crypto.subtle.importKey(
      'raw',
      rawK,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );
    const aad = parsed.aad;
    const plain = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: b64decode(parsed.iv).buffer as ArrayBuffer,
        additionalData: enc.encode(
          `e2ee-msg:3:${aad.conversationId}:${aad.senderId}:${aad.senderDevice}:${aad.seq}`,
        ),
      },
      contentKey,
      b64decode(parsed.ct).buffer as ArrayBuffer,
    );
    expect(new TextDecoder().decode(plain)).toBe('group of devices');

    // Product self-read path: the sender reads its own v3 message via the
    // own wrap (sender == ME, peer key unused for v3).
    await expect(
      decryptMessageForDisplay(envelope, { peerUserId: PEER, conversationId: CONV, senderId: ME }),
    ).resolves.toEqual({ status: 'decrypted', text: 'group of devices' });
  });

  it('mixed-version multi-device falls back to the best single device', async () => {
    dir.set(PEER, [
      { deviceId: 'dev-new', spki: await makeSpki(), version: 3 },
      { deviceId: 'dev-old', spki: await makeSpki(), version: 1 },
    ]);
    const envelope = (await encryptMessageForPeer('mixed', PEER, ctx())) as string;
    // Best single device supports v3-capable... dispatch picks v2 for it
    // (single-device rule), never v1 downgrade of the modern key.
    expect(parseEnvelope(envelope).v).toBe(2);
    await expect(decryptMessageForDisplay(envelope, dctx())).resolves.toEqual({
      status: 'decrypted',
      text: 'mixed',
    });
  });

  it('no devices → null (plaintext fallback); plaintext passes through', async () => {
    await expect(encryptMessageForPeer('x', PEER, ctx())).resolves.toBeNull();
    await expect(encryptMessageForPeer('x', null, ctx())).resolves.toBeNull();
    await expect(decryptMessageForDisplay('plain text', dctx())).resolves.toEqual({
      status: 'plain',
      text: 'plain text',
    });
  });

  it('TOFU pins: first sight pins, change blocks send, accept recovers', async () => {
    const spki1 = await makeSpki();
    dir.set(PEER, [{ deviceId: 'dev-b', spki: spki1, version: 2 }]);

    await expect(encryptMessageForPeer('first', PEER, ctx())).resolves.not.toBeNull();
    expect(JSON.parse(window.localStorage.getItem('e2ee_message_pins_v1') ?? '{}')).toHaveProperty(
      `${PEER}:dev-b`,
    );

    // Rotation without acceptance: send BLOCKS (no silent downgrade).
    // (Evict the 5-minute directory cache so the rotated key is actually
    // fetched — the cache window itself is intended product behavior.)
    dir.set(PEER, [{ deviceId: 'dev-b', spki: await makeSpki(), version: 2 }]);
    evictPeerDeviceCache(PEER);
    await expect(encryptMessageForPeer('second', PEER, ctx())).rejects.toThrow(
      'security key changed',
    );

    // Explicit acceptance re-pins and unblocks.
    await acceptPeerDeviceKeyChange(PEER, 'dev-b');
    await expect(encryptMessageForPeer('third', PEER, ctx())).resolves.not.toBeNull();
  });

  it('pin change locks decrypt instead of misdecrypting', async () => {
    dir.set(PEER, [{ deviceId: 'dev-b', spki: await makeSpki(), version: 2 }]);
    const envelope = (await encryptMessageForPeer('secret', PEER, ctx())) as string;
    dir.set(PEER, [{ deviceId: 'dev-b', spki: await makeSpki(), version: 2 }]);
    evictPeerDeviceCache(PEER);
    // Directory key changed under us: decrypt must not proceed.
    await expect(decryptMessageForDisplay(envelope, dctx())).resolves.toEqual({
      status: 'locked',
      text: 'End-to-End Encrypted message',
    });
  });

  it('replay of a v2 envelope is rejected on second delivery', async () => {
    dir.set(PEER, [{ deviceId: 'dev-b', spki: await makeSpki(), version: 2 }]);
    const envelope = (await encryptMessageForPeer('once', PEER, ctx(9))) as string;
    await expect(decryptMessageForDisplay(envelope, dctx())).resolves.toMatchObject({
      status: 'decrypted',
    });
    await expect(decryptMessageForDisplay(envelope, dctx())).resolves.toMatchObject({
      status: 'replay',
    });
  });

  it('tampered v2 ciphertext fails closed', async () => {
    dir.set(PEER, [{ deviceId: 'dev-b', spki: await makeSpki(), version: 2 }]);
    const envelope = (await encryptMessageForPeer('tamper me', PEER, ctx())) as string;
    const parsed = JSON.parse(envelope) as { ct: string };
    parsed.ct = `${parsed.ct.slice(0, -1)}${parsed.ct.endsWith('A') ? 'B' : 'A'}`;
    await expect(
      decryptMessageForDisplay(JSON.stringify({ ...JSON.parse(envelope), ...parsed }), dctx()),
    ).resolves.toEqual({ status: 'error', text: 'End-to-End Encrypted message' });
  });

  it('registers the message slot with version 3 and a stable install deviceId', async () => {
    await ensureMessageIdentityRegistered();
    await ensureMessageIdentityRegistered();
    expect(postMock).toHaveBeenCalledTimes(1);
    const payload = postMock.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).toMatchObject({ purpose: 'message', e2eeVersion: 3 });
    const deviceId = payload.deviceId as string;
    expect(typeof deviceId).toBe('string');
    expect(deviceId.length).toBeGreaterThan(0);
    expect(deviceId).not.toBe('web');

    __resetMessageE2eeForTests();
    postMock.mockClear();
    await ensureMessageIdentityRegistered();
    expect((postMock.mock.calls[0][1] as Record<string, unknown>).deviceId).toBe(deviceId);
  });

  it('fetchPeerDevices validates shape and sorts newest first', async () => {
    dir.set(PEER, [
      { deviceId: 'dev-old', spki: await makeSpki(), version: 1 },
      { deviceId: 'dev-new', spki: await makeSpki(), version: 3 },
    ]);
    // Inject garbage alongside (must be dropped, not crash).
    getMock.mockImplementationOnce(async () => ({
      data: {
        keys: [
          { deviceId: 'dev-new', publicKey: await makeSpki(), e2eeVersion: 3 },
          { nope: true },
          'junk',
        ],
      },
    }));
    const devices = await fetchPeerDevices(PEER);
    expect(devices.map((d) => d.deviceId)).toEqual(['dev-new']);
  });

  it('resolveEditableText passes plaintext/legacy through, refuses locked envelopes', async () => {
    const CTX = { peerUserId: PEER, conversationId: CONV, senderId: ME };
    await expect(resolveEditableText(null, CTX)).resolves.toEqual({ editable: true, text: '' });
    await expect(resolveEditableText('plain', CTX)).resolves.toEqual({
      editable: true,
      text: 'plain',
    });
    await expect(
      resolveEditableText(JSON.stringify({ e2ee: true, text: 'legacy hi' }), CTX),
    ).resolves.toEqual({ editable: true, text: 'legacy hi' });

    dir.set(PEER, [{ deviceId: 'dev-b', spki: await makeSpki(), version: 2 }]);
    const envelope = (await encryptMessageForPeer('editable text', PEER, ctx())) as string;
    await expect(resolveEditableText(envelope, CTX)).resolves.toEqual({
      editable: true,
      text: 'editable text',
    });

    dir.set(PEER, [{ deviceId: 'dev-b', spki: await makeSpki(), version: 2 }]);
    evictPeerDeviceCache(PEER);
    await expect(
      resolveEditableText(envelope, { peerUserId: PEER, conversationId: CONV, senderId: ME }),
    ).resolves.toEqual({ editable: false, text: '' });
  });
});
