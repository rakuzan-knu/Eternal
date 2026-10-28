import { webcrypto, randomBytes as nodeRandomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  E2eeProtocol,
  base64ToBytes,
  bytesToBase64,
  bytesToHex,
  createWebCryptoBackend,
  parseEnvelope,
} from '@social-network/shared-crypto';
import v1 from '@social-network/shared-crypto/vectors/v1.json';
import v2 from '@social-network/shared-crypto/vectors/v2.json';
import { createNobleBackend, generatePrivateKey, publicSpkiFromPrivate } from './nobleBackend';

const hexToBytes = (hex: string) => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
};
const b64UrlToBytes = (value: string) =>
  base64ToBytes(
    value
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(value.length / 4) * 4, '='),
  );
const random = (length: number) => new Uint8Array(nodeRandomBytes(length));

/** Backend whose randomness replays a fixed queue (golden reproduction). */
function scripted(priv: Uint8Array, queue: Uint8Array[]) {
  const backend = createNobleBackend(
    async () => priv,
    (length) => {
      const next = queue.shift();
      if (!next || next.length !== length) throw new Error(`unexpected random request (${length})`);
      return next;
    },
  );
  return new E2eeProtocol(backend);
}

const noble = (priv: Uint8Array) => new E2eeProtocol(createNobleBackend(async () => priv, random));
const spki = (uncompressedHex: string) => publicSpkiFromPrivateFromPoint(uncompressedHex);
function publicSpkiFromPrivateFromPoint(uncompressedHex: string) {
  const point = hexToBytes(uncompressedHex);
  const prefix = hexToBytes('3059301306072a8648ce3d020106082a8648ce3d030107034200');
  return bytesToBase64(new Uint8Array([...prefix, ...point]));
}

describe('noble backend against golden vectors', () => {
  it('derives the stored ECDH secret in both directions', async () => {
    const { partyA, partyB, sharedSecretHex } = v1.ecdhP256Agreement;
    const privA = b64UrlToBytes(partyA.privateJwk.d);
    const privB = b64UrlToBytes(partyB.privateJwk.d);
    const pubA = bytesToBase64(hexToBytes(partyA.publicSpkiHex));
    const pubB = bytesToBase64(hexToBytes(partyB.publicSpkiHex));
    const ab = await createNobleBackend(async () => privA, random).deriveSharedKey(pubB);
    const ba = await createNobleBackend(async () => privB, random).deriveSharedKey(pubA);
    expect(bytesToHex(ab.raw)).toBe(sharedSecretHex);
    expect(bytesToHex(ba.raw)).toBe(sharedSecretHex);
    expect(publicSpkiFromPrivate(privA)).toBe(pubA);
  });

  it('reproduces and decrypts the v1 envelope', async () => {
    const { partyA, partyB } = v1.ecdhP256Agreement;
    const privA = b64UrlToBytes(partyA.privateJwk.d);
    const pubB = bytesToBase64(hexToBytes(partyB.publicSpkiHex));
    const { plaintext, ivHex, envelope } = v1.envelopeV1;
    const protocol = scripted(privA, [hexToBytes(ivHex)]);
    const key = await protocol.getSharedKey(pubB);
    expect(await protocol.encrypt(plaintext, key)).toBe(envelope);
    expect(await noble(privA).decrypt(envelope, await noble(privA).getSharedKey(pubB))).toBe(
      plaintext,
    );
  });

  it('reproduces and decrypts the v2 bound envelope', async () => {
    const vec = v2.v2Bound;
    const senderPriv = hexToBytes(vec.sender.privHex);
    const recipientPriv = hexToBytes(vec.recipient.privHex);
    const sender = scripted(senderPriv, [hexToBytes(vec.ivHex)]);
    const key = await sender.getSharedKey(spki(vec.recipient.pubUncompressedHex));
    expect(await sender.encryptV2(vec.plaintext, key, vec.sender.deviceId, vec.aad)).toBe(
      vec.envelope,
    );

    const reader = noble(recipientPriv);
    const res = await reader.decryptV2(
      vec.envelope,
      await reader.getSharedKey(spki(vec.sender.pubUncompressedHex)),
      {
        conversationId: vec.aad.conversationId,
        senderId: vec.aad.senderId,
      },
    );
    expect(res).toEqual({ text: vec.plaintext, aad: vec.aad });
    await expect(
      reader.decryptV2(
        vec.envelope,
        await reader.getSharedKey(spki(vec.sender.pubUncompressedHex)),
        {
          conversationId: 'other',
          senderId: vec.aad.senderId,
        },
      ),
    ).rejects.toThrow(/transplant/);
  });

  it('reproduces and decrypts the v3 hybrid envelope for every device', async () => {
    const vec = v2.v3Hybrid;
    const parsed = parseEnvelope(vec.envelope);
    if (parsed.v !== 3) throw new Error('expected v3');
    const order = [vec.sender.deviceId, ...vec.recipients.map((r) => r.deviceId)];
    const sender = scripted(hexToBytes(vec.sender.privHex), [
      hexToBytes(vec.contentKeyHex),
      hexToBytes(vec.ivHex),
      ...order.map((id) => base64ToBytes(parsed.keys[id]!.iv)),
    ]);
    const produced = await sender.encryptV3(
      vec.plaintext,
      vec.recipients.map((r) => ({
        deviceId: r.deviceId,
        publicKeySpki: spki(r.pubUncompressedHex),
      })),
      {
        from: vec.sender.deviceId,
        ownPublicSpki: spki(vec.sender.pubUncompressedHex),
        conversationId: vec.aad.conversationId,
        senderId: vec.aad.senderId,
        seq: vec.aad.seq,
      },
    );
    expect(JSON.parse(produced)).toEqual(JSON.parse(vec.envelope));

    for (const recipient of vec.recipients) {
      const res = await noble(hexToBytes(recipient.privHex)).decryptV3(
        vec.envelope,
        [{ deviceId: vec.sender.deviceId, publicKeySpki: spki(vec.sender.pubUncompressedHex) }],
        {
          ownDeviceId: recipient.deviceId,
          conversationId: vec.aad.conversationId,
          senderId: vec.aad.senderId,
        },
      );
      expect(res.text).toBe(vec.plaintext);
    }
  });
});

describe('noble and WebCrypto interoperate', () => {
  async function webParty() {
    const pair = (await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, [
      'deriveKey',
      'deriveBits',
    ])) as CryptoKeyPair;
    const spkiB64 = bytesToBase64(
      new Uint8Array(await webcrypto.subtle.exportKey('spki', pair.publicKey)),
    );
    const protocol = new E2eeProtocol(
      createWebCryptoBackend(
        async () => pair.privateKey,
        () => webcrypto as unknown as Crypto,
      ),
    );
    return { spki: spkiB64, protocol };
  }
  function nobleParty() {
    const priv = generatePrivateKey(random);
    return { spki: publicSpkiFromPrivate(priv), protocol: noble(priv) };
  }
  const aad = { conversationId: 'conv-1', senderId: 'alice', senderDevice: 'dev-a', seq: 1 };

  it('round-trips v1 and v2 in both directions', async () => {
    const web = await webParty();
    const native = nobleParty();
    const text = 'Привіт, Eternal 👋';
    const fromWeb = await web.protocol.encrypt(text, await web.protocol.getSharedKey(native.spki));
    expect(
      await native.protocol.decrypt(fromWeb, await native.protocol.getSharedKey(web.spki)),
    ).toBe(text);
    const fromNative = await native.protocol.encryptV2(
      text,
      await native.protocol.getSharedKey(web.spki),
      'dev-a',
      aad,
    );
    const res = await web.protocol.decryptV2(
      fromNative,
      await web.protocol.getSharedKey(native.spki),
      aad,
    );
    expect(res.text).toBe(text);
  });

  it('round-trips v3 between a native sender and web plus native readers', async () => {
    const sender = nobleParty();
    const web = await webParty();
    const phone = nobleParty();
    const envelope = await sender.protocol.encryptV3(
      'multi-device',
      [
        { deviceId: 'web-1', publicKeySpki: web.spki },
        { deviceId: 'phone-1', publicKeySpki: phone.spki },
      ],
      {
        from: 'dev-a',
        ownPublicSpki: sender.spki,
        conversationId: 'conv-1',
        senderId: 'alice',
        seq: 2,
      },
    );
    const devices = [{ deviceId: 'dev-a', publicKeySpki: sender.spki }];
    const ctx = { conversationId: 'conv-1', senderId: 'alice' };
    expect(
      (await web.protocol.decryptV3(envelope, devices, { ...ctx, ownDeviceId: 'web-1' })).text,
    ).toBe('multi-device');
    expect(
      (await phone.protocol.decryptV3(envelope, devices, { ...ctx, ownDeviceId: 'phone-1' })).text,
    ).toBe('multi-device');
    expect(
      (await sender.protocol.decryptV3(envelope, devices, { ...ctx, ownDeviceId: 'dev-a' })).text,
    ).toBe('multi-device');
  });

  it('reports tampering as an OperationError', async () => {
    const a = nobleParty();
    const b = nobleParty();
    const envelope = JSON.parse(
      await a.protocol.encrypt('secret', await a.protocol.getSharedKey(b.spki)),
    );
    const bytes = base64ToBytes(envelope.ct);
    bytes[0] = (bytes[0] ?? 0) ^ 1;
    envelope.ct = bytesToBase64(bytes);
    await expect(
      b.protocol.decrypt(JSON.stringify(envelope), await b.protocol.getSharedKey(a.spki)),
    ).rejects.toMatchObject({ name: 'OperationError' });
  });

  it('rejects public keys that are not valid P-256 points', async () => {
    const a = nobleParty();
    const bogus = bytesToBase64(
      new Uint8Array([
        ...hexToBytes('3059301306072a8648ce3d020106082a8648ce3d030107034200'),
        4,
        ...new Uint8Array(64).fill(1),
      ]),
    );
    await expect(a.protocol.getSharedKey(bogus)).rejects.toThrow();
  });
});
