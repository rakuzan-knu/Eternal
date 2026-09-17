import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { promisify } from 'node:util';
import { RedisService } from '../../redis/redis.service';

const generateKeyPairAsync = promisify(crypto.generateKeyPair);
import { InMemoryLruCache } from '../../common/cache/in-memory-lru-cache';
import {
  KeyExchangeInitDto,
  KeyExchangeResultDto,
  PublicKeyResponseDto,
  RegisterPublicKeyDto,
} from './dto/e2ee.dto';

/**
 * End-to-End Encryption (E2EE) Key Exchange Service
 *
 * Implements native Diffie-Hellman / ECDH public key exchange using Node.js built-in `node:crypto`.
 *
 * The server acts as a trust-minimized cryptographic key relay:
 * - Clients exchange public keys via this service.
 * - Clients derive shared symmetric keys locally (e.g. via AES-GCM-256).
 * - The server only ever sees encrypted ciphertext bytes in message payloads,
 *   spending zero CPU on decryption and eliminating legal/subpoena intercept liabilities.
 */
@Injectable()
export class E2eeService {
  private readonly logger = new Logger(E2eeService.name);

  // In-memory fallback keystore with LRU bounding in case Redis is degraded/offline
  private readonly localKeyStore = new InMemoryLruCache<string, PublicKeyResponseDto>({
    maxSize: 5_000,
    defaultTtlSeconds: 86400,
  });

  // Local mirror of the per-user device registries (bounded; insertion-ordered).
  private readonly localDeviceRegistry = new Map<string, Set<string>>();
  private static readonly MAX_LOCAL_REGISTRIES = 5_000;

  constructor(private readonly redisService: RedisService) {}

  private static normalizePurpose(purpose?: string): 'call' | 'message' {
    return purpose === 'message' ? 'message' : 'call';
  }

  private static normalizeDeviceId(deviceId?: string): string {
    const clean = (deviceId ?? '').trim().slice(0, 128);
    return clean.length > 0 ? clean : 'web';
  }

  private static deviceRedisKey(userId: string, purpose: string, deviceId: string): string {
    const safe = deviceId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128) || 'web';
    return `e2ee:public_key:${userId}:${purpose}:${safe}`;
  }

  private static registryRedisKey(userId: string, purpose: string): string {
    return `e2ee:devices:${userId}:${purpose}`;
  }

  private localRegistryAdd(registryKey: string, deviceId: string): void {
    let set = this.localDeviceRegistry.get(registryKey);
    if (!set) {
      if (this.localDeviceRegistry.size >= E2eeService.MAX_LOCAL_REGISTRIES) {
        const oldest = this.localDeviceRegistry.keys().next();
        if (!oldest.done) this.localDeviceRegistry.delete(oldest.value);
      }
      set = new Set<string>();
      this.localDeviceRegistry.set(registryKey, set);
    }
    set.add(deviceId);
  }

  /**
   * Validates that the provided public key represents valid cryptographic key material.
   * Supports SPKI PEM or Raw/Base64 SPKI encoded keys.
   */
  validatePublicKey(key: string): boolean {
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      return false;
    }

    try {
      const trimmed = key.trim();
      if (trimmed.includes('BEGIN PUBLIC KEY')) {
        crypto.createPublicKey(trimmed);
        return true;
      }

      // Try raw SPKI Base64 decode
      const buffer = Buffer.from(trimmed, 'base64');
      if (buffer.length < 32) {
        return false;
      }

      try {
        crypto.createPublicKey({
          key: buffer,
          format: 'der',
          type: 'spki',
        });
        return true;
      } catch {
        // Fallback check: valid base64 payload of appropriate length
        return buffer.length >= 32 && buffer.length <= 4096;
      }
    } catch {
      return false;
    }
  }

  /**
   * Registers or updates a user's E2EE public key in a purpose slot.
   * Slots isolate call vs message identities: registering one never
   * overwrites the other. Unknown purposes fall back to 'call'.
   *
   * Multi-device: the key is ALSO stored under a per-device record and the
   * device joins the purpose registry, so a second device no longer
   * clobbers the first. The legacy slot keeps latest-wins semantics for
   * old (single-key) readers.
   */
  async registerPublicKey(
    userId: string,
    dto: RegisterPublicKeyDto,
  ): Promise<PublicKeyResponseDto> {
    if (!this.validatePublicKey(dto.publicKey)) {
      throw new BadRequestException('Invalid cryptographic public key format');
    }

    const purpose = E2eeService.normalizePurpose(dto.purpose);
    const deviceId = E2eeService.normalizeDeviceId(dto.deviceId);
    const e2eeVersion =
      Number.isInteger(dto.e2eeVersion) && (dto.e2eeVersion as number) >= 1
        ? (dto.e2eeVersion as number)
        : 1;
    const record: PublicKeyResponseDto = {
      userId,
      publicKey: dto.publicKey.trim(),
      algorithm: dto.algorithm ?? 'prime256v1',
      deviceId,
      e2eeVersion,
      purpose,
      updatedAt: new Date().toISOString(),
    };

    // Legacy slot first (compat: latest registration wins, exactly as before)
    this.localKeyStore.set(`${userId}:${purpose}`, record);
    const legacyKey = `e2ee:public_key:${userId}:${purpose}`;
    await this.redisService.set(legacyKey, JSON.stringify(record), 86400 * 30);

    // Per-device record + registry (fan-out reads, no cross-device clobber)
    const deviceKey = E2eeService.deviceRedisKey(userId, purpose, deviceId);
    this.localKeyStore.set(deviceKey, record);
    await this.redisService.set(deviceKey, JSON.stringify(record), 86400 * 30);
    const registryKey = E2eeService.registryRedisKey(userId, purpose);
    this.localRegistryAdd(registryKey, deviceId);
    await this.redisService.sadd(registryKey, deviceId);

    this.logger.log(
      `Registered E2EE public key for user ${userId} (${record.algorithm}, ${purpose}, device ${deviceId}, v${e2eeVersion})`,
    );
    return record;
  }

  /**
   * Retrieves the active E2EE public key for a chat participant.
   * Reads the requested purpose slot first, then the legacy unslotted key
   * (written before purpose slots existed) so old clients keep working.
   */
  async getPublicKey(
    userId: string,
    purpose: string = 'call',
  ): Promise<PublicKeyResponseDto | null> {
    const slot = purpose === 'message' ? 'message' : 'call';
    const keysToTry = [`e2ee:public_key:${userId}:${slot}`, `e2ee:public_key:${userId}`];
    for (const redisKey of keysToTry) {
      const raw = await this.redisService.get(redisKey);
      if (raw) {
        const parsed = E2eeService.normalizeStoredRecord(raw);
        if (parsed) {
          this.localKeyStore.set(`${userId}:${slot}`, parsed);
          return parsed;
        }
        // Fall through to local keystore on parsing error
      }
    }

    return this.localKeyStore.get(`${userId}:${slot}`) ?? this.localKeyStore.get(userId) ?? null;
  }

  private static normalizeStoredRecord(raw: string): PublicKeyResponseDto | null {
    try {
      const parsed = JSON.parse(raw) as PublicKeyResponseDto;
      if (!parsed || typeof parsed.publicKey !== 'string') return null;
      parsed.publicKey = parsed.publicKey.trim();
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Lists ALL device keys in a purpose slot, newest first — the fan-out
   * read for multi-device encryption. Registry misses (TTL expiry, old
   * backends) degrade to the legacy slot record instead of empty, so a
   * degraded registry never hides the latest key.
   */
  async getPublicKeys(userId: string, purpose: string = 'call'): Promise<PublicKeyResponseDto[]> {
    const slot = E2eeService.normalizePurpose(purpose);
    const registryKey = E2eeService.registryRedisKey(userId, slot);
    let members: string[] = [];
    try {
      members = await this.redisService.smembers(registryKey);
    } catch {
      members = [];
    }
    if (members.length === 0) {
      members = [...(this.localDeviceRegistry.get(registryKey) ?? [])];
    }

    const out = new Map<string, PublicKeyResponseDto>();
    if (members.length > 0) {
      const keys = members.map((m) => E2eeService.deviceRedisKey(userId, slot, m));
      let raws: Array<string | null> = [];
      try {
        raws = await this.redisService.mget(keys);
      } catch {
        raws = [];
      }
      members.forEach((member, i) => {
        const raw = raws[i];
        const record = raw ? E2eeService.normalizeStoredRecord(raw) : null;
        const local = record ?? this.localKeyStore.get(keys[i]) ?? null;
        if (local && local.publicKey) {
          out.set(local.deviceId || member, { ...local, purpose: slot });
        }
      });
    }

    const legacy = await this.getPublicKey(userId, slot);
    if (legacy && legacy.publicKey) {
      const id = legacy.deviceId || 'legacy';
      if (!out.has(id)) out.set(id, legacy);
    }
    return [...out.values()].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }

  /**
   * Processes a key exchange handshake initialization from sender to recipient.
   */
  async initiateKeyExchange(
    senderId: string,
    dto: KeyExchangeInitDto,
  ): Promise<KeyExchangeResultDto> {
    if (!this.validatePublicKey(dto.ephemeralPublicKey)) {
      throw new BadRequestException('Invalid ephemeral public key format');
    }

    // In a multi-node cluster, we can publish an event or return the relayed bundle
    await Promise.resolve();
    const result: KeyExchangeResultDto = {
      success: true,
      senderId,
      recipientId: dto.recipientId,
      relayedAt: new Date().toISOString(),
    };

    this.logger.debug(
      `E2EE key exchange relayed from ${senderId} to ${dto.recipientId} for conversation ${dto.conversationId ?? 'direct'}`,
    );
    return result;
  }

  /**
   * Native server-side Diffie-Hellman / ECDH shared secret derivation utility.
   * Useful for testing, integration benchmarks, and verifying cryptographic correctness.
   */
  computeSharedSecret(privateKeyPem: string, peerPublicKeyPem: string): Buffer {
    const privKey = crypto.createPrivateKey(privateKeyPem);
    const pubKey = crypto.createPublicKey(peerPublicKeyPem);

    return crypto.diffieHellman({
      privateKey: privKey,
      publicKey: pubKey,
    });
  }

  /**
   * Generates a native ECDH or X25519 keypair using Node.js built-in `node:crypto`.
   */
  async generateServerTestKeyPair(algorithm: 'x25519' | 'prime256v1' = 'prime256v1'): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    if (algorithm === 'x25519') {
      const pair = await generateKeyPairAsync('x25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      return { publicKey: pair.publicKey, privateKey: pair.privateKey };
    }

    const pair = await generateKeyPairAsync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return { publicKey: pair.publicKey, privateKey: pair.privateKey };
  }
}
