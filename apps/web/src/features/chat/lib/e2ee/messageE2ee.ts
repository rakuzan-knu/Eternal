/**
 * Message-layer E2EE orchestration (1:1 DIRECT conversations).
 *
 * Crypto lives in `@/shared/lib/crypto/e2ee` (pure); this module adds the
 * product wiring: multi-device directory (purpose=message), TOFU pins,
 * version dispatch (v1 legacy / v2 AAD / v3 hybrid), replay protection, and
 * graceful degradation. Rules:
 *  - Encrypt ONLY for DIRECT 1:1 conversations when the peer published
 *    message key(s). Everything else (groups, keyless peers, any failure)
 *    sends plaintext exactly as before — sending must never break, EXCEPT
 *    on suspected key substitution (pin change), which blocks loudly.
 *  - Decrypt is best-effort with explicit states ('decrypted' | 'locked' |
 *    'replay' | 'error') so the UI can render honestly.
 *  - Attachments are out of scope (text bodies only).
 *
 * Version rule (wire contract, see docs/security/MESSAGE_E2EE_PROTOCOL.md):
 * readers MUST accept every older envelope version; writers pick the newest
 * version ALL recipient devices support (unknown future versions are capped
 * to the newest known for writing).
 */

import { apiClient } from '@/shared/api/httpClient';
import { e2eeManager, parseEnvelope, sha256HexText } from '@/shared/lib/crypto/e2ee';
import { fingerprintIdentityKey, getDeviceId } from './identityKeys';
import { checkInboundFreshness, clearReplayScopesForDevice, isKnownDuplicate } from './replayStore';

export type MessageKeyPurpose = 'call' | 'message';

/** Newest envelope version this client WRITES (reads v1..CURRENT). */
export const MESSAGE_E2EE_WRITE_VERSION = 3;

/** Thrown when a pinned peer device key changes or becomes unverifiable. */
export class E2eePinChangedError extends Error {
  readonly userId: string;
  readonly deviceId: string;

  constructor(userId: string, deviceId: string) {
    super(
      'This contact\u2019s security key changed. Sending is blocked until the new key is accepted.',
    );
    this.name = 'E2eePinChangedError';
    this.userId = userId;
    this.deviceId = deviceId;
  }
}

export interface PeerDevice {
  readonly deviceId: string;
  readonly publicKey: string;
  /** Directory-reported version; unknown futures are capped at WRITE_VERSION for writing. */
  readonly e2eeVersion: number;
  readonly updatedAt: string;
}

export function effectiveDeviceVersion(device: PeerDevice): number {
  if (!Number.isInteger(device.e2eeVersion) || device.e2eeVersion < 1) return 1;
  return Math.min(device.e2eeVersion, MESSAGE_E2EE_WRITE_VERSION);
}

interface DirectoryKey {
  publicKey?: string;
  deviceId?: string;
}

interface DirectoryDeviceList {
  keys?: unknown;
}

const LOCKED_LABEL = 'End-to-End Encrypted message';

const deviceCache = new Map<string, { devices: PeerDevice[]; at: number }>();
const PEER_KEY_TTL_MS = 5 * 60 * 1000;
let registeredThisSession = false;

// ---------------------------------------------------------------------------
// TOFU pins (per SENDER device — two devices of one user pin independently)
// ---------------------------------------------------------------------------

const MSG_PINS_KEY = 'e2ee_message_pins_v1';

function pinScope(userId: string, deviceId: string): string {
  return `${userId}:${deviceId}`;
}

function readPins(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MSG_PINS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // Corrupt pins: treat as empty (forces re-pin, fail safe).
  }
  return {};
}

/**
 * Verifies a directory device key against its TOFU pin.
 * - First sight of a verifiable key: pins it, returns 'pinned'.
 * - No pin + unverifiable key (malformed): 'unusable' — caller treats the
 *   device as absent (legacy fail-open path, never pinned).
 * - Pinned but different/unverifiable now: throws E2eePinChangedError.
 *   This also closes the downgrade hole: after the first good pin, a
 *   garbage key served to force plaintext can no longer pass.
 */
export async function verifyPeerDevicePin(
  userId: string,
  deviceId: string,
  spki: string,
): Promise<'match' | 'pinned' | 'unusable'> {
  let fingerprint: string | null = null;
  try {
    fingerprint = (await fingerprintIdentityKey(spki)).toLowerCase();
  } catch {
    fingerprint = null;
  }
  const pins = readPins();
  const scope = pinScope(userId, deviceId);
  const pinned = pins[scope];
  if (!pinned) {
    if (!fingerprint) return 'unusable';
    try {
      pins[scope] = fingerprint;
      localStorage.setItem(MSG_PINS_KEY, JSON.stringify(pins));
    } catch {
      // Storage failure: proceed unpinned (degrades to re-pin next time).
    }
    return 'pinned';
  }
  if (!fingerprint || fingerprint !== pinned) {
    throw new E2eePinChangedError(userId, deviceId);
  }
  return 'match';
}

/**
 * Explicit user acceptance of a device's new key (future safety UI calls
 * this): re-pins the CURRENT directory key and drops replay watermarks for
 * the device (a wiped sender restarts its counter).
 */
export async function acceptPeerDeviceKeyChange(userId: string, deviceId: string): Promise<void> {
  const records = await fetchPeerDeviceRecords(userId);
  const record = records?.find((d) => d.deviceId === deviceId);
  if (!record) throw new Error('Peer device is not in the directory');
  // Refuse to pin garbage: the key must at least import.
  await e2eeManager.getSharedKey(record.publicKey);
  const fingerprint = (await fingerprintIdentityKey(record.publicKey)).toLowerCase();
  const pins = readPins();
  pins[pinScope(userId, deviceId)] = fingerprint;
  try {
    localStorage.setItem(MSG_PINS_KEY, JSON.stringify(pins));
  } catch {
    // Best effort; the session continues pinned in memory? No — fail loudly.
    throw new Error('Could not persist the accepted key');
  }
  clearReplayScopesForDevice(userId, deviceId);
  // Drop the cached directory entry so the fresh key takes effect now,
  // not at the next 5-minute cache expiry.
  deviceCache.delete(userId);
}

// ---------------------------------------------------------------------------
// Directory: multi-device fetch with legacy fallback
// ---------------------------------------------------------------------------

function sanitizeDeviceRecord(raw: unknown): PeerDevice | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  if (
    typeof rec.publicKey !== 'string' ||
    rec.publicKey.length === 0 ||
    rec.publicKey.length > 8192
  ) {
    return null;
  }
  if (typeof rec.deviceId !== 'string' || rec.deviceId.length === 0 || rec.deviceId.length > 128) {
    return null;
  }
  const version =
    typeof rec.e2eeVersion === 'number' && Number.isInteger(rec.e2eeVersion) && rec.e2eeVersion >= 1
      ? rec.e2eeVersion
      : 1;
  return {
    deviceId: rec.deviceId,
    publicKey: rec.publicKey,
    e2eeVersion: version,
    updatedAt: typeof rec.updatedAt === 'string' ? rec.updatedAt : '',
  };
}

/** Raw directory read: modern /devices endpoint, null when unavailable (old backend). */
async function fetchPeerDeviceRecords(userId: string): Promise<PeerDevice[] | null> {
  try {
    const res = await apiClient.get<DirectoryDeviceList>(
      `/e2ee/keys/${encodeURIComponent(userId)}/devices?purpose=message`,
    );
    const data =
      (res as { data?: DirectoryDeviceList }).data ?? (res as unknown as DirectoryDeviceList);
    if (!data || !Array.isArray(data.keys)) return null;
    return (data.keys as unknown[]).flatMap((k) => {
      const clean = sanitizeDeviceRecord(k);
      return clean ? [clean] : [];
    });
  } catch {
    return null;
  }
}

/** Legacy singular read (old backend): synthesizes a versionless device. */
async function fetchLegacyPeerDevice(userId: string): Promise<PeerDevice | null> {
  try {
    const res = await apiClient.get<DirectoryKey>(
      `/e2ee/keys/${encodeURIComponent(userId)}?purpose=message`,
    );
    const data = (res as { data?: DirectoryKey }).data ?? (res as unknown as DirectoryKey);
    if (!data || typeof data.publicKey !== 'string' || data.publicKey.length === 0) return null;
    const clean = sanitizeDeviceRecord({
      deviceId: data.deviceId || 'legacy',
      publicKey: data.publicKey,
      e2eeVersion: 1,
    });
    return clean;
  } catch {
    return null;
  }
}

/**
 * Verified device list for a peer (cached 5 min). Throws E2eePinChangedError
 * when ANY known device key changed — the caller must block, not downgrade.
 */
export async function fetchPeerDevices(userId: string): Promise<PeerDevice[]> {
  const now = Date.now();
  const hit = deviceCache.get(userId);
  if (hit && now - hit.at < PEER_KEY_TTL_MS) return hit.devices;

  const records = await fetchPeerDeviceRecords(userId);
  const candidates: PeerDevice[] =
    records ?? (await fetchLegacyPeerDevice(userId).then((d) => (d ? [d] : [])));
  const verified: PeerDevice[] = [];
  for (const candidate of candidates) {
    const verdict = await verifyPeerDevicePin(userId, candidate.deviceId, candidate.publicKey);
    if (verdict !== 'unusable') verified.push(candidate);
  }
  // Deterministic order: newest registration first (drives single-device pick).
  verified.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  deviceCache.set(userId, { devices: verified, at: now });
  return verified;
}

/** Legacy single-key read (v1 path): most recent verified device. */
export async function fetchPeerMessageKey(peerUserId: string): Promise<string | null> {
  const devices = await fetchPeerDevices(peerUserId);
  return devices[0]?.publicKey ?? null;
}

/** Test/seam hooks (not part of the product surface). */
export function __resetMessageE2eeForTests(): void {
  deviceCache.clear();
  registeredThisSession = false;
  try {
    localStorage.removeItem(MSG_PINS_KEY);
  } catch {
    // Best effort.
  }
}

/** Drops cached directory entries (rotation recovery, tests). */
export function evictPeerDeviceCache(userId?: string): void {
  if (userId) deviceCache.delete(userId);
  else deviceCache.clear();
}

/** Minimal structural view of a conversation for 1:1 peer resolution. */
export interface ConversationPeerView {
  readonly id: string;
  readonly type?: string;
  readonly participants?: ReadonlyArray<{ readonly userId?: string } | null | undefined> | null;
}

/**
 * Resolves the 1:1 peer for DIRECT conversations, or null for groups /
 * unknown conversations (encryption does not apply there).
 */
export function resolveDirectPeerUserId(
  conversations: ReadonlyArray<ConversationPeerView> | undefined | null,
  conversationId: string | null | undefined,
  ownUserId: string | null | undefined,
): string | null {
  if (!conversations || !conversationId || !ownUserId) return null;
  const conv = conversations.find((c) => c?.id === conversationId);
  if (!conv || (conv.type && conv.type !== 'DIRECT')) return null;
  const peer = conv.participants?.find((p) => p?.userId && p.userId !== ownUserId);
  return peer?.userId ?? null;
}

/**
 * Best-effort identity bootstrap for the message slot. Fire-and-forget from
 * callers (`void ensure...`): a missing directory entry only means future
 * sends stay plaintext.
 */
export async function ensureMessageIdentityRegistered(): Promise<void> {
  if (registeredThisSession) return;
  registeredThisSession = true;
  try {
    const { publicKeySpki } = await e2eeManager.init();
    await apiClient.post('/e2ee/keys', {
      publicKey: publicKeySpki,
      algorithm: 'prime256v1',
      purpose: 'message',
      deviceId: getDeviceId(),
      e2eeVersion: MESSAGE_E2EE_WRITE_VERSION,
    });
  } catch {
    registeredThisSession = false;
  }
}

export interface EncryptContext {
  readonly conversationId: string;
  readonly senderId: string;
  readonly seq: number;
}

function validEncryptContext(ctx: EncryptContext | null | undefined): ctx is EncryptContext {
  return (
    !!ctx &&
    typeof ctx.conversationId === 'string' &&
    ctx.conversationId.length > 0 &&
    typeof ctx.senderId === 'string' &&
    ctx.senderId.length > 0 &&
    Number.isInteger(ctx.seq) &&
    ctx.seq >= 0
  );
}

/**
 * Encrypts a text body for a 1:1 peer, dispatching v1/v2/v3 by directory
 * capability (newest version ALL recipient devices support):
 *  - single versionless device → v1 (byte-identical to the legacy path,
 *    readable by old clients);
 *  - single v2+ device → v2 (dialog-bound);
 *  - all v3 → v3 hybrid (one ciphertext, per-device wraps + own wrap).
 * Mixed-version multi-device (transient rollout) falls back to the best
 * single device with a loud warning — other devices show locked, never
 * silent misdecryption.
 *
 * Returns null when encryption is not applicable (no peer, no peer key, any
 * failure) — callers then send plaintext exactly as before. The ONLY
 * exception is E2eePinChangedError, which MUST propagate so the caller
 * blocks instead of downgrading under suspected substitution.
 */
export async function encryptMessageForPeer(
  text: string,
  peerUserId: string | null | undefined,
  ctx: EncryptContext,
): Promise<string | null> {
  if (!text || !peerUserId) return null;
  if (!validEncryptContext(ctx)) throw new Error('E2EE encrypt context is incomplete');
  try {
    await e2eeManager.init();
    const devices = await fetchPeerDevices(peerUserId);
    if (devices.length === 0) return null;
    const from = getDeviceId();

    if (devices.length === 1) {
      const [device] = devices;
      const shared = await e2eeManager.getSharedKey(device.publicKey);
      if (effectiveDeviceVersion(device) < 2) {
        return e2eeManager.encrypt(text, shared);
      }
      return e2eeManager.encryptV2(text, shared, from, {
        conversationId: ctx.conversationId,
        senderId: ctx.senderId,
        senderDevice: from,
        seq: ctx.seq,
      });
    }

    if (devices.every((d) => effectiveDeviceVersion(d) >= 3)) {
      const { publicKeySpki } = await e2eeManager.init();
      return e2eeManager.encryptV3(
        text,
        devices.map((d) => ({ deviceId: d.deviceId, publicKeySpki: d.publicKey })),
        {
          from,
          ownPublicSpki: publicKeySpki,
          conversationId: ctx.conversationId,
          senderId: ctx.senderId,
          seq: ctx.seq,
        },
      );
    }

    console.warn(
      '[e2ee] mixed-version peer devices — falling back to the best single device (others will show locked)',
    );
    const best = [...devices].sort(
      (a, b) =>
        effectiveDeviceVersion(b) - effectiveDeviceVersion(a) ||
        (b.updatedAt || '').localeCompare(a.updatedAt || ''),
    )[0];
    const shared = await e2eeManager.getSharedKey(best.publicKey);
    if (effectiveDeviceVersion(best) < 2) return e2eeManager.encrypt(text, shared);
    return e2eeManager.encryptV2(text, shared, from, {
      conversationId: ctx.conversationId,
      senderId: ctx.senderId,
      senderDevice: from,
      seq: ctx.seq,
    });
  } catch (err) {
    if (err instanceof E2eePinChangedError) throw err;
    return null;
  }
}

export type DecryptStatus = 'plain' | 'decrypted' | 'locked' | 'replay' | 'error';

export interface DecryptResult {
  readonly status: DecryptStatus;
  /** Decoded text for plain/decrypted; fallback label otherwise. */
  readonly text: string;
}

export interface DecryptContext {
  /** 1:1 partner for key agreement (v1 path; both directions). */
  readonly peerUserId?: string | null;
  readonly conversationId?: string | null;
  readonly senderId?: string | null;
}

/**
 * Display-safe preview of a non-envelope body. Legacy dev-preview envelopes
 * carried plaintext `text` — show it, never raw JSON.
 */
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
    // Not JSON — fall through to raw text.
  }
  return raw;
}

/**
 * Resolves the prefill text for the edit flow. Plaintext (and legacy preview
 * shapes) pass through; real envelopes must decrypt — an undecryptable
 * message is NOT editable (prefilling the lock label would corrupt it on
 * save, prefilling ciphertext would leak it into the prompt).
 */
export async function resolveEditableText(
  body: string | null | undefined,
  ctx: DecryptContext,
): Promise<{ readonly editable: boolean; readonly text: string }> {
  if (!body) return { editable: true, text: '' };
  if (!e2eeManager.isEncrypted(body)) return { editable: true, text: extractPlainPreview(body) };
  const res = await decryptMessageForDisplay(body, ctx);
  if (res.status !== 'decrypted') return { editable: false, text: '' };
  return { editable: true, text: res.text };
}

function replayScope(conversationId: string, senderId: string, device: string): string {
  return `${conversationId}:${senderId}:${device}`;
}

/**
 * Decodes one message body for display.
 *
 * v1 (legacy, no binding): shared secret always involves the 1:1 peer key,
 * both directions.
 * v2/v3 (bound): aad claims are checked against the receiver's own context
 * (transplants fail loudly); the sender's `from` device key unwraps; replay
 * scope is (conversation, sender, sending device).
 */
export async function decryptMessageForDisplay(
  body: string | null | undefined,
  ctx: DecryptContext,
): Promise<DecryptResult> {
  if (!body || !e2eeManager.isEncrypted(body)) {
    return { status: 'plain', text: body ?? '' };
  }
  let parsed: ReturnType<typeof parseEnvelope>;
  try {
    parsed = parseEnvelope(body);
  } catch {
    return { status: 'error', text: LOCKED_LABEL };
  }

  const ctHash = await sha256HexText(body).catch(() => '');

  try {
    await e2eeManager.init();

    if (parsed.v === 1) {
      if (!ctx.peerUserId) return { status: 'locked', text: LOCKED_LABEL };
      if (
        ctHash &&
        isKnownDuplicate(
          replayScope(ctx.conversationId ?? '', ctx.senderId ?? ctx.peerUserId, 'v1'),
          ctHash,
        )
      ) {
        return { status: 'replay', text: LOCKED_LABEL };
      }
      const peerSpki = await fetchPeerMessageKey(ctx.peerUserId);
      if (!peerSpki) return { status: 'locked', text: LOCKED_LABEL };
      const sharedKey = await e2eeManager.getSharedKey(peerSpki);
      const text = await e2eeManager.decrypt(body, sharedKey);
      if (ctHash) {
        const freshness = await checkInboundFreshness({
          scope: replayScope(ctx.conversationId ?? '', ctx.senderId ?? ctx.peerUserId, 'v1'),
          ctHash,
        });
        if (freshness.verdict === 'replay') {
          console.warn('[e2ee] replayed v1 envelope rejected');
          return { status: 'replay', text: LOCKED_LABEL };
        }
      }
      return { status: 'decrypted', text };
    }

    // v2/v3: binding first, network second.
    const conversationId = ctx.conversationId ?? '';
    const senderId = ctx.senderId ?? '';
    if (!conversationId || !senderId) {
      console.error('[e2ee] bound envelope without receiver context');
      return { status: 'locked', text: LOCKED_LABEL };
    }
    if (parsed.aad.conversationId !== conversationId || parsed.aad.senderId !== senderId) {
      console.warn('[e2ee] envelope dialog binding mismatch — possible transplant');
      return { status: 'error', text: LOCKED_LABEL };
    }
    const scope = replayScope(conversationId, senderId, parsed.aad.senderDevice);
    if (ctHash && isKnownDuplicate(scope, ctHash)) {
      console.warn('[e2ee] replayed envelope rejected');
      return { status: 'replay', text: LOCKED_LABEL };
    }

    const senderDevices = await fetchPeerDevices(senderId);
    const fromDevice = senderDevices.find((d) => d.deviceId === parsed.from);
    if (!fromDevice) return { status: 'locked', text: LOCKED_LABEL };

    let text: string;
    let seq: number;
    if (parsed.v === 2) {
      const { publicKeySpki: ownSpki } = await e2eeManager.init();
      const senderIsSelf = fromDevice.publicKey.trim() === ownSpki.trim();
      if (!senderIsSelf) {
        const sharedKey = await e2eeManager.getSharedKey(fromDevice.publicKey);
        const res = await e2eeManager.decryptV2(body, sharedKey, { conversationId, senderId });
        text = res.text;
        seq = res.aad.seq;
      } else {
        // Own v2 message (v2 has no self-wrap, unlike v3): re-derive against
        // the conversation peer's device key(s), newest first. Sending and
        // reading use the same agreement, so exactly one candidate opens it.
        if (!ctx.peerUserId) return { status: 'locked', text: LOCKED_LABEL };
        const peerDevices = await fetchPeerDevices(ctx.peerUserId);
        let lastErr: unknown = null;
        let unlocked: { text: string; seq: number } | null = null;
        for (const candidate of peerDevices.slice(0, 8)) {
          try {
            const sharedKey = await e2eeManager.getSharedKey(candidate.publicKey);
            const res = await e2eeManager.decryptV2(body, sharedKey, {
              conversationId,
              senderId,
            });
            unlocked = { text: res.text, seq: res.aad.seq };
            break;
          } catch (err) {
            lastErr = err;
          }
        }
        if (!unlocked) throw lastErr ?? new Error('E2EE v2 self-read failed');
        text = unlocked.text;
        seq = unlocked.seq;
      }
    } else {
      const res = await e2eeManager.decryptV3(
        body,
        senderDevices.map((d) => ({ deviceId: d.deviceId, publicKeySpki: d.publicKey })),
        { ownDeviceId: getDeviceId(), conversationId, senderId },
      );
      text = res.text;
      seq = res.aad.seq;
    }

    if (ctHash) {
      const freshness = await checkInboundFreshness({ scope, seq, ctHash });
      if (freshness.verdict === 'replay') {
        console.warn('[e2ee] replayed envelope rejected');
        return { status: 'replay', text: LOCKED_LABEL };
      }
      if (freshness.verdict === 'gap') {
        console.warn('[e2ee] message sequence gap detected (possible dropped message)');
      }
    }
    return { status: 'decrypted', text };
  } catch (err) {
    if (err instanceof E2eePinChangedError) {
      // Untrusted directory key: deliberate lock (not a malfunction), with
      // an explicit path back via acceptPeerDeviceKeyChange.
      console.warn('[e2ee] peer device key changed — message locked until the new key is accepted');
      return { status: 'locked', text: LOCKED_LABEL };
    }
    return { status: 'error', text: LOCKED_LABEL };
  }
}
