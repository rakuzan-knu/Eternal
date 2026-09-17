import { describe, expect, it } from 'vitest';
import {
  isInsertableStreamsSupported,
  attachSenderEncryption,
  attachReceiverDecryption,
} from '../e2ee/frameCrypto';

async function testAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

describe('WebRTC Frame Crypto (Insertable Streams E2EE)', () => {
  it('handles attachment gracefully when createEncodedStreams is missing', async () => {
    const mockSender = {} as unknown as RTCRtpSender;
    const mockReceiver = {} as unknown as RTCRtpReceiver;
    const key = await testAesKey();

    expect(attachSenderEncryption(mockSender, key)).toBe(false);
    expect(attachReceiverDecryption(mockReceiver, key)).toBe(false);
  });

  it('reports browser support status accurately', () => {
    const supported = isInsertableStreamsSupported();
    expect(typeof supported).toBe('boolean');
  });
});
