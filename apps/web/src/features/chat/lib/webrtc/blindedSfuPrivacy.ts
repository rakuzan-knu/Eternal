/**
 * Blinded SFU & Metadata Privacy (Zero-Trust Routing)
 *
 * Implements Chaumian Blind Signatures and Blinded Room Tokens.
 *
 * Guarantees that the SFU media routing server:
 * 1. Cryptographically verifies the participant is authorized to stream.
 * 2. Cannot correlate the participant's real User ID, account, or IP address.
 * 3. Cannot know which real room, chat, or channel is being routed (zero metadata linkage).
 */

export interface BlindedSfuKeys {
  n: bigint; // RSA Modulus
  e: bigint; // Public Exponent
}

export interface BlindedAuthArtifacts {
  rawMessage: Uint8Array;
  messageBigInt: bigint;
  blindingFactor: bigint;
  blindedMessage: bigint;
}

export interface BlindedSfuSessionTicket {
  blindedRoomToken: string;
  ephemeralTicketHex: string;
  blindSignatureHex: string;
  timestamp: number;
}

/**
 * Modular exponentiation: (base^exp) mod modulus
 */
export function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 1n) return 0n;
  let res = 1n;
  let b = ((base % mod) + mod) % mod;
  let e = exp;

  while (e > 0n) {
    if (e & 1n) {
      res = (res * b) % mod;
    }
    e >>= 1n;
    b = (b * b) % mod;
  }
  return res;
}

/**
 * Extended Euclidean Algorithm to find modular inverse: (a * inv) = 1 mod m
 */
export function modInverse(a: bigint, m: bigint): bigint {
  let [oldR, r] = [((a % m) + m) % m, m];
  let [oldS, s] = [1n, 0n];

  while (r !== 0n) {
    const quotient = oldR / r;
    [oldR, r] = [r, oldR - quotient * r];
    [oldS, s] = [s, oldS - quotient * s];
  }

  if (oldR !== 1n) {
    throw new Error('Modular inverse does not exist');
  }

  return ((oldS % m) + m) % m;
}

/**
 * Derives a blinded room token from a shared secret and conversation ID.
 * SFU routes by matching blinded tokens without learning the actual room/chat identity.
 */
export async function generateBlindedRoomToken(
  callSecret: string,
  roomId: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(callSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`blinded-room:${roomId}`));

  const bytes = new Uint8Array(signature);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts a byte array into a BigInt strictly less than modulus n
 */
export function bytesToBigIntModulo(bytes: Uint8Array, n: bigint): bigint {
  let val = 0n;
  for (let i = 0; i < bytes.length; i++) {
    val = (val << 8n) + BigInt(bytes[i]);
  }
  return (val % (n - 2n)) + 2n;
}

/**
 * Greatest common divisor for BigInt
 */
export function gcd(a: bigint, b: bigint): bigint {
  let [x, y] = [a, b];
  while (y !== 0n) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x < 0n ? -x : x;
}

/**
 * Generates Chaumian Blind Token request: m' = m * r^e mod n
 */
export function createBlindTokenRequest(
  messageData: Uint8Array,
  serverPubKey: BlindedSfuKeys,
  overrideBlindingFactor?: bigint,
): BlindedAuthArtifacts {
  const { n, e } = serverPubKey;
  const messageBigInt = bytesToBigIntModulo(messageData, n);

  let r = overrideBlindingFactor;
  if (!r) {
    // Generate random blinding factor coprime to n (gcd(r, n) == 1)
    const randBytes = crypto.getRandomValues(new Uint8Array(32));
    r = bytesToBigIntModulo(randBytes, n);
    while (r <= 2n || gcd(r, n) !== 1n) {
      r = (r + 1n) % n;
      if (r <= 2n) r = 3n;
    }
  }

  // Blinding: m' = (m * r^e) mod n
  const rPowE = modPow(r, e, n);
  const blindedMessage = (messageBigInt * rPowE) % n;

  return {
    rawMessage: messageData,
    messageBigInt,
    blindingFactor: r,
    blindedMessage,
  };
}

/**
 * Unblinds the signed blinded message: s = s' * r^(-1) mod n
 */
export function unblindSignature(
  blindedSignature: bigint,
  blindingFactor: bigint,
  n: bigint,
): bigint {
  const rInv = modInverse(blindingFactor, n);
  return (blindedSignature * rInv) % n;
}

/**
 * Verifies that s^e == m mod n
 */
export function verifyBlindSignature(
  messageBigInt: bigint,
  signature: bigint,
  serverPubKey: BlindedSfuKeys,
): boolean {
  const { n, e } = serverPubKey;
  const verified = modPow(signature, e, n);
  return verified === messageBigInt;
}

/**
 * Helper: Creates complete Blinded SFU Session Ticket
 */
export async function createBlindedSfuSessionTicket(
  callSecret: string,
  roomId: string,
  serverPubKey: BlindedSfuKeys,
  serverSignerFn: (blindedMsg: bigint) => Promise<bigint>,
): Promise<BlindedSfuSessionTicket> {
  const blindedRoomToken = await generateBlindedRoomToken(callSecret, roomId);

  // Generate ephemeral 32-byte client token
  const ephemeralBytes = crypto.getRandomValues(new Uint8Array(32));
  const artifacts = createBlindTokenRequest(ephemeralBytes, serverPubKey);

  // Send blinded message to auth server (server cannot see raw ephemeralBytes)
  const serverBlindSignature = await serverSignerFn(artifacts.blindedMessage);

  // Unblind signature
  const signature = unblindSignature(
    serverBlindSignature,
    artifacts.blindingFactor,
    serverPubKey.n,
  );

  return {
    blindedRoomToken,
    ephemeralTicketHex: artifacts.messageBigInt.toString(16),
    blindSignatureHex: signature.toString(16),
    timestamp: Date.now(),
  };
}
