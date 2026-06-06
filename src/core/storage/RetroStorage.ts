/**
 * RetroStorage: A high-capacity, high-reliability IndexedDB-backed storage service.
 * Designed to bypass the 5MB limitation of localStorage for loading, caching,
 * and swapping large assets, scene configurations, and project bundles.
 */
export class RetroStorage {
  private static dbName = 'RetroEngineDB';
  private static storeName = 'saves';
  private static dbPromise: Promise<IDBDatabase | null> | null = null;

  /**
   * Safe asynchronous database initialization and upgrade mechanism.
   */
  private static getDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve(null);
        return;
      }
      try {
        // Use database version 2 to guarantee upgrade handlers execute
        const request = indexedDB.open(this.dbName, 2);

        request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };

        request.onsuccess = (e: Event) => {
          const db = (e.target as IDBOpenDBRequest).result;
          resolve(db);
        };

        request.onerror = (e) => {
          console.warn('[RetroStorage] Failed to open IndexedDB, using localStorage fallback: ', e);
          resolve(null);
        };
      } catch (err) {
        console.warn('[RetroStorage] Error initializing high-capacity storage: ', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Retrieves a string value by key from high-capacity storage.
   * Falls back to localStorage if IndexedDB is blocked or unavailable.
   */
  public static async getItem(key: string): Promise<string | null> {
    const db = await this.getDB();
    if (!db) {
      return this.safeLocalStorageGet(key);
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get(key);

        req.onsuccess = () => {
          if (req.result !== undefined) {
            resolve(req.result);
          } else {
            // Fallback check in case it isn't in DB but might be in localStorage
            resolve(this.safeLocalStorageGet(key));
          }
        };

        req.onerror = () => {
          resolve(this.safeLocalStorageGet(key));
        };
      } catch (err) {
        console.warn(`[RetroStorage] Read exception for key "${key}", trying localStorage fallback:`, err);
        resolve(this.safeLocalStorageGet(key));
      }
    });
  }

  /**
   * Persists a string value to high-capacity IndexedDB.
   * Leverages localStorage fallback if IndexedDB storage is full or restricted.
   */
  public static async setItem(key: string, value: string): Promise<void> {
    const db = await this.getDB();
    if (!db) {
      this.safeLocalStorageSet(key, value);
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.put(value, key);

        req.onsuccess = () => {
          // Double-save tiny configurations to localStorage if helpful, or keep clean
          resolve();
        };

        req.onerror = (e) => {
          console.warn(`[RetroStorage] Fail to write key "${key}" to IndexedDB, fallback to localStorage:`, e);
          this.safeLocalStorageSet(key, value);
          resolve();
        };
      } catch (err) {
        console.warn(`[RetroStorage] Write exception for key "${key}":`, err);
        this.safeLocalStorageSet(key, value);
        resolve();
      }
    });
  }

  /**
   * Permanently removes a key from both IndexedDB and localStorage.
   */
  public static async removeItem(key: string): Promise<void> {
    const db = await this.getDB();
    
    // Always clear localStorage to keep databases synced
    this.safeLocalStorageRemove(key);

    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.delete(key);

        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch (err) {
        resolve();
      }
    });
  }

  /**
   * Helper to retrieve parsed high-capacity JSON objects.
   */
  public static async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /**
   * Helper to persist objects as JSON inside IndexedDB.
   */
  public static async setJson<T>(key: string, value: T): Promise<void> {
    await this.setItem(key, JSON.stringify(value));
  }

  // --- Private Safety Fallbacks ---

  private static safeLocalStorageGet(key: string): string | null {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`[RetroStorage Fallback] Failed reading key "${key}" from localStorage:`, e);
    }
    return null;
  }

  private static safeLocalStorageSet(key: string, val: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, val);
      }
    } catch (e) {
      console.warn(`[RetroStorage Fallback] Failed writing key "${key}" to localStorage:`, e);
    }
  }

  private static safeLocalStorageRemove(key: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[RetroStorage Fallback] Failed resetting key "${key}" in localStorage:`, e);
    }
  }
}
