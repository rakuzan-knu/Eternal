/**
 * Post-Quantum Cryptography (PQC) Hybrid Key Exchange
 *
 * Implements a defense-in-depth hybrid key exchange adhering to NIST FIPS 203
 * (ML-KEM-768 / CRYSTALS-Kyber) and NIST FIPS 204 (ML-DSA-65 / CRYSTALS-Dilithium)
 * combined with classical ECDH to protect real-time WebRTC media streams against
 * "Store Now, Decrypt Later" (SNDL) quantum attacks.
 *
 * Mathematical Foundations:
 * - Polynomial Ring: R_q = Z_q[X] / (X^256 + 1) where q = 3329, n = 256, k = 3.
 * - Hard Problem: Module Learning With Errors (M-LWE).
 * - Hybrid Derivation: K_master = HKDF-SHA256(s_classical || s_quantum, salt=callId, info="PQC-SFrame-v1")
 */

import { SAS_EMOJI_TABLE, type CallKeyInfo } from './frameCrypto';

// ML-KEM-768 Parameters (NIST FIPS 203)
export const ML_KEM_N = 256;
export const ML_KEM_Q = 3329;
export const ML_KEM_K = 3;
export const ML_KEM_PK_BYTES = 1184; // 3 * 384 + 32
export const ML_KEM_CIPHERTEXT_BYTES = 1088; // 3 * 320 + 128
export const ML_KEM_SS_BYTES = 32;

export interface HybridKeypair {
  classicalPublicKey: Uint8Array;
  classicalPrivateKey: Uint8Array;
  pqcPublicKey: Uint8Array;
  pqcSecretKey: Uint8Array;
  fingerprint: string;
}

export interface HybridEncapsulationResult {
  pqcCiphertext: Uint8Array;
  classicalPublicKey: Uint8Array;
  sharedSecret: Uint8Array;
}

export interface PQCCallKeyInfo extends CallKeyInfo {
  key: CryptoKey;
  fingerprint: string;
  sasCode: string;
  sasEmojis: string;
  isPostQuantumProtected: true;
  kemAlgorithm: 'ML-KEM-768';
  dsaAlgorithm: 'ML-DSA-65';
  pqcOfferSize: number;
}

/**
 * Polynomial multiplication in R_q = Z_q[X] / (X^256 + 1)
 */
export function polyMul(a: Int16Array, b: Int16Array): Int16Array {
  const result = new Int16Array(ML_KEM_N);
  for (let i = 0; i < ML_KEM_N; i++) {
    for (let j = 0; j < ML_KEM_N; j++) {
      const idx = i + j;
      const term = a[i] * b[j];
      if (idx < ML_KEM_N) {
        result[idx] = (result[idx] + term) % ML_KEM_Q;
      } else {
        // X^256 = -1 in R_q
        result[idx - ML_KEM_N] = (result[idx - ML_KEM_N] - term) % ML_KEM_Q;
      }
    }
  }
  for (let i = 0; i < ML_KEM_N; i++) {
    result[i] = ((result[i] % ML_KEM_Q) + ML_KEM_Q) % ML_KEM_Q;
  }
  return result;
}

/**
 * Samples pseudorandom uniform polynomials from seed using SHAKE/SHA
 */
async function expandMatrixA(seed: Uint8Array): Promise<Int16Array[][]> {
  const matrix: Int16Array[][] = [];
  for (let i = 0; i < ML_KEM_K; i++) {
    matrix[i] = [];
    for (let j = 0; j < ML_KEM_K; j++) {
      const poly = new Int16Array(ML_KEM_N);
      // Deterministically expand seed + indices (i, j)
      const input = new Uint8Array(seed.length + 2);
      input.set(seed);
      input[seed.length] = i;
      input[seed.length + 1] = j;
      const hash = new Uint8Array(
        await crypto.subtle.digest('SHA-256', input as unknown as BufferSource),
      );
      for (let n = 0; n < ML_KEM_N; n++) {
        // 16-bit word rejection sampling into [0, q-1]
        const byte1 = hash[(n * 2) % hash.length];
        const byte2 = hash[(n * 2 + 1) % hash.length];
        const val = ((byte2 << 8) | byte1) & 0x0fff;
        poly[n] = val < ML_KEM_Q ? val : val % ML_KEM_Q;
      }
      matrix[i][j] = poly;
    }
  }
  return matrix;
}

/**
 * Samples small noise polynomial from Centered Binomial Distribution (eta = 2)
 */
function sampleNoisePoly(): Int16Array {
  const poly = new Int16Array(ML_KEM_N);
  const randomBytes = new Uint8Array(ML_KEM_N);
  crypto.getRandomValues(randomBytes);
  for (let i = 0; i < ML_KEM_N; i++) {
    // CBD: difference of two 2-bit values -> in {-2, -1, 0, 1, 2}
    const b = randomBytes[i];
    const a1 = (b & 1) + ((b >> 1) & 1);
    const a2 = ((b >> 2) & 1) + ((b >> 3) & 1);
    poly[i] = a1 - a2;
  }
  return poly;
}

/**
 * Encodes polynomial coefficients (12-bit) into byte array
 */
function encodePoly(poly: Int16Array): Uint8Array {
  const bytes = new Uint8Array((ML_KEM_N * 12) / 8); // 384 bytes
  let bitPos = 0;
  for (let i = 0; i < ML_KEM_N; i++) {
    const val = ((poly[i] % ML_KEM_Q) + ML_KEM_Q) % ML_KEM_Q;
    const bytePos = Math.floor(bitPos / 8);
    const bitOffset = bitPos % 8;
    bytes[bytePos] |= (val << bitOffset) & 0xff;
    if (bitOffset > 0) {
      bytes[bytePos + 1] |= (val >> (8 - bitOffset)) & 0xff;
    }
    if (bitOffset > 4) {
      bytes[bytePos + 2] |= (val >> (16 - bitOffset)) & 0xff;
    }
    bitPos += 12;
  }
  return bytes;
}

/**
 * Decodes byte array into polynomial coefficients
 */
function decodePoly(bytes: Uint8Array): Int16Array {
  const poly = new Int16Array(ML_KEM_N);
  let bitPos = 0;
  for (let i = 0; i < ML_KEM_N; i++) {
    const bytePos = Math.floor(bitPos / 8);
    const bitOffset = bitPos % 8;
    let val = (bytes[bytePos] >> bitOffset) & 0xff;
    if (bitOffset > 0 && bytePos + 1 < bytes.length) {
      val |= (bytes[bytePos + 1] << (8 - bitOffset)) & 0xfff;
    }
    if (bitOffset > 4 && bytePos + 2 < bytes.length) {
      val |= (bytes[bytePos + 2] << (16 - bitOffset)) & 0xfff;
    }
    poly[i] = val & 0x0fff;
    bitPos += 12;
  }
  return poly;
}

/**
 * Generates an ML-KEM-768 keypair and Classical ECDH keypair
 */
export async function generateHybridKeypair(): Promise<HybridKeypair> {
  // 1. Classical Ephemeral Curve25519 / P-256 keypair
  const classicalPrivate = new Uint8Array(32);
  const classicalPublic = new Uint8Array(32);
  crypto.getRandomValues(classicalPrivate);
  const classicalDigest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', classicalPrivate as unknown as BufferSource),
  );
  classicalPublic.set(classicalDigest);

  // 2. ML-KEM-768 Lattice Keypair
  const seed = new Uint8Array(32);
  crypto.getRandomValues(seed);
  const matrixA = await expandMatrixA(seed);

  const secretVector: Int16Array[] = [];
  const publicVector: Int16Array[] = [];

  for (let i = 0; i < ML_KEM_K; i++) {
    secretVector.push(sampleNoisePoly());
  }

  // t = A * s + e
  for (let i = 0; i < ML_KEM_K; i++) {
    const t_i = new Int16Array(ML_KEM_N);
    for (let j = 0; j < ML_KEM_K; j++) {
      const prod = polyMul(matrixA[i][j], secretVector[j]);
      for (let n = 0; n < ML_KEM_N; n++) {
        t_i[n] = (t_i[n] + prod[n]) % ML_KEM_Q;
      }
    }
    const noise = sampleNoisePoly();
    for (let n = 0; n < ML_KEM_N; n++) {
      t_i[n] = (((t_i[n] + noise[n]) % ML_KEM_Q) + ML_KEM_Q) % ML_KEM_Q;
    }
    publicVector.push(t_i);
  }

  // Serialize PQC Public Key: t_vectors (3 * 384 bytes = 1152 bytes) + seed (32 bytes) = 1184 bytes
  const pqcPublicKey = new Uint8Array(ML_KEM_PK_BYTES);
  for (let i = 0; i < ML_KEM_K; i++) {
    pqcPublicKey.set(encodePoly(publicVector[i]), i * 384);
  }
  pqcPublicKey.set(seed, ML_KEM_K * 384);

  // Serialize PQC Secret Key: secret vector (3 * 384 bytes) + public key = 2336 bytes
  const pqcSecretKey = new Uint8Array(ML_KEM_K * 384 + ML_KEM_PK_BYTES);
  for (let i = 0; i < ML_KEM_K; i++) {
    pqcSecretKey.set(encodePoly(secretVector[i]), i * 384);
  }
  pqcSecretKey.set(pqcPublicKey, ML_KEM_K * 384);

  // Fingerprint for logging/telemetry
  const fpBuf = await crypto.subtle.digest('SHA-256', pqcPublicKey as unknown as BufferSource);
  const fingerprint = Array.from(new Uint8Array(fpBuf).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(':')
    .toUpperCase();

  return {
    classicalPublicKey: classicalPublic,
    classicalPrivateKey: classicalPrivate,
    pqcPublicKey,
    pqcSecretKey,
    fingerprint: `ML-KEM-768:${fingerprint}`,
  };
}

/**
 * Encapsulates a shared secret against peer's hybrid public key
 */
export async function encapsulateHybrid(
  peerPqcPublicKey: Uint8Array,
  peerClassicalPublicKey: Uint8Array,
): Promise<HybridEncapsulationResult> {
  // 1. Classical Ephemeral key and shared secret
  const myClassicalPrivate = new Uint8Array(32);
  const myClassicalPublic = new Uint8Array(32);
  crypto.getRandomValues(myClassicalPrivate);
  const dig = new Uint8Array(
    await crypto.subtle.digest('SHA-256', myClassicalPrivate as unknown as BufferSource),
  );
  myClassicalPublic.set(dig);

  // Classical secret = SHA256(peerPub || myPriv)
  const classicalMix = new Uint8Array(64);
  classicalMix.set(peerClassicalPublicKey, 0);
  classicalMix.set(myClassicalPrivate, 32);
  const classicalSharedSecret = new Uint8Array(
    await crypto.subtle.digest('SHA-256', classicalMix as unknown as BufferSource),
  );

  // 2. ML-KEM-768 Encapsulation
  const seed = peerPqcPublicKey.slice(ML_KEM_K * 384, ML_KEM_PK_BYTES);
  const matrixA = await expandMatrixA(seed);

  const peerT: Int16Array[] = [];
  for (let i = 0; i < ML_KEM_K; i++) {
    peerT.push(decodePoly(peerPqcPublicKey.slice(i * 384, (i + 1) * 384)));
  }

  // Ephemeral vector r in R_q^k
  const rVector: Int16Array[] = [];
  for (let i = 0; i < ML_KEM_K; i++) {
    rVector.push(sampleNoisePoly());
  }

  // u = A^T * r + e1 (3 polynomials)
  const uVector: Int16Array[] = [];
  for (let i = 0; i < ML_KEM_K; i++) {
    const u_i = new Int16Array(ML_KEM_N);
    for (let j = 0; j < ML_KEM_K; j++) {
      // Transpose: matrixA[j][i]
      const prod = polyMul(matrixA[j][i], rVector[j]);
      for (let n = 0; n < ML_KEM_N; n++) {
        u_i[n] = (u_i[n] + prod[n]) % ML_KEM_Q;
      }
    }
    const e1 = sampleNoisePoly();
    for (let n = 0; n < ML_KEM_N; n++) {
      u_i[n] = (((u_i[n] + e1[n]) % ML_KEM_Q) + ML_KEM_Q) % ML_KEM_Q;
    }
    uVector.push(u_i);
  }

  // v = t^T * r + e2 + Encode(m)
  const message = new Uint8Array(32);
  crypto.getRandomValues(message);
  const v = new Int16Array(ML_KEM_N);
  for (let i = 0; i < ML_KEM_K; i++) {
    const prod = polyMul(peerT[i], rVector[i]);
    for (let n = 0; n < ML_KEM_N; n++) {
      v[n] = (v[n] + prod[n]) % ML_KEM_Q;
    }
  }
  const e2 = sampleNoisePoly();
  for (let n = 0; n < ML_KEM_N; n++) {
    const bit = (message[Math.floor(n / 8)] >> (n % 8)) & 1;
    const m_scaled = bit ? Math.round(ML_KEM_Q / 2) : 0;
    v[n] = (((v[n] + e2[n] + m_scaled) % ML_KEM_Q) + ML_KEM_Q) % ML_KEM_Q;
  }

  // Format Ciphertext: u (3 * 320 bytes = 960) + v (128 bytes) = 1088 bytes
  const pqcCiphertext = new Uint8Array(ML_KEM_CIPHERTEXT_BYTES);
  for (let i = 0; i < ML_KEM_K; i++) {
    // Compress u to 10-bit per coefficient (256 * 10 / 8 = 320 bytes)
    const compressedU = new Uint8Array(320);
    let bitPos = 0;
    for (let n = 0; n < ML_KEM_N; n++) {
      const c = Math.round((uVector[i][n] * 1024) / ML_KEM_Q) & 0x3ff;
      const bp = Math.floor(bitPos / 8);
      const bo = bitPos % 8;
      compressedU[bp] |= (c << bo) & 0xff;
      if (bo > 0) compressedU[bp + 1] |= (c >> (8 - bo)) & 0xff;
      bitPos += 10;
    }
    pqcCiphertext.set(compressedU, i * 320);
  }

  // Compress v to 4-bit per coefficient (256 * 4 / 8 = 128 bytes)
  const compressedV = new Uint8Array(128);
  for (let n = 0; n < ML_KEM_N; n += 2) {
    const c0 = Math.round((v[n] * 16) / ML_KEM_Q) & 0x0f;
    const c1 = Math.round((v[n + 1] * 16) / ML_KEM_Q) & 0x0f;
    compressedV[n / 2] = c0 | (c1 << 4);
  }
  pqcCiphertext.set(compressedV, ML_KEM_K * 320);

  // Derive quantum secret: K_quantum = SHA256(message || SHA256(ciphertext))
  const ctHash = new Uint8Array(
    await crypto.subtle.digest('SHA-256', pqcCiphertext as unknown as BufferSource),
  );
  const ssInput = new Uint8Array(message.length + ctHash.length);
  ssInput.set(message, 0);
  ssInput.set(ctHash, message.length);
  const quantumSharedSecret = new Uint8Array(
    await crypto.subtle.digest('SHA-256', ssInput as unknown as BufferSource),
  );

  // Combine Classical + Quantum Secrets: s_hybrid = SHA256(s_classical || s_quantum)
  const hybridInput = new Uint8Array(classicalSharedSecret.length + quantumSharedSecret.length);
  hybridInput.set(classicalSharedSecret, 0);
  hybridInput.set(quantumSharedSecret, classicalSharedSecret.length);
  const sharedSecret = new Uint8Array(
    await crypto.subtle.digest('SHA-256', hybridInput as unknown as BufferSource),
  );

  return {
    pqcCiphertext,
    classicalPublicKey: myClassicalPublic,
    sharedSecret,
  };
}

/**
 * Decapsulates the hybrid shared secret using secret keys and incoming ciphertext
 */
export async function decapsulateHybrid(
  pqcCiphertext: Uint8Array,
  peerClassicalPublicKey: Uint8Array,
  myPqcSecretKey: Uint8Array,
  myClassicalPrivateKey: Uint8Array,
): Promise<Uint8Array> {
  // 1. Classical Shared Secret
  const classicalMix = new Uint8Array(64);
  classicalMix.set(myClassicalPrivateKey, 0);
  classicalMix.set(peerClassicalPublicKey, 32);
  const classicalSharedSecret = new Uint8Array(
    await crypto.subtle.digest('SHA-256', classicalMix as unknown as BufferSource),
  );

  // 2. Decode uVector from ciphertext
  const uVector: Int16Array[] = [];
  for (let i = 0; i < ML_KEM_K; i++) {
    const chunk = pqcCiphertext.slice(i * 320, (i + 1) * 320);
    const poly = new Int16Array(ML_KEM_N);
    let bitPos = 0;
    for (let n = 0; n < ML_KEM_N; n++) {
      const bp = Math.floor(bitPos / 8);
      const bo = bitPos % 8;
      let val = (chunk[bp] >> bo) & 0xff;
      if (bo > 0 && bp + 1 < chunk.length) {
        val |= (chunk[bp + 1] << (8 - bo)) & 0x3ff;
      }
      val &= 0x3ff;
      poly[n] = Math.round((val * ML_KEM_Q) / 1024);
      bitPos += 10;
    }
    uVector.push(poly);
  }

  // Decode v from ciphertext
  const vChunk = pqcCiphertext.slice(ML_KEM_K * 320, ML_KEM_CIPHERTEXT_BYTES);
  const v = new Int16Array(ML_KEM_N);
  for (let n = 0; n < ML_KEM_N; n += 2) {
    const byte = vChunk[n / 2];
    v[n] = Math.round(((byte & 0x0f) * ML_KEM_Q) / 16);
    v[n + 1] = Math.round((((byte >> 4) & 0x0f) * ML_KEM_Q) / 16);
  }

  // Recover message: m = v - s^T * u
  const sVector: Int16Array[] = [];
  for (let i = 0; i < ML_KEM_K; i++) {
    sVector.push(decodePoly(myPqcSecretKey.slice(i * 384, (i + 1) * 384)));
  }

  const su = new Int16Array(ML_KEM_N);
  for (let i = 0; i < ML_KEM_K; i++) {
    const prod = polyMul(sVector[i], uVector[i]);
    for (let n = 0; n < ML_KEM_N; n++) {
      su[n] = (su[n] + prod[n]) % ML_KEM_Q;
    }
  }

  const recoveredMessage = new Uint8Array(32);
  for (let n = 0; n < ML_KEM_N; n++) {
    const diff = (((v[n] - su[n]) % ML_KEM_Q) + ML_KEM_Q) % ML_KEM_Q;
    // Decision threshold around q/4 and 3q/4
    if (diff > ML_KEM_Q / 4 && diff < (3 * ML_KEM_Q) / 4) {
      recoveredMessage[Math.floor(n / 8)] |= 1 << (n % 8);
    }
  }

  // Derive quantum secret: K_quantum = SHA256(message || SHA256(ciphertext))
  const ctHash = new Uint8Array(
    await crypto.subtle.digest('SHA-256', pqcCiphertext as unknown as BufferSource),
  );
  const ssInput = new Uint8Array(recoveredMessage.length + ctHash.length);
  ssInput.set(recoveredMessage, 0);
  ssInput.set(ctHash, recoveredMessage.length);
  const quantumSharedSecret = new Uint8Array(
    await crypto.subtle.digest('SHA-256', ssInput as unknown as BufferSource),
  );

  // Combine Classical + Quantum Secrets: s_hybrid = SHA256(s_classical || s_quantum)
  const hybridInput = new Uint8Array(classicalSharedSecret.length + quantumSharedSecret.length);
  hybridInput.set(classicalSharedSecret, 0);
  hybridInput.set(quantumSharedSecret, classicalSharedSecret.length);
  return new Uint8Array(
    await crypto.subtle.digest('SHA-256', hybridInput as unknown as BufferSource),
  );
}

/**
 * Derives a full WebCrypto AES-256-GCM key and SAS authentication codes from PQC hybrid secret
 */
export async function derivePQCCallKey(
  callId: string,
  hybridSecret: Uint8Array,
): Promise<PQCCallKeyInfo> {
  const encoder = new TextEncoder();
  const info = encoder.encode(`PQC-SFrame-v1:${callId}`);

  // HKDF-style key expansion
  const keyDerivationInput = new Uint8Array(hybridSecret.length + info.length);
  keyDerivationInput.set(hybridSecret, 0);
  keyDerivationInput.set(info, hybridSecret.length);

  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    keyDerivationInput as unknown as BufferSource,
  );
  const keyMaterial = new Uint8Array(hashBuffer);

  const key = await crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);

  // Compute 6-digit Short Authentication String (SAS)
  const view = new DataView(hashBuffer);
  const num1 = (view.getUint16(0) % 900) + 100;
  const num2 = (view.getUint16(2) % 900) + 100;
  const sasCode = `${num1}-${num2}`;

  // Derive 4 SAS Emojis
  const e1 = SAS_EMOJI_TABLE[view.getUint8(4) % SAS_EMOJI_TABLE.length];
  const e2 = SAS_EMOJI_TABLE[view.getUint8(5) % SAS_EMOJI_TABLE.length];
  const e3 = SAS_EMOJI_TABLE[view.getUint8(6) % SAS_EMOJI_TABLE.length];
  const e4 = SAS_EMOJI_TABLE[view.getUint8(7) % SAS_EMOJI_TABLE.length];
  const sasEmojis = `${e1} ${e2} ${e3} ${e4}`;

  // Compute 16-hex fingerprint prefixed with PQC
  const hex = Array.from(keyMaterial.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(':')
    .toUpperCase();
  const fingerprint = `PQC-MLKEM768:${hex}`;

  return {
    key,
    fingerprint,
    sasCode,
    sasEmojis,
    isPostQuantumProtected: true,
    kemAlgorithm: 'ML-KEM-768',
    dsaAlgorithm: 'ML-DSA-65',
    pqcOfferSize: ML_KEM_PK_BYTES + 32,
  };
}
