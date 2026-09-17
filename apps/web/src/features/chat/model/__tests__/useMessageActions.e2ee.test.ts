import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useMessageActions } from '../useMessageActions';
import { CONVERSATION_MESSAGES_KEY, CONVERSATIONS_KEY } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { apiClient } from '@/shared/api/httpClient';
import { chatApi } from '@/features/chat/api/chatApi';
import { e2eeManager, parseEnvelope } from '@/shared/lib/crypto/e2ee';
import { getDeviceId } from '../../lib/e2ee/identityKeys';
import {
  __resetMessageE2eeForTests,
  E2eePinChangedError,
  encryptMessageForPeer,
  evictPeerDeviceCache,
} from '../../lib/e2ee/messageE2ee';
import { __resetReplayStoreForTests } from '../../lib/e2ee/replayStore';
import * as socketHookModule from '../useChatSocket';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const getMock = vi.mocked(apiClient.get);
const hasSubtle = typeof window !== 'undefined' && Boolean(window.crypto?.subtle);

function b64encode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return window.btoa(binary);
}

interface TestDevice {
  deviceId: string;
  spki: string;
  version: number;
}

describe.runIf(hasSubtle)('useMessageActions E2EE v2/v3 + pins + seq', () => {
  let queryClient: QueryClient;
  let mockSocket: { emit: ReturnType<typeof vi.fn> };
  let emitted: Array<{ event: string; payload: Record<string, unknown> }>;
  const dir = new Map<string, TestDevice[]>();
  let ownDeviceId = '';
  let ownSpki = '';

  const seedConversations = () => {
    queryClient.setQueryData(
      [CONVERSATIONS_KEY],
      [
        {
          id: 'conv-1',
          type: 'DIRECT',
          participants: [{ userId: 'user-1' }, { userId: 'peer-9' }],
        },
        {
          id: 'conv-2',
          type: 'DIRECT',
          participants: [{ userId: 'user-1' }, { userId: 'peer-7' }],
        },
        {
          id: 'conv-3',
          type: 'GROUP',
          participants: [{ userId: 'user-1' }, { userId: 'peer-9' }, { userId: 'peer-7' }],
        },
        {
          id: 'conv-4',
          type: 'DIRECT',
          participants: [{ userId: 'user-1' }, { userId: 'peer-8' }],
        },
      ],
    );
  };

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

  function b64decode(b64: string): Uint8Array {
    const binary = window.atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  /**
   * Builds a genuine peer-sent v2 envelope with raw WebCrypto (the fixture
   * the product code could never forge: ECDH(peerPriv, ourPub), from the
   * peer's directory device). bit-valid for the decrypt path under test.
   */
  async function peerSentV2(
    peer: { spki: string; privateKey: CryptoKey },
    peerUserId: string,
    deviceId: string,
    text: string,
    seq: number,
  ): Promise<string> {
    const localPub = await window.crypto.subtle.importKey(
      'spki',
      b64decode(ownSpki).buffer as ArrayBuffer,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      [],
    );
    const shared = await window.crypto.subtle.deriveKey(
      { name: 'ECDH', public: localPub },
      peer.privateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt'],
    );
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ct = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData: enc.encode(`e2ee-msg:2:conv-1:${peerUserId}:${deviceId}:${seq}`),
      },
      shared,
      enc.encode(text),
    );
    const b64 = (buf: ArrayBuffer) => b64encode(buf);
    return JSON.stringify({
      e2ee: true,
      v: 2,
      iv: b64(iv.buffer),
      ct: b64(ct),
      from: deviceId,
      aad: { conversationId: 'conv-1', senderId: peerUserId, senderDevice: deviceId, seq },
    });
  }

  beforeEach(async () => {
    vi.restoreAllMocks();
    __resetMessageE2eeForTests();
    __resetReplayStoreForTests();
    window.localStorage.clear();
    dir.clear();
    emitted = [];
    mockSocket = { emit: vi.fn() };
    mockSocket.emit.mockImplementation(
      (event: string, payload: Record<string, unknown>, cb?: (res: unknown) => void) => {
        emitted.push({ event, payload });
        cb?.({ status: 'ok' });
      },
    );
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    seedConversations();
    useAuthStore.setState({ userId: 'user-1' });
    vi.spyOn(socketHookModule, 'useChatSocket').mockReturnValue(mockSocket as never);

    await e2eeManager.init();
    ownDeviceId = getDeviceId();
    ownSpki = (await e2eeManager.init()).publicKeySpki;
    dir.set('user-1', [{ deviceId: ownDeviceId, spki: ownSpki, version: 3 }]);
    dir.set('peer-9', [{ deviceId: 'dev-b9', spki: await makeSpki(), version: 2 }]);
    dir.set('peer-7', [{ deviceId: 'dev-b7', spki: await makeSpki(), version: 2 }]);
    dir.set('peer-8', [
      { deviceId: 'dev-c1', spki: await makeSpki(), version: 3 },
      { deviceId: 'dev-c2', spki: await makeSpki(), version: 3 },
    ]);

    getMock.mockImplementation((url: string) => {
      const match = url.match(/\/e2ee\/keys\/([^/?]+)/);
      const userId = match ? decodeURIComponent(match[1]) : '';
      const devices = dir.get(userId) ?? [];
      if (url.includes('/devices?')) {
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  const ctx = (seq: number) => ({ conversationId: 'conv-1', senderId: 'user-1', seq });

  function sentEnvelopes() {
    return emitted.filter((e) => e.event === 'sendMessage').map((e) => e.payload.text as string);
  }

  it('sendMessage emits v2 with dialog binding and monotonic seq', async () => {
    const { result } = renderHook(() => useMessageActions('conv-1'), { wrapper });

    await act(async () => {
      await result.current.sendMessage('first');
    });
    await act(async () => {
      await result.current.sendMessage('second');
    });

    const envs = sentEnvelopes();
    expect(envs).toHaveLength(2);
    const seqs = envs.map((env) => {
      const parsed = parseEnvelope(env);
      expect(parsed.v).toBe(2);
      if (parsed.v !== 2) throw new Error('expected v2');
      expect(parsed.aad).toMatchObject({ conversationId: 'conv-1', senderId: 'user-1' });
      return parsed.aad.seq;
    });
    expect(seqs[1]).toBe(seqs[0] + 1);
  });

  it('pin-changed peer blocks the send loudly (fail closed)', async () => {
    const { result } = renderHook(() => useMessageActions('conv-1'), { wrapper });
    await act(async () => {
      await result.current.sendMessage('before rotation');
    });
    // Rotate the peer key and evict the directory cache.
    dir.set('peer-9', [{ deviceId: 'dev-b9', spki: await makeSpki(), version: 2 }]);
    evictPeerDeviceCache('peer-9');

    let thrown: unknown = null;
    await act(async () => {
      try {
        await result.current.sendMessage('after rotation');
      } catch (err) {
        thrown = err;
      }
    });
    expect(thrown).toBeInstanceOf(E2eePinChangedError);
    // Blocked send still lands in ERROR state via the caller's catch... here
    // the throw propagates (composer shows the banner + ERROR bubble).
    expect(sentEnvelopes()).toHaveLength(1);
  });

  it('editMessage re-encrypts bound envelopes reusing the original seq', async () => {
    const original = (await encryptMessageForPeer('original', 'peer-9', ctx(7))) as string;
    const { result } = renderHook(() => useMessageActions('conv-1'), { wrapper });

    await act(async () => {
      await result.current.editMessage('msg-1', 'edited!', original);
    });

    const edit = emitted.find((e) => e.event === 'editMessage');
    expect(edit?.payload).toMatchObject({ messageId: 'msg-1' });
    const parsed = parseEnvelope(edit?.payload.body as string);
    expect(parsed.v).toBe(2);
    if (parsed.v !== 2) throw new Error('expected v2');
    expect(parsed.aad.seq).toBe(7);
  });

  it('forwardMessage re-encrypts v2 per target with fresh seq + attribution', async () => {
    // Genuine peer-sent envelope (built with the peer private half).
    const peer = await makePeer();
    dir.set('peer-9', [{ deviceId: 'dev-b9', spki: peer.spki, version: 2 }]);
    const peerSent = await peerSentV2(peer, 'peer-9', 'dev-b9', 'forward me', 3);
    const { result } = renderHook(() => useMessageActions('conv-1'), { wrapper });

    await act(async () => {
      await result.current.forwardMessage(
        { id: 'm1', body: peerSent, conversationId: 'conv-1', sender: { id: 'peer-9' } },
        ['conv-2'],
      );
    });

    const send = emitted.find((e) => e.event === 'sendMessage');
    expect(send?.payload).toMatchObject({ conversationId: 'conv-2', forwardedFromId: 'm1' });
    const parsed = parseEnvelope(send?.payload.text as string);
    expect(parsed.v).toBe(2);
    if (parsed.v !== 2) throw new Error('expected v2');
    expect(parsed.aad).toMatchObject({ conversationId: 'conv-2', senderId: 'user-1' });
  });

  it('forwardMessage to multi-device v3 target emits hybrid with own wrap', async () => {
    const peer = await makePeer();
    dir.set('peer-9', [{ deviceId: 'dev-b9', spki: peer.spki, version: 2 }]);
    const peerSent = await peerSentV2(peer, 'peer-9', 'dev-b9', 'to v3', 11);
    const { result } = renderHook(() => useMessageActions('conv-1'), { wrapper });

    await act(async () => {
      await result.current.forwardMessage(
        { id: 'm1', body: peerSent, conversationId: 'conv-1', sender: { id: 'peer-9' } },
        ['conv-4'],
      );
    });

    const send = emitted.find((e) => e.event === 'sendMessage');
    const parsed = parseEnvelope(send?.payload.text as string);
    expect(parsed.v).toBe(3);
    if (parsed.v !== 3) throw new Error('expected v3');
    expect(Object.keys(parsed.keys).sort()).toEqual(['dev-c1', 'dev-c2', ownDeviceId].sort());
  });

  it('batchForwardMessages routes envelopes client-side, plaintext via server batch', async () => {
    const batchSpy = vi.spyOn(chatApi, 'batchForwardMessages').mockResolvedValue([] as never);
    const peer = await makePeer();
    dir.set('peer-9', [{ deviceId: 'dev-b9', spki: peer.spki, version: 2 }]);
    const envelope = await peerSentV2(peer, 'peer-9', 'dev-b9', 'batched', 1);
    // Seed the message cache: one envelope (peer-sent) + one plaintext.
    queryClient.setQueryData([CONVERSATION_MESSAGES_KEY, 'conv-1'], {
      pages: [
        {
          data: [
            { id: 'm-enc', body: envelope, conversationId: 'conv-1', sender: { id: 'peer-9' } },
            { id: 'm-plain', body: 'plain', conversationId: 'conv-1', sender: { id: 'user-1' } },
          ],
          hasMore: false,
          nextCursor: null,
        },
      ],
      pageParams: [undefined],
    });
    const { result } = renderHook(() => useMessageActions('conv-1'), { wrapper });

    // Plaintext-only batch keeps the legacy server path.
    await act(async () => {
      await result.current.batchForwardMessages(['m-plain'], ['conv-2'], false);
    });
    expect(batchSpy).toHaveBeenCalledTimes(1);

    // Envelope present → plaintext keeps ONE server batch, the envelope
    // fans out client-side into ONE sendMessage. No server envelope copy.
    await act(async () => {
      await result.current.batchForwardMessages(['m-enc', 'm-plain'], ['conv-2'], false);
    });
    expect(batchSpy).toHaveBeenCalledTimes(2);
    expect(batchSpy).toHaveBeenLastCalledWith('conv-1', ['m-plain'], ['conv-2'], false);
    expect(emitted.filter((e) => e.event === 'sendMessage')).toHaveLength(1);
    expect(emitted.filter((e) => e.event === 'forwardMessage')).toHaveLength(0);
  });
});
