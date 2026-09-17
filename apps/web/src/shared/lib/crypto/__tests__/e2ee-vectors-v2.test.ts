import { describe, it, expect } from 'vitest';
import { e2eeManager } from '../e2ee';
import vectors from '../vectors/v2.json';

/**
 * Golden KAT vectors for v2 (AAD binding) + v3 (hybrid multi-device).
 *
 * Anchored by node:crypto (OpenSSL) in gen-e2ee-vectors-v2.mjs — built AND
 * independently verified there. This suite reproduces every check with
 * browser WebCrypto through the PRODUCT decrypt path: two implementations
 * agreeing byte-for-byte.
 *
 * NEVER hand-edit v2.json — regenerate.
 */

const hasSubtle = typeof window !== 'undefined' && Boolean(window.crypto?.subtle);

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function hexToB64Url(hex: string): string {
  const bytes = hexToBytes(hex);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

interface RawParty {
  pubUncompressedHex: string;
  privHex: string;
}

async function importPartyKeys(party: RawParty): Promise<{ pub: CryptoKey; priv: CryptoKey }> {
  const x = hexToB64Url(party.pubUncompressedHex.slice(2, 66));
  const y = hexToB64Url(party.pubUncompressedHex.slice(66, 130));
  const d = hexToB64Url(party.privHex);
  const pub = await window.crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x, y },
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    [],
  );
  const priv = await window.crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x, y, d },
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits'],
  );
  return { pub, priv };
}

describe.runIf(hasSubtle)('E2EE golden vectors v2 (AAD + hybrid)', () => {
  it('matches vectors/v2.json version contract', () => {
    expect(vectors.version).toBe(2);
  });

  it('decrypts the OpenSSL-built v2 envelope, rejects transplants', async () => {
    const v = vectors.v2Bound;
    const sender = await importPartyKeys(v.sender);
    const recipient = await importPartyKeys(v.recipient);
    const shared = await window.crypto.subtle.deriveKey(
      { name: 'ECDH', public: sender.pub },
      recipient.priv,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );
    await expect(
      e2eeManager.decryptV2(v.envelope, shared, {
        conversationId: v.aad.conversationId,
        senderId: v.aad.senderId,
      }),
    ).resolves.toMatchObject({ text: v.plaintext, aad: v.aad });
    await expect(
      e2eeManager.decryptV2(v.envelope, shared, {
        conversationId: 'conv-EVIL',
        senderId: v.aad.senderId,
      }),
    ).rejects.toThrow(/binding mismatch/);
    // Cross-check the agreement itself: A-priv/B-pub == B-priv/A-pub.
    const reverse = await window.crypto.subtle.deriveKey(
      { name: 'ECDH', public: recipient.pub },
      sender.priv,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
    const fwd = await window.crypto.subtle.deriveKey(
      { name: 'ECDH', public: sender.pub },
      recipient.priv,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
    const raw = async (k: CryptoKey) =>
      Array.from(new Uint8Array(await window.crypto.subtle.exportKey('raw', k)), (b) =>
        b.toString(16).padStart(2, '0'),
      ).join('');
    await expect(raw(reverse)).resolves.toBe(await raw(fwd));
  });

  it('decrypts the OpenSSL-built v3 envelope per device, rejects wrap transplant', async () => {
    // Fully raw WebCrypto (the manager never holds B's private half — its
    // decryptV3 path is proven in messageE2ee.test.ts self-read + Playwright
    // two-realm specs). This test anchors the GOLDEN bytes.
    const v = vectors.v3Hybrid;
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const senderPub = await window.crypto.subtle.importKey(
      'jwk',
      (() => {
        const x = hexToB64Url(v.sender.pubUncompressedHex.slice(2, 66));
        const y = hexToB64Url(v.sender.pubUncompressedHex.slice(66, 130));
        return { kty: 'EC', crv: 'P-256', x, y };
      })(),
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      [],
    );
    const parsed = JSON.parse(v.envelope) as {
      iv: string;
      ct: string;
      from: string;
      keys: Record<string, { iv: string; k: string }>;
      aad: { conversationId: string; senderId: string; senderDevice: string; seq: number };
    };
    const b64bytes = (b64: string) => {
      const binary = window.atob(b64);
      const out = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
      return out;
    };
    const aadStr = `e2ee-msg:3:${parsed.aad.conversationId}:${parsed.aad.senderId}:${parsed.aad.senderDevice}:${parsed.aad.seq}`;

    for (const [index, deviceId] of ['dev-b1', 'dev-b2'].entries()) {
      const recipient = await importPartyKeys(v.recipients[index]);
      const shared = await window.crypto.subtle.deriveKey(
        { name: 'ECDH', public: senderPub },
        recipient.priv,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt'],
      );
      const entry = parsed.keys[deviceId];
      const rawK = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: b64bytes(entry.iv),
          additionalData: enc.encode(`e2ee-wrap:3:${parsed.from}:${deviceId}`),
        },
        shared,
        b64bytes(entry.k),
      );
      const contentKey = await window.crypto.subtle.importKey(
        'raw',
        rawK,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt'],
      );
      const plain = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64bytes(parsed.iv), additionalData: enc.encode(aadStr) },
        contentKey,
        b64bytes(parsed.ct),
      );
      expect(dec.decode(plain)).toBe(v.plaintext);
    }

    // Unknown device has no wrap entry (product maps this to locked).
    expect(parsed.keys['dev-ghost']).toBeUndefined();

    // Wrap transplant: dev-b1's wrap relabeled for dev-b2 — wrap AAD binds
    // sender->recipient, so the unwrap fails closed.
    const recipient2 = await importPartyKeys(v.recipients[1]);
    const shared2 = await window.crypto.subtle.deriveKey(
      { name: 'ECDH', public: senderPub },
      recipient2.priv,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );
    const stolen = parsed.keys['dev-b1'];
    await expect(
      window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: b64bytes(stolen.iv),
          additionalData: enc.encode(`e2ee-wrap:3:${parsed.from}:dev-b2`),
        },
        shared2,
        b64bytes(stolen.k),
      ),
    ).rejects.toThrow();
  });
});
