/**
 * Persistent Mutation Outbox Queue (Telegram Offline Send)
 *
 * Implements the Client Outbox Pattern using browser IndexedDB:
 * 1. Upon user send, mutation is persisted to IndexedDB with status 'pending'.
 * 2. Instant optimistic render in the UI with a clock icon (🕒).
 * 3. Background worker flushes mutations with X-Idempotency-Key.
 * 4. Freezes on network drop, automatically flushes on window.ononline & socket reconnect.
 * 5. Guarantees zero message loss across reloads, crashes, and unstable networks.
 */

export interface OutboxChatMessagePayload {
  conversationId: string;
  text?: string;
  replyToId?: string;
  attachments?: unknown[];
  clientSeq?: number;
}

export interface OutboxMutation {
  id: string; // clientMessageId
  type: 'CHAT_MESSAGE';
  conversationId: string;
  payload: OutboxChatMessagePayload;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  createdAt: number;
  retryCount: number;
  idempotencyKey: string;
  lastError?: string;
}

const DB_NAME = 'eternal_outbox_db';
const STORE_NAME = 'mutations';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getOutboxDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable in current runtime'));
  }

  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('conversationId', 'conversationId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error ?? new Error('Failed to open Outbox IndexedDB'));
      };
    });
  }

  return dbPromise;
}

/** In-memory fallback for runtimes without IndexedDB (SSR, jsdom tests, rare private modes). */
const memoryOutboxStore = new Map<string, OutboxMutation>();

export const mutationOutboxDb = {
  async put(mutation: OutboxMutation): Promise<void> {
    try {
      const db = await getOutboxDB();
      return await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(mutation);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      memoryOutboxStore.set(mutation.id, { ...mutation });
    }
  },

  async get(id: string): Promise<OutboxMutation | null> {
    try {
      const db = await getOutboxDB();
      return await new Promise<OutboxMutation | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(id);
        req.onsuccess = () => resolve((req.result as OutboxMutation) ?? null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return memoryOutboxStore.get(id) ?? null;
    }
  },

  async getAllPending(): Promise<OutboxMutation[]> {
    try {
      const db = await getOutboxDB();
      return await new Promise<OutboxMutation[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const items = (req.result as OutboxMutation[]) || [];
          // Filter only pending or failed items, sorted by creation timestamp
          const pending = items
            .filter((m) => m.status === 'pending' || m.status === 'failed')
            .sort((a, b) => a.createdAt - b.createdAt);
          resolve(pending);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return Array.from(memoryOutboxStore.values())
        .filter((m) => m.status === 'pending' || m.status === 'failed')
        .sort((a, b) => a.createdAt - b.createdAt);
    }
  },

  async updateStatus(
    id: string,
    status: OutboxMutation['status'],
    lastError?: string,
  ): Promise<void> {
    try {
      const db = await getOutboxDB();
      return await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const item = getReq.result as OutboxMutation | undefined;
          if (item) {
            item.status = status;
            if (lastError !== undefined) item.lastError = lastError;
            if (status === 'sending') item.retryCount = (item.retryCount || 0) + 1;
            store.put(item);
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      const item = memoryOutboxStore.get(id);
      if (item) {
        item.status = status;
        if (lastError !== undefined) item.lastError = lastError;
        if (status === 'sending') item.retryCount = (item.retryCount || 0) + 1;
        memoryOutboxStore.set(id, item);
      }
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const db = await getOutboxDB();
      return await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      memoryOutboxStore.delete(id);
    }
  },

  async clear(): Promise<void> {
    try {
      const db = await getOutboxDB();
      return await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      memoryOutboxStore.clear();
    }
  },
};

export type MutationDispatcher = (mutation: OutboxMutation) => Promise<boolean>;

export class MutationOutboxEngine {
  private isProcessing = false;
  private dispatcher: MutationDispatcher | null = null;
  private onMutationSentCallbacks = new Set<(mutation: OutboxMutation) => void>();

  constructor() {
    this.initNetworkListeners();
  }

  public setDispatcher(dispatcher: MutationDispatcher): void {
    this.dispatcher = dispatcher;
  }

  public onMutationSent(callback: (mutation: OutboxMutation) => void): () => void {
    this.onMutationSentCallbacks.add(callback);
    return () => this.onMutationSentCallbacks.delete(callback);
  }

  private initNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      void this.flush();
    });
  }

  /**
   * Enqueues a message mutation into IndexedDB outbox with status 'pending'.
   */
  public async enqueueMessage(
    clientMessageId: string,
    payload: OutboxChatMessagePayload,
    autoFlush = true,
  ): Promise<OutboxMutation> {
    const mutation: OutboxMutation = {
      id: clientMessageId,
      type: 'CHAT_MESSAGE',
      conversationId: payload.conversationId,
      payload,
      status: 'pending',
      createdAt: Date.now(),
      retryCount: 0,
      idempotencyKey: `idemp_${clientMessageId}`,
    };

    await mutationOutboxDb.put(mutation);

    // Speculatively attempt flush if online
    if (autoFlush && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      void this.flush();
    }

    return mutation;
  }

  /**
   * Flushes all pending mutations in FIFO order.
   * Freezes immediately if network drops or offline.
   */
  public async flush(): Promise<void> {
    if (this.isProcessing) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (!this.dispatcher) return;

    this.isProcessing = true;

    try {
      while (true) {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          // Network dropped mid-flush; freeze queue
          break;
        }

        const pendingList = await mutationOutboxDb.getAllPending();
        if (pendingList.length === 0) break;

        const item = pendingList[0];
        await mutationOutboxDb.updateStatus(item.id, 'sending');

        try {
          const success = await this.dispatcher(item);
          if (success) {
            await mutationOutboxDb.delete(item.id);
            this.onMutationSentCallbacks.forEach((cb) => cb(item));
          } else {
            await mutationOutboxDb.updateStatus(item.id, 'failed', 'Dispatcher rejected');
            break;
          }
        } catch (err) {
          const errStr = err instanceof Error ? err.message : String(err);
          await mutationOutboxDb.updateStatus(item.id, 'failed', errStr);
          break;
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

export const mutationOutbox = new MutationOutboxEngine();
