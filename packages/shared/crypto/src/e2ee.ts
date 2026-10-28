/**
 * Message-layer E2EE protocol shared by every client.
 *
 * Wire contract (docs/security): ECDH P-256 agreement whose raw x coordinate
 * is the AES-256-GCM key; v1 legacy, v2 dialog-bound AAD, v3 hybrid
 * multi-device. This module owns envelope shapes, parsing and the
 * encrypt/decrypt flows; a backend supplies the primitives (WebCrypto with
 * non-extractable keys in browsers, a pure-JS implementation on native).
 * Backends must produce byte-identical output — golden vectors in
 * ../vectors enforce that for every implementation.
 */

import { WeakRefCache } from './weakRefCache';

export interface E2eeV1Payload {
  e2ee: true;
  v: 1;
  iv: string;
  ct: string;
}

/**
 * Authenticated associated data bound into every v2/v3 message. The values
 * ride the envelope in plaintext (so the receiver can reconstruct the AAD)
 * but are COVERED by AES-GCM: flipping any of them fails decryption.
 */
export interface MessageAad {
  readonly conversationId: string;
  readonly senderId: string;
  readonly senderDevice: string;
  readonly seq: number;
}

export interface E2eeV2Payload {
  e2ee: true;
  v: 2;
  iv: string;
  ct: string;
  from: string;
  aad: MessageAad;
}

export interface WrappedContentKey {
  iv: string;
  k: string;
}

export interface E2eeV3Payload {
  e2ee: true;
  v: 3;
  iv: string;
  ct: string;
  from: string;
  keys: Record<string, WrappedContentKey>;
  aad: MessageAad;
}

export interface DeviceKeyRef {
  readonly deviceId: string;
  readonly publicKeySpki: string;
}

/** Wire ceiling for detection; the backend enforces 8192 on the way in. */
export const E2EE_MAX_ENVELOPE_CHARS = 16384;

/** Raised by backends when authenticated decryption fails (WebCrypto naming). */
export class E2eeOperationError extends Error {
  constructor(message = 'The operation failed for an operation-specific reason') {
    super(message);
    this.name = 'OperationError';
  }
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i] as number);
  return globalThis.btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function utf8Encode(text: string): Uint8Array<ArrayBuffer> {
  if (typeof TextEncoder !== 'undefined') return new Uint8Array(new TextEncoder().encode(text));
  const out: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) as number;
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000)
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    else
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 63),
        0x80 | ((code >> 6) & 63),
        0x80 | (code & 63),
      );
  }
  return new Uint8Array(out);
}

export function utf8Decode(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(bytes);
  let out = '';
  for (let i = 0; i < bytes.length;) {
    const b0 = bytes[i] as number;
    const need = b0 < 0x80 ? 0 : b0 >> 5 === 6 ? 1 : b0 >> 4 === 14 ? 2 : b0 >> 3 === 30 ? 3 : -1;
    if (need < 0 || i + need >= bytes.length + (need === 0 ? 1 : 0)) {
      out += '�';
      i += 1;
      continue;
    }
    let code = need === 0 ? b0 : b0 & (0x3f >> need);
    let valid = true;
    for (let k = 1; k <= need; k++) {
      const next = bytes[i + k];
      if (next === undefined || next >> 6 !== 2) {
        valid = false;
        break;
      }
      code = (code << 6) | (next & 63);
    }
    if (!valid) {
      out += '�';
      i += 1;
      continue;
    }
    out += String.fromCodePoint(code);
    i += need + 1;
  }
  return out;
}

/** Canonical AAD encoding. IDs are uuid/opaque strings without ':'; validated on parse. */
export function encodeMessageAad(version: 2 | 3, aad: MessageAad): string {
  return `e2ee-msg:${version}:${aad.conversationId}:${aad.senderId}:${aad.senderDevice}:${aad.seq}`;
}

/** AAD binding for a wrapped content key: sender device -> recipient device. */
export function encodeWrapAad(from: string, recipientDeviceId: string): string {
  return `e2ee-wrap:3:${from}:${recipientDeviceId}`;
}

function isNonEmptyString(value: unknown, maxLen: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLen;
}

function isB64Field(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 16384;
}

/**
 * Base64 field decoding to EXACTLY byteLength bytes. AES-GCM readers require
 * 12-byte IVs — enforcing at parse time maps malformed envelopes to the
 * locked label instead of rendering raw JSON as text.
 */
function isB64Bytes(value: unknown, byteLength: number): value is string {
  if (!isB64Field(value)) return false;
  try {
    return base64ToBytes(value).byteLength === byteLength;
  } catch {
    return false;
  }
}

function parseAad(value: unknown): MessageAad {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Malformed E2EE payload: bad aad');
  }
  const aad = value as Record<string, unknown>;
  if (
    !isNonEmptyString(aad.conversationId, 256) ||
    !isNonEmptyString(aad.senderId, 256) ||
    !isNonEmptyString(aad.senderDevice, 128) ||
    !Number.isInteger(aad.seq) ||
    (aad.seq as number) < 0 ||
    (aad.seq as number) > 2 ** 31 - 1
  ) {
    throw new Error('Malformed E2EE payload: bad aad fields');
  }
  return {
    conversationId: aad.conversationId,
    senderId: aad.senderId,
    senderDevice: aad.senderDevice,
    seq: aad.seq as number,
  };
}

export type ParsedEnvelope =
  | { v: 1; iv: string; ct: string }
  | { v: 2; iv: string; ct: string; from: string; aad: MessageAad }
  | {
      v: 3;
      iv: string;
      ct: string;
      from: string;
      keys: Record<string, WrappedContentKey>;
      aad: MessageAad;
    };

/** Strict structural parse of any envelope version. Throws on malformed input. */
export function parseEnvelope(body: string): ParsedEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error('Malformed E2EE payload: not JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Malformed E2EE payload: not an object');
  }
  const payload = parsed as Record<string, unknown>;
  if (payload.e2ee !== true || !isB64Bytes(payload.iv, 12) || !isB64Field(payload.ct)) {
    throw new Error('Malformed E2EE payload');
  }
  const iv = payload.iv;
  const ct = payload.ct;
  if (payload.v === 1) return { v: 1, iv, ct };
  if (payload.v === 2) {
    if (!isNonEmptyString(payload.from, 128)) throw new Error('Malformed E2EE v2 payload');
    return { v: 2, iv, ct, from: payload.from, aad: parseAad(payload.aad) };
  }
  if (payload.v === 3) {
    if (!isNonEmptyString(payload.from, 128)) throw new Error('Malformed E2EE v3 payload');
    if (!payload.keys || typeof payload.keys !== 'object' || Array.isArray(payload.keys)) {
      throw new Error('Malformed E2EE v3 payload: bad keys');
    }
    const keys = payload.keys as Record<string, unknown>;
    const names = Object.keys(keys);
    if (names.length === 0 || names.length > 10) {
      throw new Error('Malformed E2EE v3 payload: keys out of range');
    }
    const clean: Record<string, WrappedContentKey> = {};
    for (const name of names) {
      if (!isNonEmptyString(name, 128)) throw new Error('Malformed E2EE v3 payload: bad key id');
      const entry = keys[name] as Record<string, unknown>;
      if (!entry || !isB64Bytes(entry.iv, 12) || !isB64Field(entry.k)) {
        throw new Error('Malformed E2EE v3 payload: bad wrap');
      }
      clean[name] = { iv: entry.iv, k: entry.k };
    }
    return { v: 3, iv, ct, from: payload.from, keys: clean, aad: parseAad(payload.aad) };
  }
  throw new Error('Malformed E2EE payload: unknown version');
}

/**
 * Checks if a message body is a well-formed E2EE envelope (any version).
 * Parses instead of substring-sniffing: a plaintext body merely containing
 * '"e2ee":true' must NOT mislabel.
 */
export function isEncryptedEnvelope(body?: string | null): boolean {
  if (!body || typeof body !== 'string') return false;
  const trimmed = body.trim();
  if (trimmed.length === 0 || trimmed[0] !== '{' || trimmed.length > E2EE_MAX_ENVELOPE_CHARS) {
    return false;
  }
  try {
    parseEnvelope(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Primitive operations an E2EE runtime must provide. `K` is the backend's
 * symmetric key handle (a non-extractable CryptoKey on WebCrypto, raw bytes
 * on pure-JS backends). Decryption failures must throw E2eeOperationError
 * (or a DOMException named OperationError).
 */
export interface E2eeBackend<K> {
  /** ECDH(own identity private key, peer SPKI) -> AES-256-GCM key from the raw shared x. */
  deriveSharedKey(peerPublicKeySpki: string): Promise<K>;
  importContentKey(raw: Uint8Array<ArrayBuffer>): Promise<K>;
  encrypt(
    key: K,
    iv: Uint8Array<ArrayBuffer>,
    plaintext: Uint8Array<ArrayBuffer>,
    aad?: Uint8Array<ArrayBuffer>,
  ): Promise<Uint8Array<ArrayBuffer>>;
  decrypt(
    key: K,
    iv: Uint8Array<ArrayBuffer>,
    ciphertext: Uint8Array<ArrayBuffer>,
    aad?: Uint8Array<ArrayBuffer>,
  ): Promise<Uint8Array<ArrayBuffer>>;
  randomBytes(length: number): Uint8Array<ArrayBuffer>;
}

interface KeyCache<K> {
  get(key: string): K | undefined;
  set(key: string, value: K): void;
  clear(): void;
}

/** Bounded insertion-order cache for runtimes without WeakRef/FinalizationRegistry. */
function boundedCache<K>(limit: number): KeyCache<K> {
  const map = new Map<string, K>();
  return {
    get: (key) => map.get(key),
    set: (key, value) => {
      map.delete(key);
      map.set(key, value);
      if (map.size > limit) map.delete(map.keys().next().value as string);
    },
    clear: () => map.clear(),
  };
}

function sharedKeyCache<K extends object>(): KeyCache<K> {
  return typeof WeakRef === 'function' && typeof FinalizationRegistry === 'function'
    ? new WeakRefCache<string, K>('e2ee-shared-keys', 32)
    : boundedCache<K>(32);
}

/** Encrypt/decrypt flows over a backend. Shared keys are cached per peer key. */
export class E2eeProtocol<K extends object> {
  private readonly sharedKeyCache = sharedKeyCache<K>();

  constructor(private readonly backend: E2eeBackend<K>) {}

  clearSharedKeyCache(): void {
    this.sharedKeyCache.clear();
  }

  async getSharedKey(peerPublicKeySpki: string): Promise<K> {
    const cached = this.sharedKeyCache.get(peerPublicKeySpki);
    if (cached) return cached;
    const sharedKey = await this.backend.deriveSharedKey(peerPublicKeySpki);
    this.sharedKeyCache.set(peerPublicKeySpki, sharedKey);
    return sharedKey;
  }

  /** v1: legacy unbound envelope. */
  async encrypt(plaintext: string, sharedKey: K): Promise<string> {
    const iv = this.backend.randomBytes(12);
    const ct = await this.backend.encrypt(sharedKey, iv, utf8Encode(plaintext));
    const payload: E2eeV1Payload = {
      e2ee: true,
      v: 1,
      iv: bytesToBase64(iv),
      ct: bytesToBase64(ct),
    };
    return JSON.stringify(payload);
  }

  async decrypt(encryptedJson: string, sharedKey: K): Promise<string> {
    const parsed = parseEnvelope(encryptedJson);
    if (parsed.v !== 1) throw new Error('Expected a v1 E2EE payload');
    const plain = await this.backend.decrypt(
      sharedKey,
      base64ToBytes(parsed.iv),
      base64ToBytes(parsed.ct),
    );
    return utf8Decode(plain);
  }

  /** v2: one recipient device, dialog-bound AAD. */
  async encryptV2(plaintext: string, sharedKey: K, from: string, aad: MessageAad): Promise<string> {
    const iv = this.backend.randomBytes(12);
    const ct = await this.backend.encrypt(
      sharedKey,
      iv,
      utf8Encode(plaintext),
      utf8Encode(encodeMessageAad(2, aad)),
    );
    const payload: E2eeV2Payload = {
      e2ee: true,
      v: 2,
      iv: bytesToBase64(iv),
      ct: bytesToBase64(ct),
      from,
      aad: { ...aad },
    };
    return JSON.stringify(payload);
  }

  /**
   * The aad claims MUST match the receiver's own context — a transplanted
   * envelope (wrong dialog/author) fails here instead of misattributing.
   */
  async decryptV2(
    envelopeJson: string,
    sharedKey: K,
    expected: { conversationId: string; senderId: string },
  ): Promise<{ text: string; aad: MessageAad }> {
    const parsed = parseEnvelope(envelopeJson);
    if (parsed.v !== 2) throw new Error('Expected a v2 E2EE payload');
    if (
      parsed.aad.conversationId !== expected.conversationId ||
      parsed.aad.senderId !== expected.senderId
    ) {
      throw new Error('E2EE dialog binding mismatch (possible transplant)');
    }
    const plain = await this.backend.decrypt(
      sharedKey,
      base64ToBytes(parsed.iv),
      base64ToBytes(parsed.ct),
      utf8Encode(encodeMessageAad(2, parsed.aad)),
    );
    return { text: utf8Decode(plain), aad: parsed.aad };
  }

  /**
   * v3: one content ciphertext plus a per-device wrapped content key. The
   * sender's own device is wrapped first (history reads); wrap AAD binds
   * sender->recipient so wraps cannot be transplanted between devices.
   */
  async encryptV3(
    plaintext: string,
    recipients: DeviceKeyRef[],
    opts: {
      from: string;
      ownPublicSpki: string;
      conversationId: string;
      senderId: string;
      seq: number;
    },
  ): Promise<string> {
    const aad: MessageAad = {
      conversationId: opts.conversationId,
      senderId: opts.senderId,
      senderDevice: opts.from,
      seq: opts.seq,
    };
    const rawContentKey = this.backend.randomBytes(32);
    const contentKey = await this.backend.importContentKey(rawContentKey);
    const iv = this.backend.randomBytes(12);
    const ct = await this.backend.encrypt(
      contentKey,
      iv,
      utf8Encode(plaintext),
      utf8Encode(encodeMessageAad(3, aad)),
    );
    const targets: DeviceKeyRef[] = [
      { deviceId: opts.from, publicKeySpki: opts.ownPublicSpki },
      ...recipients,
    ];
    const keys: Record<string, WrappedContentKey> = {};
    for (const target of targets) {
      if (!target.deviceId || !target.publicKeySpki || keys[target.deviceId]) continue;
      const shared = await this.getSharedKey(target.publicKeySpki);
      const wrapIv = this.backend.randomBytes(12);
      const wrapped = await this.backend.encrypt(
        shared,
        wrapIv,
        rawContentKey,
        utf8Encode(encodeWrapAad(opts.from, target.deviceId)),
      );
      keys[target.deviceId] = { iv: bytesToBase64(wrapIv), k: bytesToBase64(wrapped) };
    }
    if (!keys[opts.from]) throw new Error('E2EE v3 self-wrap failed');
    const payload: E2eeV3Payload = {
      e2ee: true,
      v: 3,
      iv: bytesToBase64(iv),
      ct: bytesToBase64(ct),
      from: opts.from,
      keys,
      aad,
    };
    return JSON.stringify(payload);
  }

  /** Sender device keys arrive as arguments (directory data, verified upstream). */
  async decryptV3(
    envelopeJson: string,
    senderDevices: DeviceKeyRef[],
    opts: { ownDeviceId: string; conversationId: string; senderId: string },
  ): Promise<{ text: string; aad: MessageAad }> {
    const parsed = parseEnvelope(envelopeJson);
    if (parsed.v !== 3) throw new Error('Expected a v3 E2EE payload');
    if (
      parsed.aad.conversationId !== opts.conversationId ||
      parsed.aad.senderId !== opts.senderId
    ) {
      throw new Error('E2EE dialog binding mismatch (possible transplant)');
    }
    let wrapDeviceId = opts.ownDeviceId;
    let entry = parsed.keys[wrapDeviceId];
    if (!entry && parsed.keys['legacy']) {
      wrapDeviceId = 'legacy';
      entry = parsed.keys['legacy'];
    }
    if (!entry) throw new Error('E2EE v3 has no content-key wrap for this device');
    const sender = senderDevices.find((d) => d.deviceId === parsed.from);
    if (!sender) throw new Error('E2EE v3 sender device is unknown');
    const shared = await this.getSharedKey(sender.publicKeySpki);
    let rawContentKey: Uint8Array<ArrayBuffer>;
    try {
      rawContentKey = await this.backend.decrypt(
        shared,
        base64ToBytes(entry.iv),
        base64ToBytes(entry.k),
        utf8Encode(encodeWrapAad(parsed.from, wrapDeviceId)),
      );
    } catch {
      throw new Error('E2EE v3 content-key unwrap failed');
    }
    const contentKey = await this.backend.importContentKey(rawContentKey);
    const plain = await this.backend.decrypt(
      contentKey,
      base64ToBytes(parsed.iv),
      base64ToBytes(parsed.ct),
      utf8Encode(encodeMessageAad(3, parsed.aad)),
    );
    return { text: utf8Decode(plain), aad: parsed.aad };
  }

  isEncrypted(body?: string | null): boolean {
    return isEncryptedEnvelope(body);
  }
}

const P256_SPKI_PREFIX = '3059301306072a8648ce3d020106082a8648ce3d030107034200';

/** SPKI DER (base64) for an uncompressed P-256 point (0x04 || X || Y). */
export function p256SpkiFromUncompressed(point: Uint8Array): string {
  if (point.length !== 65 || point[0] !== 4)
    throw new Error('Expected an uncompressed P-256 point');
  const prefix = new Uint8Array(P256_SPKI_PREFIX.length / 2);
  for (let i = 0; i < prefix.length; i++)
    prefix[i] = parseInt(P256_SPKI_PREFIX.slice(i * 2, i * 2 + 2), 16);
  const out = new Uint8Array(prefix.length + point.length);
  out.set(prefix);
  out.set(point, prefix.length);
  return bytesToBase64(out);
}

/** Uncompressed P-256 point from SPKI DER (base64). Rejects anything else. */
export function p256UncompressedFromSpki(spkiB64: string): Uint8Array<ArrayBuffer> {
  const der = base64ToBytes(spkiB64);
  if (der.length !== 91 || bytesToHex(der.subarray(0, 26)) !== P256_SPKI_PREFIX) {
    throw new Error('Unsupported public key: expected P-256 SPKI');
  }
  return der.slice(26);
}

/** WebCrypto backend; the identity private key stays a non-extractable CryptoKey. */
export function createWebCryptoBackend(
  getPrivateKey: () => Promise<CryptoKey>,
  getCrypto: () => Crypto = () => globalThis.crypto,
): E2eeBackend<CryptoKey> {
  const subtle = () => getCrypto().subtle;
  return {
    async deriveSharedKey(peerPublicKeySpki) {
      const peer = await subtle().importKey(
        'spki',
        base64ToBytes(peerPublicKeySpki),
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        [],
      );
      return subtle().deriveKey(
        { name: 'ECDH', public: peer },
        await getPrivateKey(),
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );
    },
    importContentKey(raw) {
      return subtle().importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt',
      ]);
    },
    async encrypt(key, iv, plaintext, aad) {
      return new Uint8Array(
        await subtle().encrypt(
          aad ? { name: 'AES-GCM', iv, additionalData: aad } : { name: 'AES-GCM', iv },
          key,
          plaintext,
        ),
      );
    },
    async decrypt(key, iv, ciphertext, aad) {
      return new Uint8Array(
        await subtle().decrypt(
          aad ? { name: 'AES-GCM', iv, additionalData: aad } : { name: 'AES-GCM', iv },
          key,
          ciphertext,
        ),
      );
    },
    randomBytes(length) {
      return getCrypto().getRandomValues(new Uint8Array(length));
    },
  };
}
