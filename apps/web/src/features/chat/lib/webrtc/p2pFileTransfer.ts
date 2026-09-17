/**
 * P2P File Transfer Engine via WebRTC DataChannel.
 * Delivers unlimited file sizes directly between peers with zero server costs ($0).
 * Features 32KB binary chunking, backpressure management, and speed telemetry.
 */

export interface FileTransferItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  direction: 'outgoing' | 'incoming';
  status: 'pending' | 'transferring' | 'completed' | 'cancelled' | 'error';
  progress: number; // 0 - 100
  speedMb: number; // MB/s
  blobUrl?: string;
  error?: string;
}

export type TransferUpdateListener = (item: FileTransferItem) => void;

interface FileMetaEnvelope {
  type: 'file-meta';
  id: string;
  name: string;
  size: number;
  mimeType: string;
  chunkSize: number;
  totalChunks: number;
}

interface FileControlEnvelope {
  type: 'file-cancel' | 'file-complete';
  id: string;
}

const CHUNK_SIZE = 32 * 1024; // 32 KB chunk size
const MAX_BUFFERED_AMOUNT = 2 * 1024 * 1024; // 2 MB backpressure threshold

export class P2PFileManager {
  private channel: RTCDataChannel | null = null;
  private onUpdate: TransferUpdateListener;
  private activeTransfers: Map<string, FileTransferItem> = new Map();
  private incomingBuffers: Map<
    string,
    {
      meta: FileMetaEnvelope;
      chunks: ArrayBuffer[];
      receivedChunks: number;
      startTime: number;
      bytesReceived: number;
    }
  > = new Map();
  private isCancelledMap: Map<string, boolean> = new Map();

  constructor(onUpdate: TransferUpdateListener) {
    this.onUpdate = onUpdate;
  }

  public bindDataChannel(channel: RTCDataChannel): void {
    this.channel = channel;
    this.channel.binaryType = 'arraybuffer';
    this.channel.bufferedAmountLowThreshold = 512 * 1024; // 512 KB

    this.channel.onmessage = (event) => {
      this.handleIncomingMessage(event.data);
    };

    this.channel.onerror = (err) => {
      console.warn('[P2PFile] DataChannel error:', err);
    };
  }

  public getDataChannel(): RTCDataChannel | null {
    return this.channel;
  }

  public async sendFile(file: File): Promise<string> {
    if (!this.channel || this.channel.readyState !== 'open') {
      throw new Error('P2P DataChannel is not open');
    }

    const fileId = `p2p_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    const item: FileTransferItem = {
      id: fileId,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      direction: 'outgoing',
      status: 'transferring',
      progress: 0,
      speedMb: 0,
    };

    this.activeTransfers.set(fileId, item);
    this.isCancelledMap.set(fileId, false);
    this.onUpdate(item);

    // 1. Send metadata envelope
    const meta: FileMetaEnvelope = {
      type: 'file-meta',
      id: fileId,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      chunkSize: CHUNK_SIZE,
      totalChunks,
    };

    this.channel.send(JSON.stringify(meta));

    // 2. Stream binary chunks asynchronously with backpressure
    void this.streamFileChunks(file, meta);

    return fileId;
  }

  private async streamFileChunks(file: File, meta: FileMetaEnvelope): Promise<void> {
    const { id, totalChunks } = meta;
    const startTime = performance.now();
    let bytesSent = 0;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      if (this.isCancelledMap.get(id)) {
        return;
      }

      // Check backpressure on channel buffer
      if (this.channel && this.channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
        await this.waitForBufferDrain();
      }

      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const slice = file.slice(start, end);
      const buffer = await this.readBlobAsArrayBuffer(slice);

      // Prefix chunk with 8-byte header: 4-byte chunk index (Uint32) + 4-byte fileId hash (Uint32)
      const packet = new Uint8Array(8 + buffer.byteLength);
      const view = new DataView(packet.buffer);
      view.setUint32(0, chunkIndex);
      view.setUint32(4, this.hashString(id));
      packet.set(new Uint8Array(buffer), 8);

      try {
        this.channel?.send(packet.buffer);
      } catch (err) {
        console.error('[P2PFile] Error sending chunk:', err);
        this.markError(id, 'Send failed');
        return;
      }

      bytesSent += buffer.byteLength;
      const elapsedSec = Math.max(0.01, (performance.now() - startTime) / 1000);
      const speedMb = Number((bytesSent / (1024 * 1024) / elapsedSec).toFixed(2));
      const progress = Math.min(100, Math.round(((chunkIndex + 1) / totalChunks) * 100));

      const updatedItem: FileTransferItem = {
        ...this.activeTransfers.get(id)!,
        progress,
        speedMb,
        status: progress >= 100 ? 'completed' : 'transferring',
      };
      this.activeTransfers.set(id, updatedItem);
      this.onUpdate(updatedItem);
    }

    // Send completion envelope
    if (this.channel && this.channel.readyState === 'open') {
      const completeMsg: FileControlEnvelope = { type: 'file-complete', id };
      this.channel.send(JSON.stringify(completeMsg));
    }
  }

  private waitForBufferDrain(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.channel || this.channel.bufferedAmount <= MAX_BUFFERED_AMOUNT) {
        resolve();
        return;
      }
      const onLow = () => {
        this.channel?.removeEventListener('bufferedamountlow', onLow);
        resolve();
      };
      this.channel.addEventListener('bufferedamountlow', onLow);
    });
  }

  private readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    if (typeof blob.arrayBuffer === 'function') {
      return blob.arrayBuffer();
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  private handleIncomingMessage(data: string | ArrayBuffer): void {
    if (typeof data === 'string') {
      try {
        const payload = JSON.parse(data);
        if (payload.type === 'file-meta') {
          this.handleMetaEnvelope(payload as FileMetaEnvelope);
        } else if (payload.type === 'file-cancel') {
          this.handleCancelEnvelope(payload.id);
        } else if (payload.type === 'file-complete') {
          this.finalizeIncomingFile(payload.id);
        }
      } catch (err) {
        console.warn('[P2PFile] Failed to parse control packet:', err);
      }
      return;
    }

    if (data instanceof ArrayBuffer) {
      this.handleBinaryChunk(data);
    }
  }

  private handleMetaEnvelope(meta: FileMetaEnvelope): void {
    this.incomingBuffers.set(meta.id, {
      meta,
      chunks: new Array(meta.totalChunks),
      receivedChunks: 0,
      startTime: performance.now(),
      bytesReceived: 0,
    });

    const item: FileTransferItem = {
      id: meta.id,
      name: meta.name,
      size: meta.size,
      mimeType: meta.mimeType,
      direction: 'incoming',
      status: 'transferring',
      progress: 0,
      speedMb: 0,
    };

    this.activeTransfers.set(meta.id, item);
    this.onUpdate(item);
  }

  private handleBinaryChunk(data: ArrayBuffer): void {
    if (data.byteLength < 8) return;

    const view = new DataView(data);
    const chunkIndex = view.getUint32(0);
    const idHash = view.getUint32(4);

    // Find corresponding incoming file buffer by hash
    let targetId: string | null = null;
    for (const [id] of this.incomingBuffers) {
      if (this.hashString(id) === idHash) {
        targetId = id;
        break;
      }
    }

    if (!targetId) return;
    const tracker = this.incomingBuffers.get(targetId)!;
    const rawChunk = data.slice(8);

    if (!tracker.chunks[chunkIndex]) {
      tracker.chunks[chunkIndex] = rawChunk;
      tracker.receivedChunks++;
      tracker.bytesReceived += rawChunk.byteLength;
    }

    const elapsedSec = Math.max(0.01, (performance.now() - tracker.startTime) / 1000);
    const speedMb = Number((tracker.bytesReceived / (1024 * 1024) / elapsedSec).toFixed(2));
    const progress = Math.min(
      100,
      Math.round((tracker.receivedChunks / tracker.meta.totalChunks) * 100),
    );

    const item: FileTransferItem = {
      ...this.activeTransfers.get(targetId)!,
      progress,
      speedMb,
    };
    this.activeTransfers.set(targetId, item);
    this.onUpdate(item);

    if (tracker.receivedChunks >= tracker.meta.totalChunks) {
      this.finalizeIncomingFile(targetId);
    }
  }

  private finalizeIncomingFile(fileId: string): void {
    const tracker = this.incomingBuffers.get(fileId);
    if (!tracker) return;

    try {
      const blob = new Blob(tracker.chunks, { type: tracker.meta.mimeType });
      const blobUrl = URL.createObjectURL(blob);

      const existingItem = this.activeTransfers.get(fileId);
      if (existingItem?.blobUrl) {
        URL.revokeObjectURL(existingItem.blobUrl);
      }

      const item: FileTransferItem = {
        ...this.activeTransfers.get(fileId)!,
        progress: 100,
        status: 'completed',
        blobUrl,
      };

      this.activeTransfers.set(fileId, item);
      this.incomingBuffers.delete(fileId);
      this.onUpdate(item);
    } catch {
      this.markError(fileId, 'Assembly error');
    }
  }

  public cancelTransfer(fileId: string): void {
    this.isCancelledMap.set(fileId, true);
    this.incomingBuffers.delete(fileId);

    if (this.channel && this.channel.readyState === 'open') {
      const msg: FileControlEnvelope = { type: 'file-cancel', id: fileId };
      this.channel.send(JSON.stringify(msg));
    }

    const item = this.activeTransfers.get(fileId);
    if (item) {
      if (item.blobUrl) {
        URL.revokeObjectURL(item.blobUrl);
        item.blobUrl = undefined;
      }
      const updated: FileTransferItem = { ...item, status: 'cancelled' };
      this.activeTransfers.set(fileId, updated);
      this.onUpdate(updated);
    }
  }

  private handleCancelEnvelope(fileId: string): void {
    this.incomingBuffers.delete(fileId);
    const item = this.activeTransfers.get(fileId);
    if (item) {
      if (item.blobUrl) {
        URL.revokeObjectURL(item.blobUrl);
        item.blobUrl = undefined;
      }
      const updated: FileTransferItem = { ...item, status: 'cancelled' };
      this.activeTransfers.set(fileId, updated);
      this.onUpdate(updated);
    }
  }

  private markError(fileId: string, errorMsg: string): void {
    const item = this.activeTransfers.get(fileId);
    if (item) {
      const updated: FileTransferItem = { ...item, status: 'error', error: errorMsg };
      this.activeTransfers.set(fileId, updated);
      this.onUpdate(updated);
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  public destroy(): void {
    this.activeTransfers.forEach((item) => {
      if (item.blobUrl) {
        URL.revokeObjectURL(item.blobUrl);
      }
    });
    this.activeTransfers.clear();
    this.incomingBuffers.clear();
    this.isCancelledMap.clear();
  }
}
