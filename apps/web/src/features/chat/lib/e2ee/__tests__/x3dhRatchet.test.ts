import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  encryptX3dhMessage,
  decryptX3dhMessage,
  initializeAndPublishPrekeys,
} from '../x3dhRatchet';
import { chatApi } from '../../../api/chatApi';

vi.mock('../../../api/chatApi', () => ({
  chatApi: {
    getPrekeyCount: vi.fn(),
    uploadPrekeys: vi.fn(),
    getPrekeyBundle: vi.fn(),
  },
}));

describe('x3dhRatchet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes and publishes prekey bundle when pool is low', async () => {
    vi.mocked(chatApi.getPrekeyCount).mockResolvedValue({ count: 5 });
    vi.mocked(chatApi.uploadPrekeys).mockResolvedValue(undefined as any);

    await initializeAndPublishPrekeys('user-1');

    expect(chatApi.uploadPrekeys).toHaveBeenCalledWith(
      expect.objectContaining({
        identityKeySpki: expect.any(String),
        signedPrekeySpki: expect.any(String),
        signedPrekeySig: expect.any(String),
        oneTimePrekeys: expect.arrayContaining([
          expect.objectContaining({ keyId: 1, keySpki: expect.any(String) }),
        ]),
      }),
    );
  });

  it('skips publish if pool is already healthy', async () => {
    vi.mocked(chatApi.getPrekeyCount).mockResolvedValue({ count: 40 });

    await initializeAndPublishPrekeys('user-1');
    expect(chatApi.uploadPrekeys).not.toHaveBeenCalled();
  });

  it('encrypts message via X3DH handshake with recipient bundle', async () => {
    // Generate a real recipient signed prekey
    const spkPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
      'deriveKey',
      'deriveBits',
    ]);
    const spkSpki = btoa(
      String.fromCharCode(
        ...new Uint8Array(await crypto.subtle.exportKey('spki', spkPair.publicKey)),
      ),
    );

    vi.mocked(chatApi.getPrekeyBundle).mockResolvedValue({
      userId: 'recipient-1',
      identityKeySpki: 'dummy-ik',
      signedPrekeySpki: spkSpki,
      signedPrekeySig: 'dummy-sig',
      oneTimePrekey: null,
    });

    const envelope = await encryptX3dhMessage(
      'recipient-1',
      'Secret Enterprise Message',
      'conv-1:user-1',
    );

    expect(envelope.e2ee).toBe(true);
    expect(envelope.protocol).toBe('x3dh-ratchet');
    expect(envelope.v).toBe(4);
    expect(envelope.ct).toBeDefined();
    expect(envelope.iv).toBeDefined();
    expect(envelope.ephemeralKeySpki).toBeDefined();
  });

  it('performs complete end-to-end round trip: publish prekeys -> encrypt -> decrypt', async () => {
    let publishedBundle: any = null;
    vi.mocked(chatApi.getPrekeyCount).mockResolvedValue({ count: 0 });
    vi.mocked(chatApi.uploadPrekeys).mockImplementation(async (bundle) => {
      publishedBundle = bundle;
    });

    // 1. Alice publishes prekeys
    await initializeAndPublishPrekeys('alice');
    expect(publishedBundle).not.toBeNull();

    // 2. Bob fetches Alice's bundle and encrypts
    vi.mocked(chatApi.getPrekeyBundle).mockResolvedValue({
      userId: 'alice',
      identityKeySpki: publishedBundle.identityKeySpki,
      signedPrekeySpki: publishedBundle.signedPrekeySpki,
      signedPrekeySig: publishedBundle.signedPrekeySig,
      oneTimePrekey: publishedBundle.oneTimePrekeys[0],
    });

    const secretText = 'Enterprise End-to-End Encrypted Signal Message 🚀';
    const aad = 'conv-direct-1:bob';

    const envelope = await encryptX3dhMessage('alice', secretText, aad);
    expect(envelope.e2ee).toBe(true);

    // 3. Alice decrypts using her stored private keys
    const decrypted = await decryptX3dhMessage('alice', envelope, aad);
    expect(decrypted).toBe(secretText);
  });
});
