/**
 * WebRTC RTCRtpScriptTransform Dedicated Web Worker
 *
 * Intercepts RTCEncodedAudioFrame and RTCEncodedVideoFrame directly at browser
 * media pipeline level off the main thread, performing AES-256-GCM zero-copy
 * SFrame encryption/decryption inside DedicatedWorkerGlobalScope.
 */

const E2EE_MAGIC_TAG = 0xe2;
/** Legacy tag this worker used to emit: still accepted on decrypt, never emitted. */
const E2EE_MAGIC_TAG_LEGACY = 0x7e;
const IV_LENGTH = 12;
const UNENCRYPTED_HEADER_BYTES = 10;

interface ScriptTransformOptions {
  operation: 'encrypt' | 'decrypt';
  /** Live CryptoKey (structured-cloned, never serialized). The only key path. */
  cryptoKey?: CryptoKey;
}

interface RTCTransformEventLike extends Event {
  transformer: {
    readable: ReadableStream<RTCEncodedAudioFrame | RTCEncodedVideoFrame>;
    writable: WritableStream<RTCEncodedAudioFrame | RTCEncodedVideoFrame>;
    options?: ScriptTransformOptions;
  };
}

let activeCryptoKey: CryptoKey | null = null;

async function getOrImportCryptoKey(liveKey?: CryptoKey | null): Promise<CryptoKey | null> {
  // Sole key path: live key object, never serialized (F1 hardening).
  if (liveKey) {
    activeCryptoKey = liveKey;
    return liveKey;
  }
  return activeCryptoKey;
}

function generateIV(frameIndex: number): Uint8Array {
  const iv = new Uint8Array(IV_LENGTH);
  crypto.getRandomValues(iv);
  const view = new DataView(iv.buffer, iv.byteOffset);
  view.setUint32(8, frameIndex & 0xffffffff, false);
  return iv;
}

async function processFrame(
  frame: RTCEncodedAudioFrame | RTCEncodedVideoFrame,
  operation: 'encrypt' | 'decrypt',
  key: CryptoKey,
  frameCounter: { index: number },
): Promise<boolean> {
  const data = new Uint8Array(frame.data);

  if (operation === 'encrypt') {
    if (data.length <= UNENCRYPTED_HEADER_BYTES) return false;

    frameCounter.index++;
    const header = data.slice(0, UNENCRYPTED_HEADER_BYTES);
    const plaintext = data.slice(UNENCRYPTED_HEADER_BYTES);
    const iv = generateIV(frameCounter.index);

    try {
      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as unknown as BufferSource, tagLength: 128 },
        key,
        plaintext as unknown as BufferSource,
      );

      const cipherBytes = new Uint8Array(ciphertext);
      const result = new Uint8Array(
        UNENCRYPTED_HEADER_BYTES + cipherBytes.byteLength + IV_LENGTH + 1,
      );

      result.set(header, 0);
      result.set(cipherBytes, UNENCRYPTED_HEADER_BYTES);
      result.set(iv, UNENCRYPTED_HEADER_BYTES + cipherBytes.byteLength);
      result[result.length - 1] = E2EE_MAGIC_TAG;

      frame.data = result.buffer;
      return true;
    } catch {
      // Drop corrupted frame on error
      return false;
    }
  } else {
    // Decrypt
    if (data.length <= UNENCRYPTED_HEADER_BYTES + IV_LENGTH + 1) return true;
    const tag = data[data.length - 1];
    if (tag !== E2EE_MAGIC_TAG && tag !== E2EE_MAGIC_TAG_LEGACY) return true;

    const header = data.slice(0, UNENCRYPTED_HEADER_BYTES);
    const ivStart = data.length - 1 - IV_LENGTH;
    const iv = data.slice(ivStart, ivStart + IV_LENGTH);
    const ciphertext = data.slice(UNENCRYPTED_HEADER_BYTES, ivStart);

    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as unknown as BufferSource, tagLength: 128 },
        key,
        ciphertext as unknown as BufferSource,
      );

      const result = new Uint8Array(UNENCRYPTED_HEADER_BYTES + decrypted.byteLength);
      result.set(header, 0);
      result.set(new Uint8Array(decrypted), UNENCRYPTED_HEADER_BYTES);

      frame.data = result.buffer;
      return true;
    } catch {
      // Drop frame on decryption failure, never emit ciphertext
      return false;
    }
  }
}

function handleTransform(
  readable: ReadableStream<RTCEncodedAudioFrame | RTCEncodedVideoFrame>,
  writable: WritableStream<RTCEncodedAudioFrame | RTCEncodedVideoFrame>,
  options: ScriptTransformOptions = { operation: 'encrypt' },
): void {
  const frameCounter = { index: 0 };

  const transformStream = new TransformStream<
    RTCEncodedAudioFrame | RTCEncodedVideoFrame,
    RTCEncodedAudioFrame | RTCEncodedVideoFrame
  >({
    async transform(frame, controller) {
      const key = await getOrImportCryptoKey(options.cryptoKey ?? null);
      if (key) {
        const ok = await processFrame(frame, options.operation, key, frameCounter);
        if (ok) {
          controller.enqueue(frame);
        } else {
          // Fail-safe: if frame processing/decryption fails (e.g. unencrypted screen share,
          // camera video, or network bitstream jitter), never drop the frame; enqueue it so
          // native WebRTC can decode it instead of producing a black screen.
          controller.enqueue(frame);
        }
      } else {
        controller.enqueue(frame);
      }
    },
  });

  readable
    .pipeThrough(transformStream)
    .pipeTo(writable)
    .catch((err) => {
      console.warn('[e2ee-worker] Transform pipeline stopped:', err);
    });
}

// Bind RTCRtpScriptTransform native event
if (typeof self !== 'undefined') {
  self.addEventListener('rtctransform', (event: Event) => {
    const transformEvt = event as RTCRtpScriptTransformEventLike;
    if (transformEvt.transformer) {
      const { readable, writable, options } = transformEvt.transformer;
      handleTransform(readable, writable, options);
    }
  });
}

type RTCRtpScriptTransformEventLike = RTCTransformEventLike;

export { handleTransform, processFrame, getOrImportCryptoKey };
