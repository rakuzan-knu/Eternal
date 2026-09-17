import { Test, type TestingModule } from '@nestjs/testing';
import { E2eeService } from '../e2ee.service';
import { RedisService } from '../../../redis/redis.service';
import { BadRequestException } from '@nestjs/common';

describe('E2eeService (Application-Level End-to-End Key Exchange)', () => {
  let service: E2eeService;
  let mockRedisService: Partial<RedisService>;
  const storage = new Map<string, string>();
  const setStorage = new Map<string, Set<string>>();

  const createService = async (): Promise<E2eeService> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        E2eeService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    return module.get<E2eeService>(E2eeService);
  };

  beforeEach(async () => {
    storage.clear();
    setStorage.clear();
    mockRedisService = {
      get: jest.fn().mockImplementation((key: string) => Promise.resolve(storage.get(key) ?? null)),
      set: jest.fn().mockImplementation((key: string, val: string) => {
        storage.set(key, val);
        return Promise.resolve();
      }),
      sadd: jest.fn().mockImplementation((key: string, ...members: string[]) => {
        let set = setStorage.get(key);
        if (!set) {
          set = new Set<string>();
          setStorage.set(key, set);
        }
        let added = 0;
        for (const m of members) {
          if (!set.has(m)) {
            set.add(m);
            added += 1;
          }
        }
        return Promise.resolve(added);
      }),
      smembers: jest.fn().mockImplementation((key: string) => {
        return Promise.resolve([...(setStorage.get(key) ?? [])]);
      }),
      mget: jest.fn().mockImplementation((keys: string[]) => {
        return Promise.resolve(keys.map((k) => storage.get(k) ?? null));
      }),
    };

    service = await createService();
  });

  it('generates valid server test keypair using native node:crypto', async () => {
    const pair = await service.generateServerTestKeyPair('prime256v1');
    expect(pair.publicKey).toContain('BEGIN PUBLIC KEY');
    expect(pair.privateKey).toContain('BEGIN PRIVATE KEY');

    const x25519Pair = await service.generateServerTestKeyPair('x25519');
    expect(x25519Pair.publicKey).toContain('BEGIN PUBLIC KEY');
    expect(x25519Pair.privateKey).toContain('BEGIN PRIVATE KEY');
  });

  it('validates genuine public keys and rejects invalid ones', async () => {
    const { publicKey } = await service.generateServerTestKeyPair();
    expect(service.validatePublicKey(publicKey)).toBe(true);

    expect(service.validatePublicKey('')).toBe(false);
    expect(service.validatePublicKey('not-a-crypto-key')).toBe(false);
    expect(service.validatePublicKey('12345')).toBe(false);
  });

  it('registers and retrieves public keys via Redis with fallback', async () => {
    const { publicKey } = await service.generateServerTestKeyPair();
    const userId = 'user-alice-123';

    const registered = await service.registerPublicKey(userId, {
      publicKey,
      algorithm: 'prime256v1',
      deviceId: 'device-web-1',
    });

    expect(registered.userId).toBe(userId);
    expect(registered.publicKey).toBe(publicKey.trim());

    const retrieved = await service.getPublicKey(userId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.userId).toBe(userId);
    expect(retrieved?.publicKey).toBe(publicKey.trim());
  });

  it('throws BadRequestException when registering malformed public key', async () => {
    await expect(
      service.registerPublicKey('user-bad', {
        publicKey: 'invalid-garbage-key',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('initiates and relays key exchange handshake', async () => {
    const { publicKey: ephemeralKey } = await service.generateServerTestKeyPair();
    const result = await service.initiateKeyExchange('sender-1', {
      recipientId: 'recipient-2',
      ephemeralPublicKey: ephemeralKey,
      conversationId: 'conv-100',
    });

    expect(result.success).toBe(true);
    expect(result.senderId).toBe('sender-1');
    expect(result.recipientId).toBe('recipient-2');
    expect(result.relayedAt).toBeDefined();
  });

  it('computes identical shared secrets on both sides via Diffie-Hellman', async () => {
    const alice = await service.generateServerTestKeyPair('prime256v1');
    const bob = await service.generateServerTestKeyPair('prime256v1');

    // Alice computes secret using Bob's public key
    const aliceSecret = service.computeSharedSecret(alice.privateKey, bob.publicKey);

    // Bob computes secret using Alice's public key
    const bobSecret = service.computeSharedSecret(bob.privateKey, alice.publicKey);

    expect(aliceSecret.equals(bobSecret)).toBe(true);
    expect(aliceSecret.length).toBeGreaterThan(0);
  });

  it('isolates call vs message purpose slots (no cross-overwrite)', async () => {
    const { publicKey: callKey } = await service.generateServerTestKeyPair();
    const { publicKey: msgKey } = await service.generateServerTestKeyPair();
    const userId = 'user-slots-1';

    await service.registerPublicKey(userId, { publicKey: callKey, purpose: 'call' });
    await service.registerPublicKey(userId, { publicKey: msgKey, purpose: 'message' });

    const callBack = await service.getPublicKey(userId, 'call');
    const msgBack = await service.getPublicKey(userId, 'message');
    expect(callBack?.publicKey).toBe(callKey.trim());
    expect(msgBack?.publicKey).toBe(msgKey.trim());
    expect(callBack?.purpose).toBe('call');
    expect(msgBack?.purpose).toBe('message');
  });

  it('falls back to the legacy unslotted key for old clients', async () => {
    const { publicKey } = await service.generateServerTestKeyPair();
    const userId = 'user-legacy-1';
    // Simulate a pre-slots record written directly under the legacy key.
    storage.set(`e2ee:public_key:${userId}`, JSON.stringify({ userId, publicKey }));

    const retrieved = await service.getPublicKey(userId, 'message');
    expect(retrieved?.publicKey).toBe(publicKey.trim());
  });

  it('stores per-device records without cross-device clobbering', async () => {
    const a = await service.generateServerTestKeyPair();
    const b = await service.generateServerTestKeyPair();
    const userId = 'user-multidevice-1';

    await service.registerPublicKey(userId, {
      publicKey: a.publicKey,
      purpose: 'message',
      deviceId: 'phone',
      e2eeVersion: 3,
    });
    await service.registerPublicKey(userId, {
      publicKey: b.publicKey,
      purpose: 'message',
      deviceId: 'desktop',
      e2eeVersion: 2,
    });

    const keys = await service.getPublicKeys(userId, 'message');
    expect(keys).toHaveLength(2);
    const byDevice = new Map(keys.map((k) => [k.deviceId, k]));
    expect(byDevice.get('phone')?.publicKey).toBe(a.publicKey.trim());
    expect(byDevice.get('phone')?.e2eeVersion).toBe(3);
    expect(byDevice.get('desktop')?.publicKey).toBe(b.publicKey.trim());
    expect(byDevice.get('desktop')?.e2eeVersion).toBe(2);

    // Legacy slot still serves the latest registration (old readers unaffected).
    const single = await service.getPublicKey(userId, 'message');
    expect(single?.publicKey).toBe(b.publicKey.trim());
  });

  it('defaults missing device/version and isolates purpose registries', async () => {
    const { publicKey } = await service.generateServerTestKeyPair();
    const userId = 'user-defaults-1';

    const record = await service.registerPublicKey(userId, { publicKey, purpose: 'message' });
    expect(record.deviceId).toBe('web');
    expect(record.e2eeVersion).toBe(1);

    expect(await service.getPublicKeys(userId, 'message')).toHaveLength(1);
    // Purpose slots stay isolated at the device layer too.
    expect(await service.getPublicKeys(userId, 'call')).toHaveLength(0);
  });

  it('degrades to the legacy slot when the registry is unavailable', async () => {
    const { publicKey } = await service.generateServerTestKeyPair();
    const userId = 'user-degraded-1';
    await service.registerPublicKey(userId, {
      publicKey,
      purpose: 'message',
      deviceId: 'phone',
      e2eeVersion: 3,
    });

    // Simulate registry TTL expiry on a FRESH instance (no local mirrors):
    // members gone, records remain — the legacy slot still serves the key.
    setStorage.clear();
    const cold = await createService();
    const keys = await cold.getPublicKeys(userId, 'message');
    expect(keys).toHaveLength(1);
    expect(keys[0].publicKey).toBe(publicKey.trim());
  });
});
