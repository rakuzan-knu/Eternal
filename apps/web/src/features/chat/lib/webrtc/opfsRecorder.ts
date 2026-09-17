/**
 * Origin Private File System (OPFS) 4K Stream Recording Controller
 *
 * Captures high-bitrate MediaStream chunks and offloads them directly to
 * an OPFS Web Worker using Zero-Copy Transferable ArrayBuffers.
 * Ensures stable 60FPS UI and fixed <20MB RAM footprint.
 */

import type { WorkerInMessage, WorkerOutMessage } from './workers/opfsRecorder.worker';

export interface OpfsRecorderOptions {
  callId?: string;
  mimeType?: string;
  timesliceMs?: number;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
}

export class OpfsRecorder {
  private worker: Worker | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private state: 'inactive' | 'recording' | 'paused' = 'inactive';
  private totalBytesRecorded = 0;
  private currentFileName = '';
  private mimeType = 'video/webm';
  private pendingBlobResolve: ((blob: Blob) => void) | null = null;
  private pendingBlobReject: ((err: Error) => void) | null = null;

  /**
   * Check if the browser supports OPFS synchronous handles (in workers) & MediaRecorder
   */
  public static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.Worker !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      Boolean(navigator.storage?.getDirectory) &&
      typeof window.MediaRecorder !== 'undefined'
    );
  }

  /**
   * Start recording a MediaStream into OPFS
   */
  public async start(stream: MediaStream, options: OpfsRecorderOptions = {}): Promise<void> {
    if (this.state !== 'inactive') {
      throw new Error(`Cannot start recording while in state: ${this.state}`);
    }

    const callId = options.callId ?? `call-${Date.now()}`;
    this.currentFileName = `recording-${callId}-${Date.now()}.webm`;
    this.totalBytesRecorded = 0;

    // Pick best supported MIME type
    const candidateMimes = [
      options.mimeType,
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4',
    ].filter(Boolean) as string[];

    let selectedMime = 'video/webm';
    for (const mime of candidateMimes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMime = mime;
        break;
      }
    }
    this.mimeType = selectedMime;

    // Spin up the worker
    this.worker = new Worker(new URL('./workers/opfsRecorder.worker.ts', import.meta.url), {
      type: 'module',
    });

    await this.initWorker(this.currentFileName);

    // Initialize MediaRecorder
    const mediaRecorderOptions: MediaRecorderOptions = {
      mimeType: selectedMime,
      videoBitsPerSecond: options.videoBitsPerSecond ?? 12_000_000, // 12 Mbps for 4K
      audioBitsPerSecond: options.audioBitsPerSecond ?? 128_000,
    };

    try {
      this.mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
    } catch {
      // Fallback without bitrate hints
      this.mediaRecorder = new MediaRecorder(stream);
    }

    this.mediaRecorder.ondataavailable = async (event: BlobEvent) => {
      if (event.data && event.data.size > 0 && this.worker) {
        const buffer = await event.data.arrayBuffer();
        const msg: WorkerInMessage = { type: 'WRITE_CHUNK', buffer };
        // Zero-copy transfer to worker
        this.worker.postMessage(msg, [buffer]);
      }
    };

    // timeslice defaults to 1000ms to flush to disk regularly
    const timeslice = options.timesliceMs ?? 1000;
    this.mediaRecorder.start(timeslice);
    this.state = 'recording';
  }

  public pause(): void {
    if (this.mediaRecorder && this.state === 'recording') {
      this.mediaRecorder.pause();
      this.state = 'paused';
    }
  }

  public resume(): void {
    if (this.mediaRecorder && this.state === 'paused') {
      this.mediaRecorder.resume();
      this.state = 'recording';
    }
  }

  /**
   * Stops recording, closes handles and returns finalized Blob directly from OPFS
   */
  public async stop(): Promise<Blob> {
    if (this.state === 'inactive' || !this.mediaRecorder) {
      throw new Error('OpfsRecorder is not active');
    }

    return new Promise<Blob>((resolve, reject) => {
      this.pendingBlobResolve = resolve;
      this.pendingBlobReject = reject;

      this.mediaRecorder!.onstop = () => {
        if (this.worker) {
          const msg: WorkerInMessage = {
            type: 'GET_FILE_BLOB',
            mimeType: this.mimeType,
          };
          this.worker.postMessage(msg);
        } else {
          reject(new Error('Worker already terminated'));
        }
      };

      try {
        this.mediaRecorder!.stop();
      } catch (err) {
        reject(err as Error);
      }
      this.state = 'inactive';
    });
  }

  /**
   * Cleans up OPFS disk entry and terminates worker
   */
  public async cleanup(): Promise<void> {
    if (this.worker && this.currentFileName) {
      const msg: WorkerInMessage = {
        type: 'CLEANUP',
        fileName: this.currentFileName,
      };
      this.worker.postMessage(msg);
      // Short grace period before terminating
      setTimeout(() => {
        this.worker?.terminate();
        this.worker = null;
      }, 100);
    }
    this.state = 'inactive';
    this.mediaRecorder = null;
    this.totalBytesRecorded = 0;
  }

  public getState(): 'inactive' | 'recording' | 'paused' {
    return this.state;
  }

  public getRecordedBytes(): number {
    return this.totalBytesRecorded;
  }

  private initWorker(fileName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        return reject(new Error('Worker is null'));
      }

      this.worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
        const data = event.data;
        switch (data.type) {
          case 'INITIALIZED':
            resolve();
            break;

          case 'CHUNK_WRITTEN':
            if (typeof data.totalBytes === 'number') {
              this.totalBytesRecorded = data.totalBytes;
            }
            break;

          case 'FILE_BLOB':
            if (data.blob && this.pendingBlobResolve) {
              const res = this.pendingBlobResolve;
              this.pendingBlobResolve = null;
              this.pendingBlobReject = null;
              res(data.blob);
            }
            break;

          case 'ERROR':
            if (this.pendingBlobReject) {
              const rej = this.pendingBlobReject;
              this.pendingBlobResolve = null;
              this.pendingBlobReject = null;
              rej(new Error(data.error ?? 'Unknown OPFS worker error'));
            }
            break;
        }
      };

      this.worker.onerror = (err) => {
        reject(new Error(err.message ?? 'Worker initialization failed'));
      };

      const msg: WorkerInMessage = { type: 'INIT', fileName };
      this.worker.postMessage(msg);
    });
  }
}
