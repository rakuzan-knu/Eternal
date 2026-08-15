const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

export type DeriveAlgo = 'PBKDF2' | 'SHA-256';

export interface DerivedPassword {
  salt: string;
  hash: string;
  algo: DeriveAlgo;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(view.byteLength);
  new Uint8Array(buffer).set(view);
  return buffer;
}

function subtle(): SubtleCrypto | null {
  if (typeof crypto !== 'undefined' && crypto.subtle) return crypto.subtle;
  return null;
}

function randomSalt(): Uint8Array {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  return salt;
}

async function deriveHex(password: string, salt: Uint8Array, algo: DeriveAlgo): Promise<string> {
  const enc = new TextEncoder();
  const s = subtle();
  if (!s) {
    throw new Error('Web Crypto subtle API unavailable');
  }

  if (algo === 'PBKDF2') {
    const keyMaterial = await s.importKey(
      'raw',
      toArrayBuffer(enc.encode(password)),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await s.deriveBits(
      {
        name: 'PBKDF2',
        salt: toArrayBuffer(salt),
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      KEY_BITS,
    );
    return toHex(new Uint8Array(bits));
  }

  const pw = enc.encode(password);
  const combined = new Uint8Array(salt.length + pw.length);
  combined.set(salt, 0);
  combined.set(pw, salt.length);
  const digest = await s.digest('SHA-256', toArrayBuffer(combined));
  return toHex(new Uint8Array(digest));
}

async function pickAlgoAndDerive(
  password: string,
  salt: Uint8Array,
): Promise<{ hash: string; algo: DeriveAlgo }> {
  try {
    const hash = await deriveHex(password, salt, 'PBKDF2');
    return { hash, algo: 'PBKDF2' };
  } catch {
    const hash = await deriveHex(password, salt, 'SHA-256');
    return { hash, algo: 'SHA-256' };
  }
}

export async function derivePassword(password: string): Promise<DerivedPassword> {
  const salt = randomSalt();
  const { hash, algo } = await pickAlgoAndDerive(password, salt);
  return { salt: toHex(salt), hash, algo };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyPassword(password: string, stored: DerivedPassword): Promise<boolean> {
  const salt = fromHex(stored.salt);
  const hash = await deriveHex(password, salt, stored.algo);
  return timingSafeEqual(hash, stored.hash);
}
