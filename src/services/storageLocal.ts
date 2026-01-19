
/*
 * 💾 SERVICE: LOCAL STORAGE (Legacy/Isolation)
 * Provides access to IndexedDB for features that haven't been migrated to Cloud yet (e.g. Syd Chat)
 */

const DB_NAME = 'CineSketchDB';
const DB_VERSION = 3;

// Re-exporting the basic DB helpers from the original storage.ts
export const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('project_data')) {
                db.createObjectStore('project_data');
            }
            if (!db.objectStoreNames.contains('image_data')) {
                db.createObjectStore('image_data');
            }
            if (!db.objectStoreNames.contains('syd_threads')) {
                const store = db.createObjectStore('syd_threads', { keyPath: 'id' });
                store.createIndex('projectId', 'projectId', { unique: false });
            }
            if (!db.objectStoreNames.contains('syd_messages')) {
                const store = db.createObjectStore('syd_messages', { keyPath: 'id' });
                store.createIndex('threadId', 'threadId', { unique: false });
            }
        };
    });
};

export const dbGet = async <T>(storeName: string, key: string): Promise<T | null> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result as T);
        });
    } catch (e) {
        console.error(`DB Read Error (${storeName}):`, e);
        return null;
    }
};

export const dbSet = async (storeName: string, key: string, value: any): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(value, key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

export const dbGetAllKeys = async (storeName: string): Promise<IDBValidKey[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAllKeys();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
};
