// ============================================================
// IndexedDB persistence layer using the `idb` library
// ============================================================

import { openDB, type IDBPDatabase } from 'idb';
import type { GpsSample, SavedRide, FuelEntry, SavedPlace, SavedRoute, ActiveTrip } from '../types';

const DB_NAME = 'vstrom-ride-os';
const DB_VERSION = 1;

export interface RideOsDB {
  gps_samples: {
    key: number;
    value: GpsSample;
    indexes: { by_trip: string; by_time: number };
  };
  saved_rides: {
    key: string;
    value: SavedRide;
    indexes: { by_start: number };
  };
  fuel_entries: {
    key: string;
    value: FuelEntry;
    indexes: { by_date: number };
  };
  saved_places: {
    key: string;
    value: SavedPlace;
  };
  saved_routes: {
    key: string;
    value: SavedRoute;
  };
  active_trip: {
    key: string;
    value: ActiveTrip;
  };
}

let dbPromise: Promise<IDBPDatabase<RideOsDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<RideOsDB>> {
  if (!dbPromise) {
    dbPromise = openDB<RideOsDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // GPS samples
        if (!db.objectStoreNames.contains('gps_samples')) {
          const ss = db.createObjectStore('gps_samples', {
            keyPath: 'id',
            autoIncrement: true,
          });
          ss.createIndex('by_trip', 'tripId');
          ss.createIndex('by_time', 'timestamp');
        }
        // Saved rides
        if (!db.objectStoreNames.contains('saved_rides')) {
          const rs = db.createObjectStore('saved_rides', { keyPath: 'id' });
          rs.createIndex('by_start', 'startTime');
        }
        // Fuel entries
        if (!db.objectStoreNames.contains('fuel_entries')) {
          const fs = db.createObjectStore('fuel_entries', { keyPath: 'id' });
          fs.createIndex('by_date', 'date');
        }
        // Saved places
        if (!db.objectStoreNames.contains('saved_places')) {
          db.createObjectStore('saved_places', { keyPath: 'id' });
        }
        // Saved routes
        if (!db.objectStoreNames.contains('saved_routes')) {
          db.createObjectStore('saved_routes', { keyPath: 'id' });
        }
        // Active trip state (single record, key = 'current')
        if (!db.objectStoreNames.contains('active_trip')) {
          db.createObjectStore('active_trip', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// ---- GPS Samples ----
export async function saveGpsSample(sample: GpsSample): Promise<void> {
  const db = await getDB();
  await db.put('gps_samples', sample);
}

export async function getTripSamples(tripId: string): Promise<GpsSample[]> {
  const db = await getDB();
  return db.getAllFromIndex('gps_samples', 'by_trip', tripId);
}

export async function deleteGpsSamples(tripId: string): Promise<void> {
  const db = await getDB();
  const keys = await db.getAllKeysFromIndex('gps_samples', 'by_trip', tripId);
  const tx = db.transaction('gps_samples', 'readwrite');
  await Promise.all(keys.map((k) => tx.store.delete(k)));
  await tx.done;
}

// ---- Saved Rides ----
export async function saveRide(ride: SavedRide): Promise<void> {
  const db = await getDB();
  await db.put('saved_rides', ride);
}

export async function getAllRides(): Promise<SavedRide[]> {
  const db = await getDB();
  const rides = await db.getAllFromIndex('saved_rides', 'by_start');
  return rides.reverse();
}

export async function deleteRide(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('saved_rides', id);
}

// ---- Fuel Entries ----
export async function saveFuelEntry(entry: FuelEntry): Promise<void> {
  const db = await getDB();
  await db.put('fuel_entries', entry);
}

export async function getAllFuelEntries(): Promise<FuelEntry[]> {
  const db = await getDB();
  const entries = await db.getAllFromIndex('fuel_entries', 'by_date');
  return entries.reverse();
}

export async function deleteFuelEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('fuel_entries', id);
}

// ---- Saved Places ----
export async function savePlace(place: SavedPlace): Promise<void> {
  const db = await getDB();
  await db.put('saved_places', place);
}

export async function getAllPlaces(): Promise<SavedPlace[]> {
  const db = await getDB();
  return db.getAll('saved_places');
}

export async function deletePlace(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('saved_places', id);
}

// ---- Saved Routes ----
export async function saveRoute(route: SavedRoute): Promise<void> {
  const db = await getDB();
  await db.put('saved_routes', route);
}

export async function getAllRoutes(): Promise<SavedRoute[]> {
  const db = await getDB();
  return db.getAll('saved_routes');
}

export async function deleteRoute(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('saved_routes', id);
}

// ---- Active Trip ----
export async function persistActiveTrip(trip: ActiveTrip): Promise<void> {
  const db = await getDB();
  await db.put('active_trip', { ...trip, id: 'current' });
}

export async function loadActiveTrip(): Promise<ActiveTrip | undefined> {
  const db = await getDB();
  return db.get('active_trip', 'current') as Promise<ActiveTrip | undefined>;
}

export async function clearActiveTrip(): Promise<void> {
  const db = await getDB();
  await db.delete('active_trip', 'current');
}
