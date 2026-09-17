import { describe, it, expect } from 'vitest';
import {
  modPow,
  modInverse,
  createBlindTokenRequest,
  unblindSignature,
  verifyBlindSignature,
  generateBlindedRoomToken,
  createBlindedSfuSessionTicket,
  BlindedSfuKeys,
} from '../blindedSfuPrivacy';

describe('blindedSfuPrivacy', () => {
  // Test RSA Keypair: p = 61, q = 53, n = 3233, phi = 3120, e = 17, d = 2753
  const testKeys: BlindedSfuKeys = {
    n: 3233n,
    e: 17n,
  };
  const testPrivateKeyD = 2753n;

  it('computes modular exponentiation correctly', () => {
    // 7^3 mod 19 = 343 mod 19 = 1
    expect(modPow(7n, 3n, 19n)).toBe(1n);
    // 2^10 mod 1000 = 1024 mod 1000 = 24
    expect(modPow(2n, 10n, 1000n)).toBe(24n);
  });

  it('computes modular inverse correctly using extended Euclidean algorithm', () => {
    // 3 * x = 1 mod 11 => 3 * 4 = 12 = 1 mod 11
    expect(modInverse(3n, 11n)).toBe(4n);
    // 17 * 2753 = 1 mod 3120
    expect(modInverse(17n, 3120n)).toBe(2753n);
  });

  it('executes full Chaumian Blind Signature lifecycle', () => {
    const rawMessage = new Uint8Array([12, 34, 56]);
    const blindingFactor = 29n;

    // 1. Client blinds message: m' = (m * r^e) mod n
    const artifacts = createBlindTokenRequest(rawMessage, testKeys, blindingFactor);
    expect(artifacts.blindedMessage).toBeGreaterThan(0n);
    expect(artifacts.blindedMessage).not.toBe(artifacts.messageBigInt);

    // 2. Server signs blinded message without knowing underlying message: s' = (m')^d mod n
    const serverBlindedSig = modPow(artifacts.blindedMessage, testPrivateKeyD, testKeys.n);

    // 3. Client unblinds: s = s' * r^(-1) mod n
    const unblindedSig = unblindSignature(serverBlindedSig, artifacts.blindingFactor, testKeys.n);

    // 4. Anyone can verify: s^e mod n == m mod n
    const isValid = verifyBlindSignature(artifacts.messageBigInt, unblindedSig, testKeys);
    expect(isValid).toBe(true);

    // 5. Verification fails if message is altered
    const alteredMessage = artifacts.messageBigInt + 1n;
    const isAlteredValid = verifyBlindSignature(alteredMessage, unblindedSig, testKeys);
    expect(isAlteredValid).toBe(false);
  });

  it('generates deterministic blinded room tokens via HMAC-SHA256', async () => {
    const secret = 'zero-trust-secret-key';
    const roomId = 'room-alpha-99';

    const token1 = await generateBlindedRoomToken(secret, roomId);
    const token2 = await generateBlindedRoomToken(secret, roomId);
    const tokenOtherRoom = await generateBlindedRoomToken(secret, 'room-beta-100');

    expect(token1).toBe(token2);
    expect(token1).toHaveLength(64); // 32 bytes hex
    expect(token1).not.toBe(tokenOtherRoom);
  });

  it('creates complete blind session tickets', async () => {
    const serverSigner = async (mPrime: bigint) => {
      return modPow(mPrime, testPrivateKeyD, testKeys.n);
    };

    const ticket = await createBlindedSfuSessionTicket(
      'super-secret-salt',
      'conference-room-1',
      testKeys,
      serverSigner,
    );

    expect(ticket.blindedRoomToken).toBeDefined();
    expect(ticket.ephemeralTicketHex).toBeDefined();
    expect(ticket.blindSignatureHex).toBeDefined();

    // Verify ticket
    const isValid = verifyBlindSignature(
      BigInt(`0x${ticket.ephemeralTicketHex}`),
      BigInt(`0x${ticket.blindSignatureHex}`),
      testKeys,
    );
    expect(isValid).toBe(true);
  });
});
