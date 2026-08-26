/**
 * Lightweight Promise-based IndexedDB Key-Value Storage
 * Used for safely caching heavy media files (such as animated GIFs, background photos, and blobs)
 * and rich local theme configurations without hitting localStorage's ~5MB limit (avoids QuotaExceededError).
 */

const DB_NAME = 'eternal_chat_theme_db';
const DB_VERSION = 1;
const STORE_NAME = 'theme_media_store';

function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

export async function idbGet<T = unknown>(key: string): Promise<T | undefined> {
  try {
    const db = await openDatabase();
    if (!db) return undefined;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          resolve(req.result as T);
        };

        req.onerror = () => {
          resolve(undefined);
        };
      } catch {
        resolve(undefined);
      }
    });
  } catch {
    return undefined;
  }
}

export async function idbSet<T = unknown>(key: string, val: T): Promise<void> {
  try {
    const db = await openDatabase();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(val, key);

        req.onsuccess = () => {
          resolve();
        };

        req.onerror = () => {
          resolve();
        };
      } catch {
        resolve();
      }
    });
  } catch {
    // Ignore
  }
}

export async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openDatabase();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);

        req.onsuccess = () => {
          resolve();
        };

        req.onerror = () => {
          resolve();
        };
      } catch {
        resolve();
      }
    });
  } catch {
    // Ignore
  }
}

export async function idbClear(): Promise<void> {
  try {
    const db = await openDatabase();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();

        req.onsuccess = () => {
          resolve();
        };

        req.onerror = () => {
          resolve();
        };
      } catch {
        resolve();
      }
    });
  } catch {
    // Ignore
  }
}
