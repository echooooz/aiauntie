import { FeedingRecord } from '../types';

const DB_NAME = 'aiauntie-db';
const STORE_NAME = 'record_snapshots';
const SNAPSHOT_KEY = 'feeding_records';
const LEGACY_LOCAL_STORAGE_KEY = 'feeding_records';

const sortRecords = (records: FeedingRecord[]) => {
  return [...records].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB.'));
  });
};

const readSnapshotFromIndexedDb = async (): Promise<FeedingRecord[] | null> => {
  try {
    const db = await openDatabase();

    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(SNAPSHOT_KEY);

      request.onsuccess = () => {
        const value = request.result;
        resolve(Array.isArray(value) ? sortRecords(value) : null);
      };
      request.onerror = () => reject(request.error || new Error('Failed to read IndexedDB snapshot.'));
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error || new Error('IndexedDB read transaction failed.'));
    });
  } catch {
    return null;
  }
};

const writeSnapshotToIndexedDb = async (records: FeedingRecord[]) => {
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(sortRecords(records), SNAPSHOT_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to write IndexedDB snapshot.'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB write transaction failed.'));
  });
};

const readSnapshotFromLocalStorage = (): FeedingRecord[] | null => {
  try {
    const saved = window.localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);
    if (!saved) {
      return null;
    }

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return null;
    }

    return sortRecords(parsed);
  } catch {
    return null;
  }
};

export const recordStorage = {
  async getAllRecords(): Promise<FeedingRecord[] | null> {
    const indexedDbSnapshot = await readSnapshotFromIndexedDb();
    if (indexedDbSnapshot) {
      return indexedDbSnapshot;
    }

    const legacySnapshot = readSnapshotFromLocalStorage();
    if (!legacySnapshot) {
      return null;
    }

    await this.saveRecords(legacySnapshot);
    window.localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
    return legacySnapshot;
  },

  async loadRecords(): Promise<FeedingRecord[] | null> {
    return this.getAllRecords();
  },

  async saveRecords(records: FeedingRecord[]): Promise<void> {
    try {
      await writeSnapshotToIndexedDb(records);
    } catch (error) {
      console.error('Falling back to localStorage persistence.', error);
      window.localStorage.setItem(LEGACY_LOCAL_STORAGE_KEY, JSON.stringify(sortRecords(records)));
    }
  },

  async clearRecords(): Promise<void> {
    await this.saveRecords([]);
  },
};
