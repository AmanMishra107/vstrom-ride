-- ============================================================
-- V-Strom Ride OS — Supabase Schema & Row-Level Security (RLS)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  motorcycle_make text default 'Suzuki',
  motorcycle_model text default 'V-Strom SX 250',
  fuel_tank_capacity numeric default 12.0,
  expected_mileage numeric default 35.0,
  speed_unit text default 'kph',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 2. Rides Table
create table if not exists public.rides (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  start_time bigint not null,
  end_time bigint not null,
  distance_metres numeric not null,
  total_duration_ms bigint not null,
  moving_duration_ms bigint not null,
  avg_moving_speed_kph numeric not null,
  max_speed_kph numeric not null,
  start_lat numeric,
  start_lng numeric,
  end_lat numeric,
  end_lng numeric,
  route_coordinates jsonb,
  destination_name text,
  notes text,
  estimated_fuel_used_l numeric,
  estimated_fuel_cost numeric,
  synced boolean default true,
  created_at timestamptz default now()
);

alter table public.rides enable row level security;

create policy "Users can select own rides"
  on public.rides for select
  using (auth.uid() = user_id);

create policy "Users can insert own rides"
  on public.rides for insert
  with check (auth.uid() = user_id);

create policy "Users can update own rides"
  on public.rides for update
  using (auth.uid() = user_id);

create policy "Users can delete own rides"
  on public.rides for delete
  using (auth.uid() = user_id);

-- 3. Fuel Entries Table
create table if not exists public.fuel_entries (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  date bigint not null,
  odometer_reading numeric not null,
  odometer_unit text not null default 'km',
  litres_filled numeric not null,
  price_per_litre numeric not null,
  total_cost numeric not null,
  is_full boolean default true,
  is_partial boolean default false,
  fuel_station text,
  notes text,
  calculated_km_per_l numeric,
  calculated_distance_km numeric,
  created_at timestamptz default now()
);

alter table public.fuel_entries enable row level security;

create policy "Users can select own fuel entries"
  on public.fuel_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own fuel entries"
  on public.fuel_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own fuel entries"
  on public.fuel_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own fuel entries"
  on public.fuel_entries for delete
  using (auth.uid() = user_id);

-- 4. Saved Places Table
create table if not exists public.saved_places (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  address text,
  lat numeric not null,
  lng numeric not null,
  category text not null default 'custom',
  place_id text,
  notes text,
  visit_count integer default 0,
  created_at timestamptz default now()
);

alter table public.saved_places enable row level security;

create policy "Users can select own places"
  on public.saved_places for select
  using (auth.uid() = user_id);

create policy "Users can insert own places"
  on public.saved_places for insert
  with check (auth.uid() = user_id);

create policy "Users can update own places"
  on public.saved_places for update
  using (auth.uid() = user_id);

create policy "Users can delete own places"
  on public.saved_places for delete
  using (auth.uid() = user_id);
