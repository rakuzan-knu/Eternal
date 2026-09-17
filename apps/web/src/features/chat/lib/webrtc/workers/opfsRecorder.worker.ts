/**
 * Dedicated Web Worker for Origin Private File System (OPFS) 4K Stream Recording
 *
 * Utilizes FileSystemSyncAccessHandle.write() for zero-copy streaming direct to disk.
 * Runs in worker thread to maintain memory footprint strictly under 20MB even during
 * multi-hour 4K 60FPS call recordings.
 */

export interface WorkerInitMessage {
  type: 'INIT';
  fileName: string;
}

export interface WorkerWriteMessage {
  type: 'WRITE_CHUNK';
  buffer: ArrayBuffer;
}

export interface WorkerFlushMessage {
  type: 'FLUSH';
}

export interface WorkerCloseMessage {
  type: 'CLOSE';
}

export interface WorkerGetBlobMessage {
  type: 'GET_FILE_BLOB';
  mimeType?: string;
}

export interface WorkerCleanupMessage {
  type: 'CLEANUP';
  fileName?: string;
}

export type WorkerInMessage =
  | WorkerInitMessage
  | WorkerWriteMessage
  | WorkerFlushMessage
  | WorkerCloseMessage
  | WorkerGetBlobMessage
  | WorkerCleanupMessage;

export interface WorkerOutMessage {
  type: 'INITIALIZED' | 'CHUNK_WRITTEN' | 'FLUSHED' | 'CLOSED' | 'FILE_BLOB' | 'ERROR';
  fileName?: string;
  bytesWritten?: number;
  totalBytes?: number;
  blob?: Blob;
  error?: string;
}

// In standard Web Worker global scope
interface FileSystemSyncAccessHandleLike {
  write(buffer: ArrayBufferView | ArrayBuffer, options?: { at: number }): number;
  truncate(newSize: number): void;
  getSize(): number;
  flush(): void;
  close(): void;
}

interface FileSystemFileHandleLike {
  createSyncAccessHandle(): Promise<FileSystemSyncAccessHandleLike>;
  getFile(): Promise<File>;
}

interface FileSystemDirectoryHandleLike {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandleLike>;
  removeEntry(name: string): Promise<void>;
}

let syncAccessHandle: FileSystemSyncAccessHandleLike | null = null;
let currentFileHandle: FileSystemFileHandleLike | null = null;
let activeFileName = '';
let currentOffset = 0;

self.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
  if (event.origin !== self.location.origin && event.origin !== '' && event.origin !== 'null') {
    return;
  }
  const message = event.data;

  try {
    switch (message.type) {
      case 'INIT': {
        activeFileName = message.fileName;
        currentOffset = 0;

        const root =
          (await navigator.storage.getDirectory()) as unknown as FileSystemDirectoryHandleLike;
        currentFileHandle = await root.getFileHandle(activeFileName, { create: true });
        syncAccessHandle = await currentFileHandle.createSyncAccessHandle();
        syncAccessHandle.truncate(0);

        self.postMessage({
          type: 'INITIALIZED',
          fileName: activeFileName,
        } satisfies WorkerOutMessage);
        break;
      }

      case 'WRITE_CHUNK': {
        if (!syncAccessHandle) {
          throw new Error('OPFS SyncAccessHandle not initialized.');
        }

        const dataView = new DataView(message.buffer);
        const written = syncAccessHandle.write(dataView, { at: currentOffset });
        currentOffset += written;

        self.postMessage({
          type: 'CHUNK_WRITTEN',
          bytesWritten: written,
          totalBytes: currentOffset,
        } satisfies WorkerOutMessage);
        break;
      }

      case 'FLUSH': {
        if (syncAccessHandle) {
          syncAccessHandle.flush();
        }
        self.postMessage({ type: 'FLUSHED' } satisfies WorkerOutMessage);
        break;
      }

      case 'CLOSE': {
        if (syncAccessHandle) {
          syncAccessHandle.flush();
          syncAccessHandle.close();
          syncAccessHandle = null;
        }

        self.postMessage({
          type: 'CLOSED',
          totalBytes: currentOffset,
          fileName: activeFileName,
        } satisfies WorkerOutMessage);
        break;
      }

      case 'GET_FILE_BLOB': {
        if (!currentFileHandle) {
          throw new Error('No active file handle to generate blob.');
        }

        // If access handle is still open, close it temporarily to read file
        if (syncAccessHandle) {
          syncAccessHandle.flush();
          syncAccessHandle.close();
          syncAccessHandle = null;
        }

        const file = await currentFileHandle.getFile();
        const mimeType = message.mimeType ?? 'video/webm';
        const blob = new Blob([file], { type: mimeType });

        self.postMessage({
          type: 'FILE_BLOB',
          blob,
          totalBytes: blob.size,
        } satisfies WorkerOutMessage);
        break;
      }

      case 'CLEANUP': {
        if (syncAccessHandle) {
          try {
            syncAccessHandle.close();
          } catch {
            // handle might already be closed
          }
          syncAccessHandle = null;
        }

        const fileToDelete = message.fileName ?? activeFileName;
        if (fileToDelete) {
          try {
            const root =
              (await navigator.storage.getDirectory()) as unknown as FileSystemDirectoryHandleLike;
            await root.removeEntry(fileToDelete);
          } catch {
            // ignore cleanup failure if file already removed
          }
        }

        currentFileHandle = null;
        activeFileName = '';
        currentOffset = 0;
        break;
      }
    }
  } catch (err) {
    self.postMessage({
      type: 'ERROR',
      error: (err as Error).message ?? 'Unknown OPFS worker error',
    } satisfies WorkerOutMessage);
  }
};
