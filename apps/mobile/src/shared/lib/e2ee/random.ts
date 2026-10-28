import * as ExpoCrypto from 'expo-crypto';

/** Hermes has no WebCrypto; route the global CSPRNG through the OS generator. */
export function ensureSecureRandom(): void {
  const target = globalThis as { crypto?: Partial<Crypto> };
  if (typeof target.crypto?.getRandomValues === 'function') return;
  target.crypto = {
    ...(target.crypto ?? {}),
    getRandomValues: <T extends ArrayBufferView | null>(array: T): T =>
      ExpoCrypto.getRandomValues(array as unknown as Uint8Array) as unknown as T,
  };
}

export function secureRandomBytes(length: number): Uint8Array {
  return ExpoCrypto.getRandomBytes(length);
}

export function secureRandomUuid(): string {
  return ExpoCrypto.randomUUID();
}
