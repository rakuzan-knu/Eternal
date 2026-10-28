import * as ExpoCrypto from 'expo-crypto';
import {
  base64ToBytes,
  bytesToHex,
  isEncryptedEnvelope,
  parseEnvelope,
  type ParsedEnvelope,
} from '@social-network/shared-crypto';
import { getMobileApi } from '@/shared/api/client';
import { deviceProtocol, getDeviceId, initDeviceIdentity } from './deviceCrypto';
import {
  checkInboundFreshness,
  clearReplayScopesForDevice,
  isKnownDuplicate,
  readPin,
  writePin,
} from './e2eeState';

/** Newest envelope version this client WRITES (reads v1..CURRENT). */
export const MESSAGE_E2EE_WRITE_VERSION = 3;
export const LOCKED_LABEL = 'End-to-End Encrypted message';
const PEER_KEY_TTL_MS = 15_000;

/** Thrown when a pinned peer device key changes or becomes unverifiable. */
export class E2eePinChangedError extends Error {
  constructor(
    readonly userId: string,
    readonly deviceId: string,
  ) {
    super('This contact’s security key changed. Sending is blocked until the new key is accepted.');
    this.name = 'E2eePinChangedError';
  }
}

export interface PeerDevice {
  readonly deviceId: string;
  readonly publicKey: string;
  readonly e2eeVersion: number;
  readonly updatedAt: string;
}

export type DecryptStatus = 'plain' | 'decrypted' | 'locked' | 'replay' | 'error';
export interface DecryptResult {
  readonly status: DecryptStatus;
  readonly text: string;
  readonly keyChangedUserId?: string;
}

const deviceCache = new Map<string, { devices: PeerDevice[]; at: number }>();
let registered = false;

export const effectiveDeviceVersion = (device: PeerDevice) =>
  !Number.isInteger(device.e2eeVersion) || device.e2eeVersion < 1
    ? 1
    : Math.min(device.e2eeVersion, MESSAGE_E2EE_WRITE_VERSION);

export async function fingerprintKey(spkiB64: string): Promise<string> {
  const digest = await ExpoCrypto.digest(
    ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    base64ToBytes(spkiB64),
  );
  return bytesToHex(new Uint8Array(digest));
}

const sha256Text = (text: string) =>
  ExpoCrypto.digestStringAsync(ExpoCrypto.CryptoDigestAlgorithm.SHA256, text);

const pinScope = (userId: string, deviceId: string) => `${userId}:${deviceId}`;

/**
 * TOFU: first sight pins; a later different/unverifiable key throws, which
 * also closes the downgrade hole (garbage keys can't force plaintext).
 */
export async function verifyPeerDevicePin(userId: string, deviceId: string, spki: string) {
  let fingerprint: string | null = null;
  try {
    fingerprint = (await fingerprintKey(spki)).toLowerCase();
  } catch {
    fingerprint = null;
  }
  const scope = pinScope(userId, deviceId);
  const pinned = await readPin(scope);
  if (!pinned) {
    if (!fingerprint) return 'unusable' as const;
    await writePin(scope, fingerprint).catch(() => undefined);
    return 'pinned' as const;
  }
  if (!fingerprint || fingerprint !== pinned) throw new E2eePinChangedError(userId, deviceId);
  return 'match' as const;
}

function sanitizeDevice(raw: unknown): PeerDevice | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  if (typeof rec.publicKey !== 'string' || !rec.publicKey || rec.publicKey.length > 8192)
    return null;
  if (typeof rec.deviceId !== 'string' || !rec.deviceId || rec.deviceId.length > 128) return null;
  if (rec.purpose && rec.purpose !== 'message') return null;
  return {
    deviceId: rec.deviceId,
    publicKey: rec.publicKey,
    e2eeVersion:
      typeof rec.e2eeVersion === 'number' &&
      Number.isInteger(rec.e2eeVersion) &&
      rec.e2eeVersion >= 1
        ? rec.e2eeVersion
        : 1,
    updatedAt: typeof rec.updatedAt === 'string' ? rec.updatedAt : '',
  };
}

async function fetchDeviceRecords(userId: string): Promise<PeerDevice[] | null> {
  const api = getMobileApi();
  const id = encodeURIComponent(userId);
  try {
    let data: { keys?: unknown };
    try {
      data = (await api.get<{ keys?: unknown }>(`/e2ee/keys/${id}/devices?purpose=message`)).data;
    } catch {
      data = (await api.get<{ keys?: unknown }>(`/e2ee/devices/${id}?purpose=message`)).data;
    }
    if (!data || !Array.isArray(data.keys)) return null;
    return data.keys.flatMap((key) => {
      const clean = sanitizeDevice(key);
      return clean ? [clean] : [];
    });
  } catch {
    return null;
  }
}

async function fetchLegacyDevice(userId: string): Promise<PeerDevice | null> {
  try {
    const { data } = await getMobileApi().get<{
      publicKey?: string;
      deviceId?: string;
      purpose?: string;
    }>(`/e2ee/keys/${encodeURIComponent(userId)}?purpose=message`);
    if (!data?.publicKey || (data.purpose && data.purpose !== 'message')) return null;
    return sanitizeDevice({
      deviceId: data.deviceId || 'legacy',
      publicKey: data.publicKey,
      e2eeVersion: 1,
    });
  } catch {
    return null;
  }
}

/** Verified device list for a peer (cached briefly). Throws on any pin change. */
export async function fetchPeerDevices(userId: string): Promise<PeerDevice[]> {
  const hit = deviceCache.get(userId);
  if (hit && Date.now() - hit.at < PEER_KEY_TTL_MS) return hit.devices;
  let candidates = await fetchDeviceRecords(userId);
  if (!candidates) {
    const legacy = await fetchLegacyDevice(userId);
    candidates = legacy ? [legacy] : [];
  }
  const verified: PeerDevice[] = [];
  for (const candidate of candidates) {
    const verdict = await verifyPeerDevicePin(userId, candidate.deviceId, candidate.publicKey);
    if (verdict !== 'unusable') verified.push(candidate);
  }
  verified.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  deviceCache.set(userId, { devices: verified, at: Date.now() });
  return verified;
}

export function evictPeerDeviceCache(userId?: string) {
  if (userId) deviceCache.delete(userId);
  else deviceCache.clear();
}

/** Explicit acceptance of a contact's new key: re-pin and reset their replay counters. */
export async function acceptPeerKeyChanges(userId: string): Promise<void> {
  const records = (await fetchDeviceRecords(userId)) ?? [];
  for (const record of records) {
    await deviceProtocol.getSharedKey(record.publicKey);
    await writePin(
      pinScope(userId, record.deviceId),
      (await fingerprintKey(record.publicKey)).toLowerCase(),
    );
    await clearReplayScopesForDevice(userId, record.deviceId);
  }
  deviceCache.delete(userId);
}

/** Publishes this device's message key; failure only means peers keep sending plaintext. */
export async function ensureMessageIdentityRegistered(): Promise<void> {
  if (registered) return;
  registered = true;
  try {
    const { publicKeySpki } = await initDeviceIdentity();
    await getMobileApi().post('/e2ee/keys', {
      publicKey: publicKeySpki,
      algorithm: 'prime256v1',
      purpose: 'message',
      deviceId: await getDeviceId(),
      e2eeVersion: MESSAGE_E2EE_WRITE_VERSION,
    });
  } catch {
    registered = false;
  }
}

export interface EncryptContext {
  readonly conversationId: string;
  readonly senderId: string;
  readonly seq: number;
}

/**
 * Encrypts for a 1:1 peer with the newest version all their devices read.
 * Returns null when encryption doesn't apply (no key, any failure) so the
 * caller sends plaintext like every other client — EXCEPT a pin change,
 * which propagates so sending blocks instead of downgrading.
 */
export async function encryptMessageForPeer(
  text: string,
  peerUserId: string | null | undefined,
  ctx: EncryptContext,
): Promise<string | null> {
  if (!text || !peerUserId) return null;
  if (!ctx.conversationId || !ctx.senderId || !Number.isInteger(ctx.seq) || ctx.seq < 0)
    throw new Error('E2EE encrypt context is incomplete');
  try {
    const { publicKeySpki } = await initDeviceIdentity();
    await ensureMessageIdentityRegistered();
    const devices = await fetchPeerDevices(peerUserId);
    if (devices.length === 0) return null;
    const from = await getDeviceId();
    const aad = {
      conversationId: ctx.conversationId,
      senderId: ctx.senderId,
      senderDevice: from,
      seq: ctx.seq,
    };
    const single = async (device: PeerDevice) => {
      const shared = await deviceProtocol.getSharedKey(device.publicKey);
      return effectiveDeviceVersion(device) < 2
        ? deviceProtocol.encrypt(text, shared)
        : deviceProtocol.encryptV2(text, shared, from, aad);
    };
    if (devices.length === 1) return single(devices[0] as PeerDevice);
    if (devices.every((device) => effectiveDeviceVersion(device) >= 3)) {
      return deviceProtocol.encryptV3(
        text,
        devices.map((device) => ({ deviceId: device.deviceId, publicKeySpki: device.publicKey })),
        {
          from,
          ownPublicSpki: publicKeySpki,
          conversationId: ctx.conversationId,
          senderId: ctx.senderId,
          seq: ctx.seq,
        },
      );
    }
    const best = [...devices].sort(
      (a, b) =>
        effectiveDeviceVersion(b) - effectiveDeviceVersion(a) ||
        (b.updatedAt || '').localeCompare(a.updatedAt || ''),
    )[0] as PeerDevice;
    return single(best);
  } catch (error) {
    if (error instanceof E2eePinChangedError) throw error;
    return null;
  }
}

export interface DecryptContext {
  readonly peerUserId?: string | null;
  readonly conversationId: string;
  readonly senderId: string;
}

const replayScope = (conversationId: string, senderId: string, device: string) =>
  `${conversationId}:${senderId}:${device}`;

/** Legacy dev-preview envelopes carried plaintext `text`; never render raw JSON. */
export function extractPlainPreview(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return raw;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const payload = parsed as Record<string, unknown>;
      if (payload.e2ee === true && typeof payload.text === 'string') return payload.text;
    }
  } catch {
    return raw;
  }
  return raw;
}

const isOperationError = (error: unknown) =>
  error instanceof Error &&
  (error.name === 'OperationError' || error.message.includes('OperationError'));

/** Decodes one message body for display with explicit, honest states. */
export async function decryptMessageForDisplay(
  body: string | null | undefined,
  ctx: DecryptContext,
): Promise<DecryptResult> {
  if (!body || !isEncryptedEnvelope(body))
    return { status: 'plain', text: extractPlainPreview(body ?? '') };
  let parsed: ParsedEnvelope;
  try {
    parsed = parseEnvelope(body);
  } catch {
    return { status: 'error', text: LOCKED_LABEL };
  }
  const ctHash = await sha256Text(body).catch(() => '');
  const { conversationId, senderId } = ctx;
  try {
    const { publicKeySpki } = await initDeviceIdentity();
    const ownDeviceId = await getDeviceId();

    if (parsed.v === 1) {
      const peer = ctx.peerUserId || senderId;
      const scope = replayScope(conversationId, senderId, 'v1');
      if (ctHash && (await isKnownDuplicate(scope, ctHash)))
        return { status: 'replay', text: LOCKED_LABEL };
      const peerSpki = (await fetchPeerDevices(peer))[0]?.publicKey;
      if (!peerSpki) return { status: 'locked', text: LOCKED_LABEL };
      const text = await deviceProtocol.decrypt(body, await deviceProtocol.getSharedKey(peerSpki));
      if (ctHash && (await checkInboundFreshness({ scope, ctHash })) === 'replay')
        return { status: 'replay', text: LOCKED_LABEL };
      return { status: 'decrypted', text };
    }

    if (parsed.aad.conversationId !== conversationId || parsed.aad.senderId !== senderId)
      return { status: 'error', text: LOCKED_LABEL };
    const scope = replayScope(conversationId, senderId, parsed.aad.senderDevice);
    if (ctHash && (await isKnownDuplicate(scope, ctHash)))
      return { status: 'replay', text: LOCKED_LABEL };

    const senderDevices = [...(await fetchPeerDevices(senderId))];
    let fromDevice = senderDevices.find((device) => device.deviceId === parsed.from);
    if (!fromDevice) {
      if (parsed.from !== ownDeviceId) return { status: 'locked', text: LOCKED_LABEL };
      fromDevice = {
        deviceId: ownDeviceId,
        publicKey: publicKeySpki,
        e2eeVersion: MESSAGE_E2EE_WRITE_VERSION,
        updatedAt: new Date().toISOString(),
      };
      senderDevices.push(fromDevice);
    }

    let text: string;
    let seq: number;
    const expected = { conversationId, senderId };
    if (parsed.v === 2) {
      const senderIsSelf =
        parsed.from === ownDeviceId || fromDevice.publicKey.trim() === publicKeySpki.trim();
      if (!senderIsSelf) {
        const res = await deviceProtocol.decryptV2(
          body,
          await deviceProtocol.getSharedKey(fromDevice.publicKey),
          expected,
        );
        text = res.text;
        seq = res.aad.seq;
      } else {
        const target = ctx.peerUserId || senderId;
        let unlocked: { text: string; seq: number } | null = null;
        let lastError: unknown = null;
        for (const candidate of (await fetchPeerDevices(target)).slice(0, 8)) {
          try {
            const res = await deviceProtocol.decryptV2(
              body,
              await deviceProtocol.getSharedKey(candidate.publicKey),
              expected,
            );
            unlocked = { text: res.text, seq: res.aad.seq };
            break;
          } catch (error) {
            lastError = error;
          }
        }
        if (!unlocked) throw lastError ?? new Error('E2EE v2 self-read failed');
        text = unlocked.text;
        seq = unlocked.seq;
      }
    } else {
      const res = await deviceProtocol.decryptV3(
        body,
        senderDevices.map((device) => ({
          deviceId: device.deviceId,
          publicKeySpki: device.publicKey,
        })),
        { ownDeviceId, conversationId, senderId },
      );
      text = res.text;
      seq = res.aad.seq;
    }
    if (ctHash && (await checkInboundFreshness({ scope, seq, ctHash })) === 'replay')
      return { status: 'replay', text: LOCKED_LABEL };
    return { status: 'decrypted', text };
  } catch (error) {
    if (ctx.peerUserId) evictPeerDeviceCache(ctx.peerUserId);
    evictPeerDeviceCache(senderId);
    if (error instanceof E2eePinChangedError)
      return { status: 'locked', text: LOCKED_LABEL, keyChangedUserId: error.userId };
    if (
      isOperationError(error) ||
      (error instanceof Error && /unwrap|no content-key|unknown/.test(error.message))
    )
      return { status: 'locked', text: LOCKED_LABEL };
    return { status: 'error', text: LOCKED_LABEL };
  }
}

export function __resetMessageE2eeForTests() {
  deviceCache.clear();
  registered = false;
}
