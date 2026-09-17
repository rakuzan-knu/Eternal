/**
 * WebRTC Insertable Streams Frame Cryptography (SFrame AES-256-GCM)
 *
 * End-to-End Encryption for WebRTC audio and video media streams.
 * Intercepts raw encoded media frames before RTP packetization and encrypts
 * them with AES-256-GCM using Web Crypto API.
 */

export interface EncodedStreamsSender extends RTCRtpSender {
  createEncodedStreams?: () => {
    readable: ReadableStream<RTCEncodedAudioFrame | RTCEncodedVideoFrame>;
    writable: WritableStream<RTCEncodedAudioFrame | RTCEncodedVideoFrame>;
  };
}

export interface EncodedStreamsReceiver extends RTCRtpReceiver {
  createEncodedStreams?: () => {
    readable: ReadableStream<RTCEncodedAudioFrame | RTCEncodedVideoFrame>;
    writable: WritableStream<RTCEncodedAudioFrame | RTCEncodedVideoFrame>;
  };
}

export interface CallKeyInfo {
  key: CryptoKey;
  fingerprint: string;
  sasCode: string;
  sasEmojis: string;
}

export const SAS_EMOJI_TABLE = [
  '🦊',
  '🐱',
  '🐶',
  '🦁',
  '🐯',
  '🐻',
  '🐼',
  '🐨',
  '🐸',
  '🐙',
  '🦋',
  '🦄',
  '🐝',
  '🐬',
  '🦉',
  '🦅',
  '🚀',
  '⚡',
  '🔥',
  '🌟',
  '💎',
  '🛡️',
  '🎯',
  '⚓',
  '🔮',
  '🎸',
  '🎨',
  '🍕',
  '🍉',
  '🍒',
  '🥑',
  '🪐',
  '🌈',
  '🏔️',
  '🏖️',
  '🏝️',
  '⛵',
  '🛸',
  '🧭',
  '🗝️',
  '🔔',
  '👑',
  '🕊️',
  '🌺',
  '🍀',
  '🍎',
  '🍓',
  '🏀',
  '⚽',
  '🏆',
  '🎁',
  '🎈',
  '☀️',
  '🌙',
  '⭐',
  '🌊',
  '💡',
  '⏰',
  '🎧',
  '📷',
  '🧩',
  '⚡',
  '🔮',
  '✨',
] as const;

const E2EE_MAGIC_TAG = 0xe2;
/** Legacy worker tag (0x7e): accepted on decrypt for mixed-version calls, never emitted. */
const E2EE_MAGIC_TAG_LEGACY = 0x7e;
const UNENCRYPTED_HEADER_BYTES = 10;
const IV_LENGTH = 12;

export const isInsertableStreamsSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    typeof RTCRtpSender !== 'undefined' &&
    typeof (RTCRtpSender.prototype as EncodedStreamsSender).createEncodedStreams === 'function'
  );
};

/**
 * Encrypts an encoded frame (audio or video) using AES-256-GCM
 */
async function encryptFrame(
  frame: RTCEncodedAudioFrame | RTCEncodedVideoFrame,
  key: CryptoKey,
): Promise<boolean> {
  const data = new Uint8Array(frame.data);
  if (data.length <= UNENCRYPTED_HEADER_BYTES) return false;

  const header = data.slice(0, UNENCRYPTED_HEADER_BYTES);
  const payload = data.slice(UNENCRYPTED_HEADER_BYTES);

  // Fresh random IV per frame (F4): no counters, no reuse across sessions.
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  try {
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      payload,
    );

    const encryptedData = new Uint8Array(ciphertext);
    const result = new Uint8Array(UNENCRYPTED_HEADER_BYTES + encryptedData.length + IV_LENGTH + 1);

    result.set(header, 0);
    result.set(encryptedData, UNENCRYPTED_HEADER_BYTES);
    result.set(iv, UNENCRYPTED_HEADER_BYTES + encryptedData.length);
    result[result.length - 1] = E2EE_MAGIC_TAG;

    frame.data = result.buffer;
    return true;
  } catch (err) {
    // Fail CLOSED (F3): never emit plaintext. Drop the frame.
    console.warn('Frame encryption failed, dropping frame (fail-closed)', err);
    return false;
  }
}

/**
 * Decrypts an incoming encoded frame
 */
async function decryptFrame(
  frame: RTCEncodedAudioFrame | RTCEncodedVideoFrame,
  key: CryptoKey,
): Promise<void> {
  const data = new Uint8Array(frame.data);
  if (data.length <= UNENCRYPTED_HEADER_BYTES + IV_LENGTH + 1) return;

  // Check magic tag: current 0xe2, plus legacy worker 0x7e for mixed-version calls.
  const tag = data[data.length - 1];
  if (tag !== E2EE_MAGIC_TAG && tag !== E2EE_MAGIC_TAG_LEGACY) {
    // Unencrypted or incompatible frame
    return;
  }

  const header = data.slice(0, UNENCRYPTED_HEADER_BYTES);
  const ivStart = data.length - 1 - IV_LENGTH;
  const iv = data.slice(ivStart, ivStart + IV_LENGTH);
  const ciphertext = data.slice(UNENCRYPTED_HEADER_BYTES, ivStart);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      ciphertext,
    );

    const result = new Uint8Array(UNENCRYPTED_HEADER_BYTES + decrypted.byteLength);
    result.set(header, 0);
    result.set(new Uint8Array(decrypted), UNENCRYPTED_HEADER_BYTES);

    frame.data = result.buffer;
  } catch {
    // Decryption failure (drop corrupted frame)
  }
}

/**
 * Attaches AES-256-GCM frame encryption to an outgoing RTCRtpSender
 */
export function attachSenderEncryption(sender: RTCRtpSender, key: CryptoKey): boolean {
  const encSender = sender as EncodedStreamsSender;
  if (typeof encSender.createEncodedStreams !== 'function') return false;

  try {
    const { readable, writable } = encSender.createEncodedStreams();

    const transformStream = new TransformStream<
      RTCEncodedAudioFrame | RTCEncodedVideoFrame,
      RTCEncodedAudioFrame | RTCEncodedVideoFrame
    >({
      async transform(frame, controller) {
        // Fail CLOSED: only encrypted frames continue downstream.
        if (await encryptFrame(frame, key)) controller.enqueue(frame);
      },
    });

    readable
      .pipeThrough(transformStream)
      .pipeTo(writable)
      .catch((err) => {
        console.warn('Sender encryption stream pipeline terminated', err);
      });

    return true;
  } catch (err) {
    console.warn('Failed to attach sender frame encryption', err);
    return false;
  }
}

/**
 * Attaches AES-256-GCM frame decryption to an incoming RTCRtpReceiver
 */
export function attachReceiverDecryption(receiver: RTCRtpReceiver, key: CryptoKey): boolean {
  const encReceiver = receiver as EncodedStreamsReceiver;
  if (typeof encReceiver.createEncodedStreams !== 'function') return false;

  try {
    const { readable, writable } = encReceiver.createEncodedStreams();

    const transformStream = new TransformStream<
      RTCEncodedAudioFrame | RTCEncodedVideoFrame,
      RTCEncodedAudioFrame | RTCEncodedVideoFrame
    >({
      async transform(frame, controller) {
        await decryptFrame(frame, key);
        controller.enqueue(frame);
      },
    });

    readable
      .pipeThrough(transformStream)
      .pipeTo(writable)
      .catch((err) => {
        console.warn('Receiver decryption stream pipeline terminated', err);
      });

    return true;
  } catch (err) {
    console.warn('Failed to attach receiver frame decryption', err);
    return false;
  }
}

/**
 * Generates a non-extractable WebCrypto ECDH P-256 keypair for E2EE call signaling.
 * extractable is strictly set to false: even if malicious XSS script executes in the page,
 * crypto.subtle.exportKey() will throw an InvalidAccessError exception.
 */
export async function generateNonExtractableCallKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false, // extractable: false! Key cannot be extracted via JS!
    ['deriveKey', 'deriveBits'],
  );
}

/**
 * Derives a non-extractable AES-256-GCM symmetric session key directly within WebCrypto container.
 */
export async function deriveNonExtractableSharedKey(
  localPrivateKey: CryptoKey,
  peerPublicKey: CryptoKey,
): Promise<CryptoKey> {
  return await crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: peerPublicKey,
    },
    localPrivateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // extractable: false! Session key cannot be exported via JS!
    ['encrypt', 'decrypt'],
  );
}
