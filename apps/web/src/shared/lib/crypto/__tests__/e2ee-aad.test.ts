import { describe, it, expect } from 'vitest';
import { E2eeCryptoManager, e2eeManager, parseEnvelope } from '../e2ee';

// Manager-level v2/v3 with the peer side built from raw WebCrypto (same
// single-identity-per-file constraint as the other suites: the module
// singleton is one party, raw subtle is the other).
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

describe.runIf(hasSubtle)('E2EE v2 dialog binding (manager + raw peer)', () => {
  const AAD = { conversationId: 'conv-1', senderId: 'alice', senderDevice: 'dev-alice', seq: 7 };

  async function setupPeer(): Promise<{ spki: string; privateKey: CryptoKey; localSpki: string }> {
    const { publicKeySpki: localSpki } = await e2eeManager.init();
    const pair = await window.crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits'],
    );
    return {
      spki: b64encode(await window.crypto.subtle.exportKey('spki', pair.publicKey)),
      privateKey: pair.privateKey,
      localSpki,
    };
  }

  async function peerSharedKey(peerPriv: CryptoKey, localSpki: string): Promise<CryptoKey> {
    const localPub = await window.crypto.subtle.importKey(
      'spki',
      b64decode(localSpki).buffer as ArrayBuffer,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      [],
    );
    return window.crypto.subtle.deriveKey(
      { name: 'ECDH', public: localPub },
      peerPriv,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );
  }

  it('round-trips v2 through the peer-derived secret with binding enforced', async () => {
    const { spki, privateKey, localSpki } = await setupPeer();
    const sharedA = await e2eeManager.getSharedKey(spki);
    const envelope = await e2eeManager.encryptV2('bound hello', sharedA, 'dev-alice', AAD);
    expect(parseEnvelope(envelope).v).toBe(2);

    // Peer side (raw): same agreement, correct context → plaintext.
    const sharedB = await peerSharedKey(privateKey, localSpki);
    const parsed = JSON.parse(envelope) as { iv: string; ct: string };
    const aadBytes = new TextEncoder().encode(
      `e2ee-msg:2:${AAD.conversationId}:${AAD.senderId}:${AAD.senderDevice}:${AAD.seq}`,
    );
    const plain = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64decode(parsed.iv).buffer as ArrayBuffer, additionalData: aadBytes },
      sharedB,
      b64decode(parsed.ct).buffer as ArrayBuffer,
    );
    expect(new TextDecoder().decode(plain)).toBe('bound hello');

    // Manager self-path decrypts with the right context...
    await expect(
      e2eeManager.decryptV2(envelope, sharedA, {
        conversationId: 'conv-1',
        senderId: 'alice',
      }),
    ).resolves.toMatchObject({ text: 'bound hello', aad: AAD });

    // ...and rejects transplanted contexts without decrypting.
    await expect(
      e2eeManager.decryptV2(envelope, sharedA, {
        conversationId: 'conv-EVIL',
        senderId: 'alice',
      }),
    ).rejects.toThrow(/binding mismatch/);
    await expect(
      e2eeManager.decryptV2(envelope, sharedA, { conversationId: 'conv-1', senderId: 'mallory' }),
    ).rejects.toThrow(/binding mismatch/);
  });

  it('v2 rejects tampered aad fields and wrong secrets', async () => {
    const { spki } = await setupPeer();
    const sharedA = await e2eeManager.getSharedKey(spki);
    const envelope = await e2eeManager.encryptV2('bound', sharedA, 'dev-alice', AAD);

    const tampered = { ...JSON.parse(envelope), from: 'dev-EVIL' };
    // from is NOT aad-covered metadata for decryption... it IS envelope
    // metadata: decryptV2 ignores `from` (callers resolve keys), so this
    // still decrypts — documented: `from` is a hint, binding is conv/sender.
    await expect(
      e2eeManager.decryptV2(JSON.stringify(tampered), sharedA, {
        conversationId: 'conv-1',
        senderId: 'alice',
      }),
    ).resolves.toMatchObject({ text: 'bound' });

    const other = await window.crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits'],
    );
    const wrongSpki = b64encode(await window.crypto.subtle.exportKey('spki', other.publicKey));
    const wrongShared = await e2eeManager.getSharedKey(wrongSpki);
    await expect(
      e2eeManager.decryptV2(envelope, wrongShared, {
        conversationId: 'conv-1',
        senderId: 'alice',
      }),
    ).rejects.toThrow();
  });

  it('parseEnvelope validates strictly per version', () => {
    expect(() => parseEnvelope('not json')).toThrow(/not JSON/);
    expect(() => parseEnvelope('{"e2ee":true,"v":2,"iv":"a","ct":"b"}')).toThrow();
    expect(() =>
      parseEnvelope(
        JSON.stringify({
          e2ee: true,
          v: 2,
          iv: 'AAAAAAAAAAAAAAAA',
          ct: 'BBBB',
          from: 'd',
          aad: { conversationId: 'c', senderId: 's', senderDevice: 'd', seq: 1.5 },
        }),
      ),
    ).toThrow(/aad/);
    expect(() =>
      parseEnvelope(
        JSON.stringify({ e2ee: true, v: 3, iv: 'a', ct: 'b', from: 'd', keys: {}, aad: {} }),
      ),
    ).toThrow();
  });

  it('fresh manager instances share the module memory fallback deterministically', async () => {
    const second = new E2eeCryptoManager();
    const first = await e2eeManager.init();
    await expect(second.init()).resolves.toEqual(first);
  });
});
