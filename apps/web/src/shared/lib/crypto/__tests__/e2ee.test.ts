import { describe, it, expect, beforeEach } from 'vitest';
import { E2eeCryptoManager, e2eeManager } from '../e2ee';

const hasSubtle = typeof window !== 'undefined' && Boolean(window.crypto?.subtle);

describe('E2EE message identity (M1: non-extractable IndexedDB + migration)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe.runIf(hasSubtle)('fresh generation', () => {
    it('generates a stable identity across init() calls', async () => {
      const manager = new E2eeCryptoManager();
      const first = await manager.init();
      expect(first.publicKeySpki.length).toBeGreaterThan(0);
      const second = await manager.init();
      expect(second.publicKeySpki).toBe(first.publicKeySpki);
    });

    it('round-trips encrypt/decrypt through the ECDH shared key', async () => {
      const { publicKeySpki } = await e2eeManager.init();
      const shared = await e2eeManager.getSharedKey(publicKeySpki);
      const envelope = await e2eeManager.encrypt('m1 self-check', shared);
      expect(e2eeManager.isEncrypted(envelope)).toBe(true);
      await expect(e2eeManager.decrypt(envelope, shared)).resolves.toBe('m1 self-check');
    });
  });
});

describe('E2EE envelope detection (M3: parse-then-validate)', () => {
  const manager = new E2eeCryptoManager();

  it('rejects plaintext that merely mentions the marker', () => {
    expect(manager.isEncrypted('note: {"e2ee":true} is the marker format')).toBe(false);
    expect(manager.isEncrypted('{"e2ee":true, "text":"hi"}')).toBe(false); // legacy preview, never encrypted
    expect(manager.isEncrypted('{"e2ee":true')).toBe(false); // truncated
    expect(manager.isEncrypted('')).toBe(false);
    expect(manager.isEncrypted(null)).toBe(false);
    expect(manager.isEncrypted('[1,2,3]')).toBe(false);
  });

  it('rejects envelopes with wrong shape', () => {
    expect(manager.isEncrypted('{"e2ee":true,"v":1,"iv":"x"}')).toBe(false); // no ct
    expect(manager.isEncrypted('{"e2ee":1,"v":1,"iv":"x","ct":"y"}')).toBe(false);
    expect(manager.isEncrypted('{"e2ee":true,"v":2,"iv":"x","ct":"y"}')).toBe(false);
  });

  it('accepts a well-formed v1 envelope', () => {
    expect(manager.isEncrypted('{"e2ee":true,"v":1,"iv":"AAAAAAAAAAAAAAAA","ct":"BBBB"}')).toBe(
      true,
    );
  });

  it('accepts well-formed v2/v3 envelopes, rejects malformed bound ones', () => {
    const aad = { conversationId: 'c1', senderId: 'u1', senderDevice: 'd1', seq: 2 };
    expect(
      manager.isEncrypted(
        JSON.stringify({ e2ee: true, v: 2, iv: 'AAAAAAAAAAAAAAAA', ct: 'BBBB', from: 'd1', aad }),
      ),
    ).toBe(true);
    expect(
      manager.isEncrypted(
        JSON.stringify({
          e2ee: true,
          v: 3,
          iv: 'AAAAAAAAAAAAAAAA',
          ct: 'BBBB',
          from: 'd1',
          keys: { d2: { iv: 'AAAAAAAAAAAAAAAA', k: 'BBBB' } },
          aad,
        }),
      ),
    ).toBe(true);
    // v2 without aad, v3 without keys, unknown version, oversized.
    expect(manager.isEncrypted('{"e2ee":true,"v":2,"iv":"a","ct":"b"}')).toBe(false);
    expect(
      manager.isEncrypted(
        JSON.stringify({ e2ee: true, v: 3, iv: 'a', ct: 'b', from: 'd', keys: {}, aad }),
      ),
    ).toBe(false);
    expect(manager.isEncrypted('{"e2ee":true,"v":9,"iv":"a","ct":"b"}')).toBe(false);
    expect(manager.isEncrypted(`{"e2ee":true,"v":1,"iv":"a","ct":"${'b'.repeat(20000)}"}`)).toBe(
      false,
    );
    // Wrong IV byte-length (11, not 12): undecryptable in WebCrypto readers,
    // so it must not classify as an envelope (locked label, not raw JSON).
    expect(
      manager.isEncrypted(JSON.stringify({ e2ee: true, v: 1, iv: 'aGVsbG8', ct: 'd29ybGQ' })),
    ).toBe(false);
  });
});
