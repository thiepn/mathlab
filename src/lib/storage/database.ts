export interface StoredRecord<T> {
  id: string;
  value: T;
  updatedAt: number;
}

const DB_NAME = 'mathlab';
const DB_VERSION = 1;
const STORE = 'records';

export class MathLabDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is unavailable in this browser context.'));

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      request.onblocked = () => reject(new Error('MathLab storage upgrade is blocked by another open tab. Close other MathLab tabs and retry.'));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          this.dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error ?? new Error('IndexedDB could not be opened.'));
      };
    });

    return this.dbPromise;
  }

  private async transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
    const db = await this.open();
    return new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      let request: IDBRequest<T> | void;
      try { request = action(tx.objectStore(STORE)); }
      catch (error) { reject(error); return; }
      let value: T | undefined;
      if (request) {
        request.onsuccess = () => { value = request.result; };
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
      }
      tx.oncomplete = () => resolve(value);
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction was aborted.'));
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed.'));
    });
  }

  async put<T>(id: string, value: T): Promise<void> {
    await this.transaction('readwrite', (store) => store.put({ id, value, updatedAt: Date.now() } satisfies StoredRecord<T>));
  }

  async get<T>(id: string): Promise<StoredRecord<T> | undefined> {
    const value = await this.transaction<StoredRecord<T>>('readonly', (store) => store.get(id));
    return value;
  }

  async delete(id: string): Promise<void> {
    await this.transaction('readwrite', (store) => store.delete(id));
  }
}

export const mathLabDb = new MathLabDatabase();
