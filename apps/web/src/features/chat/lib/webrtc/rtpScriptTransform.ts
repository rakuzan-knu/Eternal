/**
 * Modern W3C RTCRtpScriptTransform Media Offload Pipeline
 *
 * Offloads live audio and video frame cryptography from the main React UI thread
 * directly to a Dedicated Web Worker using RTCRtpScriptTransform and Zero-Copy
 * Transferable Objects.
 */

import { attachSenderEncryption, attachReceiverDecryption } from '../e2ee/frameCrypto';

export interface ScriptTransformConfig {
  worker?: Worker;
  /** Live CryptoKey (structured-cloned into the worker, never serialized). */
  cryptoKey?: CryptoKey;
}

let sharedWorkerInstance: Worker | null = null;

/**
 * Checks if the browser supports W3C RTCRtpScriptTransform
 */
export function isScriptTransformSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { RTCRtpScriptTransform?: unknown }).RTCRtpScriptTransform ===
      'function'
  );
}

/**
 * Lazily creates or returns the shared E2EE script transform worker
 */
export function getOrCreateScriptTransformWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;

  if (!sharedWorkerInstance) {
    try {
      sharedWorkerInstance = new Worker(
        new URL('./workers/e2eeTransform.worker.ts', import.meta.url),
        { type: 'module' },
      );
    } catch (err) {
      console.warn('[ScriptTransform] Could not spawn E2EE worker:', err);
      return null;
    }
  }

  return sharedWorkerInstance;
}

/**
 * Terminates worker when call session ends
 */
export function terminateScriptTransformWorker(): void {
  if (sharedWorkerInstance) {
    sharedWorkerInstance.terminate();
    sharedWorkerInstance = null;
  }
}

/**
 * Attaches RTCRtpScriptTransform to an outgoing RTCRtpSender (or falls back to Insertable Streams)
 */
export function attachSenderScriptTransform(
  sender: RTCRtpSender,
  config: ScriptTransformConfig,
): boolean {
  const { cryptoKey } = config;

  if (isScriptTransformSupported()) {
    const worker = config.worker || getOrCreateScriptTransformWorker();
    if (worker && cryptoKey) {
      try {
        sender.transform = new RTCRtpScriptTransform(worker, {
          operation: 'encrypt',
          cryptoKey,
        });
        return true;
      } catch (err) {
        console.warn('[ScriptTransform] Failed to set sender.transform:', err);
      }
    }
  }

  // Graceful fallback to Insertable Streams (main thread createEncodedStreams)
  if (cryptoKey) {
    return attachSenderEncryption(sender, cryptoKey);
  }

  return false;
}

/**
 * Attaches RTCRtpScriptTransform to an incoming RTCRtpReceiver (or falls back to Insertable Streams)
 */
export function attachReceiverScriptTransform(
  receiver: RTCRtpReceiver,
  config: ScriptTransformConfig,
): boolean {
  const { cryptoKey } = config;

  if (isScriptTransformSupported()) {
    const worker = config.worker || getOrCreateScriptTransformWorker();
    if (worker && cryptoKey) {
      try {
        receiver.transform = new RTCRtpScriptTransform(worker, {
          operation: 'decrypt',
          cryptoKey,
        });
        return true;
      } catch (err) {
        console.warn('[ScriptTransform] Failed to set receiver.transform:', err);
      }
    }
  }

  // Graceful fallback to Insertable Streams (main thread createEncodedStreams)
  if (cryptoKey) {
    return attachReceiverDecryption(receiver, cryptoKey);
  }

  return false;
}
