/**
 * IndexedDB storage manager for custom Hobby MP3 audio files.
 * Allows users to upload and persist large MP3 audio files (>10MB)
 * without exceeding browser localStorage 5MB quota limits.
 */

const DB_NAME = 'HobbyAudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'custom_mp3_files';

export interface StoredHobbyAudio {
  id: string;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  updatedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function getAudioDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });

  return dbPromise;
}

/**
 * Save an uploaded MP3 file or Blob into IndexedDB
 */
export async function saveHobbyAudio(id: string, file: Blob | File, fileName: string): Promise<void> {
  try {
    const db = await getAudioDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const record: StoredHobbyAudio = {
      id,
      blob: file,
      fileName: fileName || 'audio_hobi.mp3',
      fileSize: file.size,
      mimeType: file.type || 'audio/mpeg',
      updatedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to save hobby audio to IndexedDB:', err);
    throw err;
  }
}

/**
 * Retrieve a stored custom Hobby audio Blob and metadata
 */
export async function getHobbyAudio(id: string): Promise<StoredHobbyAudio | null> {
  try {
    const db = await getAudioDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to get hobby audio from IndexedDB:', err);
    return null;
  }
}

/**
 * Delete a stored custom Hobby audio file
 */
export async function deleteHobbyAudio(id: string): Promise<void> {
  try {
    const db = await getAudioDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to delete hobby audio from IndexedDB:', err);
  }
}

/**
 * Global Hobby Audio Key for default hobby schedule audio setting
 */
export const GLOBAL_HOBBY_AUDIO_KEY = 'global_hobby_default_audio';
