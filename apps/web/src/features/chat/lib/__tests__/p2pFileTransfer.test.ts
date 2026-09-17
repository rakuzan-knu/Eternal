import { describe, it, expect, vi } from 'vitest';
import { P2PFileManager, type FileTransferItem } from '../webrtc/p2pFileTransfer';

describe('P2PFileManager', () => {
  if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
    Blob.prototype.arrayBuffer = async function () {
      const text = typeof this.text === 'function' ? await this.text() : '';
      return new TextEncoder().encode(text).buffer;
    };
  }

  it('manages data channel and initiates file sending with chunking', async () => {
    const updates: FileTransferItem[] = [];
    const manager = new P2PFileManager((item) => {
      updates.push(item);
    });

    const mockChannel = {
      readyState: 'open',
      binaryType: 'blob',
      bufferedAmount: 0,
      bufferedAmountLowThreshold: 0,
      send: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as RTCDataChannel;

    manager.bindDataChannel(mockChannel);
    expect(manager.getDataChannel()).toBe(mockChannel);

    const testFile = new File(['Hello WebRTC P2P World!'], 'hello.txt', {
      type: 'text/plain',
    });

    const transferId = await manager.sendFile(testFile);
    expect(transferId).toBeDefined();
    expect(updates.length).toBeGreaterThan(0);
    expect(updates[0].name).toBe('hello.txt');
    expect(mockChannel.send).toHaveBeenCalled();

    manager.cancelTransfer(transferId);
    manager.destroy();
  });
});
