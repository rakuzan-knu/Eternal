import { expect, test } from '@playwright/test';

/**
 * Message-layer E2EE across two ISOLATED browser realms.
 *
 * Same philosophy as call-e2ee-handshake.spec.ts: the shipped ESM modules run
 * inside two independent Chromium contexts (separate IndexedDB/localStorage),
 * and ONLY strings cross between them вЂ” exactly what the key directory and
 * the message transport carry. Agreement here is genuinely cross-party.
 *
 * Covers: identity bootstrap in IndexedDB (non-extractable steady state),
 * legacy localStorage migration (same identity, extractable copy wiped),
 * envelope roundtrip A->B through strings only, tamper rejection, and the
 * backend size contract (envelope for long text fits MESSAGE_ENVELOPE_MAX).
 */

const E2EE = '/src/shared/lib/crypto/e2ee.ts';

/** Structural surface of E2eeCryptoManager used inside page.evaluate. */
interface MsgManager {
  getSharedKey(peerSpki: string): Promise<CryptoKey>;
  encrypt(plaintext: string, key: CryptoKey): Promise<string>;
  decrypt(payload: string, key: CryptoKey): Promise<string>;
  encryptV2(
    plaintext: string,
    sharedKey: CryptoKey,
    from: string,
    aad: { conversationId: string; senderId: string; senderDevice: string; seq: number },
  ): Promise<string>;
  decryptV2(
    envelope: string,
    sharedKey: CryptoKey,
    expected: { conversationId: string; senderId: string },
  ): Promise<{ text: string }>;
  encryptV3(
    plaintext: string,
    recipients: Array<{ deviceId: string; publicKeySpki: string }>,
    opts: {
      from: string;
      ownPublicSpki: string;
      conversationId: string;
      senderId: string;
      seq: number;
    },
  ): Promise<string>;
  decryptV3(
    envelope: string,
    senderDevices: Array<{ deviceId: string; publicKeySpki: string }>,
    opts: { ownDeviceId: string; conversationId: string; senderId: string },
  ): Promise<{ text: string }>;
  isEncrypted(body?: string | null): boolean;
}

test.describe('message E2EE across two browser realms', () => {
  test('identities bootstrap non-extractable; envelopes roundtrip; tamper drops', async ({
    browser,
  }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    await pageA.goto('/');
    await pageB.goto('/');

    // 1. Bootstrap: fresh non-extractable identities, nothing extractable in storage.
    const bootA = await pageA.evaluate(async (mod: string) => {
      const m = await import(mod);
      const manager = new m.E2eeCryptoManager();
      const { publicKeySpki } = await manager.init();
      (window as unknown as Record<string, unknown>).__msgMgr = manager;
      return {
        spki: publicKeySpki,
        leakedPriv: window.localStorage.getItem('e2ee_private_key_jwk'),
        leakedPub: window.localStorage.getItem('e2ee_public_key_spki'),
      };
    }, E2EE);
    const bootB = await pageB.evaluate(async (mod: string) => {
      const m = await import(mod);
      const manager = new m.E2eeCryptoManager();
      const { publicKeySpki } = await manager.init();
      (window as unknown as Record<string, unknown>).__msgMgr = manager;
      return { spki: publicKeySpki };
    }, E2EE);

    expect(bootA.spki.length).toBeGreaterThan(32);
    expect(bootB.spki.length).toBeGreaterThan(32);
    expect(bootA.spki).not.toBe(bootB.spki);
    expect(bootA.leakedPriv).toBeNull();
    expect(bootA.leakedPub).toBeNull();

    // 2. A encrypts for B; only the envelope string crosses realms.
    const envelope: string = await pageA.evaluate(
      async ({ peerSpki }: { peerSpki: string }) => {
        const manager = (window as unknown as { __msgMgr: MsgManager }).__msgMgr;
        const shared = await manager.getSharedKey(peerSpki);
        return manager.encrypt('meet at noon', shared);
      },
      { peerSpki: bootB.spki },
    );
    expect(envelope.length).toBeLessThanOrEqual(8192); // backend MESSAGE_ENVELOPE_MAX

    const readB: { status: string; text: string } = await pageB.evaluate(
      async ({ peerSpki, body }: { peerSpki: string; body: string }) => {
        const manager = (window as unknown as { __msgMgr: MsgManager }).__msgMgr;
        if (!manager.isEncrypted(body)) return { status: 'plain', text: body };
        const shared = await manager.getSharedKey(peerSpki);
        try {
          return { status: 'decrypted', text: await manager.decrypt(body, shared) };
        } catch {
          return { status: 'error', text: '' };
        }
      },
      { peerSpki: bootA.spki, body: envelope },
    );
    expect(readB).toEqual({ status: 'decrypted', text: 'meet at noon' });

    // 3. Tampered ciphertext fails closed on B.
    const parsed = JSON.parse(envelope) as { ct: string };
    parsed.ct = `${parsed.ct.slice(0, -1)}${parsed.ct.endsWith('A') ? 'B' : 'A'}`;
    const tampered = JSON.stringify({ ...JSON.parse(envelope), ...parsed });
    const readTampered: string = await pageB.evaluate(
      async ({ peerSpki, body }: { peerSpki: string; body: string }) => {
        const manager = (window as unknown as { __msgMgr: MsgManager }).__msgMgr;
        try {
          await manager.decrypt(body, await manager.getSharedKey(peerSpki));
          return 'decrypted';
        } catch {
          return 'rejected';
        }
      },
      { peerSpki: bootA.spki, body: tampered },
    );
    expect(readTampered).toBe('rejected');

    // 4. Long-text envelope still fits the backend cap (P0-1 regression).
    const longEnvelope: number = await pageA.evaluate(
      async ({ peerSpki }: { peerSpki: string }) => {
        const manager = (window as unknown as { __msgMgr: MsgManager }).__msgMgr;
        const env = await manager.encrypt('L'.repeat(3500), await manager.getSharedKey(peerSpki));
        return env.length;
      },
      { peerSpki: bootB.spki },
    );
    expect(longEnvelope).toBeGreaterThan(4096); // would 400 under the old cap
    expect(longEnvelope).toBeLessThanOrEqual(8192);

    await contextA.close();
    await contextB.close();
  });

  test('v2 binding + v3 hybrid roundtrip across realms, transplants fail', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    await pageA.goto('/');
    await pageB.goto('/');

    const initRealm = async (page: typeof pageA, mod: string): Promise<string> =>
      page.evaluate(async (m: string) => {
        const mImport = await import(m);
        const manager = new mImport.E2eeCryptoManager();
        (window as unknown as Record<string, unknown>).__msgMgr = manager;
        return (await manager.init()).publicKeySpki;
      }, mod);

    const spkiA = await initRealm(pageA, E2EE);
    const spkiB = await initRealm(pageB, E2EE);
    expect(spkiA).not.toBe(spkiB);

    // v2: A encrypts for B with dialog binding; only strings cross realms.
    const v2env: string = await pageA.evaluate(
      async ({ peerSpki }: { peerSpki: string }) => {
        const manager = (window as unknown as { __msgMgr: MsgManager }).__msgMgr;
        const shared = await manager.getSharedKey(peerSpki);
        return manager.encryptV2('v2 hello', shared, 'dev-a', {
          conversationId: 'pw-conv',
          senderId: 'alice',
          senderDevice: 'dev-a',
          seq: 1,
        });
      },
      { peerSpki: spkiB },
    );

    const v2read: { status: string; text: string } = await pageB.evaluate(
      async ({ peerSpki, body }: { peerSpki: string; body: string }) => {
        const manager = (window as unknown as { __msgMgr: MsgManager }).__msgMgr;
        try {
          const res = await manager.decryptV2(body, await manager.getSharedKey(peerSpki), {
            conversationId: 'pw-conv',
            senderId: 'alice',
          });
          return { status: 'decrypted', text: res.text };
        } catch {
          return { status: 'error', text: '' };
        }
      },
      { peerSpki: spkiA, body: v2env },
    );
    expect(v2read).toEqual({ status: 'decrypted', text: 'v2 hello' });

    const v2transplant: string = await pageB.evaluate(
      async ({ peerSpki, body }: { peerSpki: string; body: string }) => {
        const manager = (window as unknown as { __msgMgr: MsgManager }).__msgMgr;
        try {
          await manager.decryptV2(body, await manager.getSharedKey(peerSpki), {
            conversationId: 'pw-EVIL',
            senderId: 'alice',
          });
          return 'decrypted';
        } catch {
          return 'rejected';
        }
      },
      { peerSpki: spkiA, body: v2env },
    );
    expect(v2transplant).toBe('rejected');

    // v3: hybrid to B's device + A's own wrap; B unwraps via directory-style args.
    const v3env: string = await pageA.evaluate(
      async ({ peerSpki, ownSpki }: { peerSpki: string; ownSpki: string }) => {
        const manager = (window as unknown as { __msgMgr: MsgManager }).__msgMgr;
        return manager.encryptV3('v3 hello', [{ deviceId: 'dev-b', publicKeySpki: peerSpki }], {
          from: 'dev-a',
          ownPublicSpki: ownSpki,
          conversationId: 'pw-conv',
          senderId: 'alice',
          seq: 2,
        });
      },
      { peerSpki: spkiB, ownSpki: spkiA },
    );

    const v3read: { status: string; text: string } = await pageB.evaluate(
      async ({ peerSpki, body }: { peerSpki: string; body: string }) => {
        const manager = (window as unknown as { __msgMgr: MsgManager }).__msgMgr;
        try {
          const res = await manager.decryptV3(
            body,
            [{ deviceId: 'dev-a', publicKeySpki: peerSpki }],
            { ownDeviceId: 'dev-b', conversationId: 'pw-conv', senderId: 'alice' },
          );
          return { status: 'decrypted', text: res.text };
        } catch {
          return { status: 'error', text: '' };
        }
      },
      { peerSpki: spkiA, body: v3env },
    );
    expect(v3read).toEqual({ status: 'decrypted', text: 'v3 hello' });

    // v3 tamper (flipped content bit) fails closed on B.
    const parsed = JSON.parse(v3env) as { ct: string };
    parsed.ct = `${parsed.ct.slice(0, -2)}${parsed.ct.endsWith('AA') ? 'BB' : 'AA'}`;
    const v3tampered = JSON.stringify({ ...JSON.parse(v3env), ...parsed });
    const v3tamperRead: string = await pageB.evaluate(
      async ({ peerSpki, body }: { peerSpki: string; body: string }) => {
        const manager = (window as unknown as { __msgMgr: MsgManager }).__msgMgr;
        try {
          await manager.decryptV3(body, [{ deviceId: 'dev-a', publicKeySpki: peerSpki }], {
            ownDeviceId: 'dev-b',
            conversationId: 'pw-conv',
            senderId: 'alice',
          });
          return 'decrypted';
        } catch {
          return 'rejected';
        }
      },
      { peerSpki: spkiA, body: v3tampered },
    );
    expect(v3tamperRead).toBe('rejected');

    await contextA.close();
    await contextB.close();
  });

  test('legacy localStorage identity migrates without rotation', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/');

    const result = await page.evaluate(async (mod: string) => {
      const m = await import(mod);
      // Seed a pre-M1 extractable identity exactly as the old client left it.
      const legacy = await window.crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey', 'deriveBits'],
      );
      const toB64 = (buf: ArrayBuffer) => {
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (const b of bytes) binary += String.fromCharCode(b);
        return window.btoa(binary);
      };
      const legacySpki = toB64(await window.crypto.subtle.exportKey('spki', legacy.publicKey));
      window.localStorage.setItem(
        'e2ee_private_key_jwk',
        JSON.stringify(await window.crypto.subtle.exportKey('jwk', legacy.privateKey)),
      );
      window.localStorage.setItem('e2ee_public_key_spki', legacySpki);

      const { publicKeySpki } = await new m.E2eeCryptoManager().init();
      return {
        sameIdentity: publicKeySpki === legacySpki,
        privWiped: window.localStorage.getItem('e2ee_private_key_jwk') === null,
        pubWiped: window.localStorage.getItem('e2ee_public_key_spki') === null,
      };
    }, E2EE);

    expect(result.sameIdentity).toBe(true);
    expect(result.privWiped).toBe(true);
    expect(result.pubWiped).toBe(true);
    await context.close();
  });
});
