// ============================================================
// Supabase Client & Cloud Synchronization Service
// ============================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SavedRide, FuelEntry, SavedPlace } from '../types';
import { getAllRides, getAllFuelEntries, getAllPlaces, saveRide, saveFuelEntry, savePlace } from './storage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export interface SyncResult {
  success: boolean;
  syncedRides: number;
  syncedFuelEntries: number;
  syncedPlaces: number;
  error?: string;
}

export async function syncLocalDataToCloud(): Promise<SyncResult> {
  if (!supabase) {
    return {
      success: false,
      syncedRides: 0,
      syncedFuelEntries: 0,
      syncedPlaces: 0,
      error: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
    };
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return {
      success: false,
      syncedRides: 0,
      syncedFuelEntries: 0,
      syncedPlaces: 0,
      error: 'You must be signed in to sync data with the cloud.',
    };
  }

  try {
    const localRides = await getAllRides();
    const localFuel = await getAllFuelEntries();
    const localPlaces = await getAllPlaces();

    // 1. Sync Rides
    if (localRides.length > 0) {
      const rideRows = localRides.map((r) => ({
        id: r.id,
        user_id: user.id,
        start_time: r.startTime,
        end_time: r.endTime,
        distance_metres: r.distance,
        total_duration_ms: r.totalDurationMs,
        moving_duration_ms: r.movingDurationMs,
        avg_moving_speed_kph: r.avgMovingSpeedKph,
        max_speed_kph: r.maxSpeedKph,
        start_lat: r.startLat,
        start_lng: r.startLng,
        end_lat: r.endLat,
        end_lng: r.endLng,
        route_coordinates: r.routeCoordinates,
        destination_name: r.destinationName,
        notes: r.notes,
        estimated_fuel_used_l: r.estimatedFuelUsedL,
        estimated_fuel_cost: r.estimatedFuelCost,
        synced: true,
      }));

      const { error: rideErr } = await supabase
        .from('rides')
        .upsert(rideRows, { onConflict: 'id' });
      if (rideErr) throw new Error(`Rides sync failed: ${rideErr.message}`);
    }

    // 2. Sync Fuel Entries
    if (localFuel.length > 0) {
      const fuelRows = localFuel.map((f) => ({
        id: f.id,
        user_id: user.id,
        date: f.date,
        odometer_reading: f.odometerReading,
        odometer_unit: f.odometerUnit,
        litres_filled: f.litresFilled,
        price_per_litre: f.pricePerLitre,
        total_cost: f.totalCost,
        is_full: f.isFull,
        is_partial: f.isPartial,
        fuel_station: f.fuelStation,
        notes: f.notes,
        calculated_km_per_l: f.calculatedKmPerL,
        calculated_distance_km: f.calculatedDistanceKm,
      }));

      const { error: fuelErr } = await supabase
        .from('fuel_entries')
        .upsert(fuelRows, { onConflict: 'id' });
      if (fuelErr) throw new Error(`Fuel sync failed: ${fuelErr.message}`);
    }

    // 3. Sync Places
    if (localPlaces.length > 0) {
      const placeRows = localPlaces.map((p) => ({
        id: p.id,
        user_id: user.id,
        name: p.name,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        category: p.category,
        place_id: p.placeId,
        notes: p.notes,
        visit_count: p.visitCount,
      }));

      const { error: placeErr } = await supabase
        .from('saved_places')
        .upsert(placeRows, { onConflict: 'id' });
      if (placeErr) throw new Error(`Places sync failed: ${placeErr.message}`);
    }

    return {
      success: true,
      syncedRides: localRides.length,
      syncedFuelEntries: localFuel.length,
      syncedPlaces: localPlaces.length,
    };
  } catch (err) {
    return {
      success: false,
      syncedRides: 0,
      syncedFuelEntries: 0,
      syncedPlaces: 0,
      error: err instanceof Error ? err.message : 'Unknown sync failure',
    };
  }
}

export async function pullCloudDataToLocal(): Promise<{ pulledRides: number; pulledFuel: number; pulledPlaces: number; error?: string }> {
  if (!supabase) {
    return { pulledRides: 0, pulledFuel: 0, pulledPlaces: 0, error: 'Supabase is not configured' };
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { pulledRides: 0, pulledFuel: 0, pulledPlaces: 0, error: 'User not signed in' };
  }

  try {
    let pulledRides = 0;
    let pulledFuel = 0;
    let pulledPlaces = 0;

    const { data: cloudRides } = await supabase.from('rides').select('*').eq('user_id', user.id);
    if (cloudRides) {
      for (const r of cloudRides) {
        const ride: SavedRide = {
          id: r.id,
          startTime: r.start_time,
          endTime: r.end_time,
          distance: r.distance_metres,
          totalDurationMs: r.total_duration_ms,
          movingDurationMs: r.moving_duration_ms,
          avgMovingSpeedKph: r.avg_moving_speed_kph,
          maxSpeedKph: r.max_speed_kph,
          startLat: r.start_lat,
          startLng: r.start_lng,
          endLat: r.end_lat,
          endLng: r.end_lng,
          routeCoordinates: r.route_coordinates,
          destinationName: r.destination_name,
          notes: r.notes,
          estimatedFuelUsedL: r.estimated_fuel_used_l,
          estimatedFuelCost: r.estimated_fuel_cost,
          synced: true,
        };
        await saveRide(ride);
        pulledRides++;
      }
    }

    const { data: cloudFuel } = await supabase.from('fuel_entries').select('*').eq('user_id', user.id);
    if (cloudFuel) {
      for (const f of cloudFuel) {
        const entry: FuelEntry = {
          id: f.id,
          date: f.date,
          odometerReading: f.odometer_reading,
          odometerUnit: f.odometer_unit,
          litresFilled: f.litres_filled,
          pricePerLitre: f.price_per_litre,
          totalCost: f.total_cost,
          isFull: f.is_full,
          isPartial: f.is_partial,
          fuelStation: f.fuel_station,
          notes: f.notes,
          calculatedKmPerL: f.calculated_km_per_l,
          calculatedDistanceKm: f.calculated_distance_km,
          createdAt: f.created_at ? new Date(f.created_at).getTime() : Date.now(),
        };
        await saveFuelEntry(entry);
        pulledFuel++;
      }
    }

    const { data: cloudPlaces } = await supabase.from('saved_places').select('*').eq('user_id', user.id);
    if (cloudPlaces) {
      for (const p of cloudPlaces) {
        const place: SavedPlace = {
          id: p.id,
          name: p.name,
          address: p.address,
          lat: p.lat,
          lng: p.lng,
          category: p.category,
          placeId: p.place_id,
          notes: p.notes,
          visitCount: p.visit_count ?? 0,
          createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
        };
        await savePlace(place);
        pulledPlaces++;
      }
    }

    return { pulledRides, pulledFuel, pulledPlaces };
  } catch (err) {
    return { pulledRides: 0, pulledFuel: 0, pulledPlaces: 0, error: err instanceof Error ? err.message : 'Pull failed' };
  }
}
