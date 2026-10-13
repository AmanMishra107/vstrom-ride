// ============================================================
// Local Audio Storage Service — Stores imported music tracks in IndexedDB
// ============================================================

import { openDB, type IDBPDatabase } from 'idb';

export interface LocalTrack {
  id: string;
  name: string;
  artist: string;
  title: string;
  blob: Blob;
  size: number;
  type: string;
  duration?: number;
  addedAt: number;
}

const DB_NAME = 'vstrom-audio-library';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';

let audioDbPromise: Promise<IDBPDatabase> | null = null;

function getAudioDB(): Promise<IDBPDatabase> {
  if (!audioDbPromise) {
    audioDbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('by_added', 'addedAt');
        }
      },
    });
  }
  return audioDbPromise;
}

export async function getAllLocalTracks(): Promise<LocalTrack[]> {
  try {
    const db = await getAudioDB();
    const tracks = await db.getAllFromIndex(STORE_NAME, 'by_added');
    return tracks;
  } catch (err) {
    console.warn('[AudioStorage] Failed to read tracks:', err);
    return [];
  }
}

export async function saveLocalTrack(track: LocalTrack): Promise<void> {
  try {
    const db = await getAudioDB();
    await db.put(STORE_NAME, track);
  } catch (err) {
    console.warn('[AudioStorage] Failed to save track:', err);
  }
}

export async function deleteLocalTrack(id: string): Promise<void> {
  try {
    const db = await getAudioDB();
    await db.delete(STORE_NAME, id);
  } catch (err) {
    console.warn('[AudioStorage] Failed to delete track:', err);
  }
}

export async function clearAllLocalTracks(): Promise<void> {
  try {
    const db = await getAudioDB();
    await db.clear(STORE_NAME);
  } catch (err) {
    console.warn('[AudioStorage] Failed to clear tracks:', err);
  }
}
