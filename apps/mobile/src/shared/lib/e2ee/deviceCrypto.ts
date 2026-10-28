import * as SecureStore from 'expo-secure-store';
import { E2eeProtocol, bytesToHex } from '@social-network/shared-crypto';
import { createNobleBackend, generatePrivateKey, publicSpkiFromPrivate } from './nobleBackend';
import { ensureSecureRandom, secureRandomBytes, secureRandomUuid } from './random';

const PRIVATE_KEY = 'e2ee_message_identity_v1';
const DEVICE_KEY = 'e2ee_device_id_v1';
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const hexToBytes = (hex: string) => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
};

let privateKey: Uint8Array | null = null;
let publicKeySpki: string | null = null;
let deviceId: string | null = null;
let loading: Promise<{ publicKeySpki: string }> | null = null;

/**
 * Native device identity: a P-256 key in the Keychain/Keystore, never synced
 * to backups (THIS_DEVICE_ONLY), so a restored phone registers as a new device.
 */
export function initDeviceIdentity(): Promise<{ publicKeySpki: string }> {
  if (privateKey && publicKeySpki) return Promise.resolve({ publicKeySpki });
  loading ??= (async () => {
    ensureSecureRandom();
    let hex = await SecureStore.getItemAsync(PRIVATE_KEY, options);
    if (!hex || !/^[0-9a-f]{64}$/.test(hex)) {
      hex = bytesToHex(generatePrivateKey(secureRandomBytes));
      await SecureStore.setItemAsync(PRIVATE_KEY, hex, options);
    }
    privateKey = hexToBytes(hex);
    publicKeySpki = publicSpkiFromPrivate(privateKey);
    return { publicKeySpki };
  })().finally(() => {
    loading = null;
  });
  return loading;
}

export async function getDeviceId(): Promise<string> {
  if (deviceId) return deviceId;
  let id = await SecureStore.getItemAsync(DEVICE_KEY, options);
  if (!id) {
    id = `mobile-${secureRandomUuid()}`;
    await SecureStore.setItemAsync(DEVICE_KEY, id, options);
  }
  deviceId = id;
  return id;
}

export const deviceProtocol: E2eeProtocol<object> = new E2eeProtocol(
  createNobleBackend(async () => {
    if (!privateKey) await initDeviceIdentity();
    return privateKey as Uint8Array;
  }, secureRandomBytes),
);
