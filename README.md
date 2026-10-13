# V-Strom Ride OS — Premium Motorcycle Riding Dashboard

> **Production-grade mobile cockpit designed for smartphone handlebar mounts on the Suzuki V-Strom SX 250 (and configurable for any motorcycle).**

![V-Strom Ride OS](public/icons/icon-192.png)

---

## 1. Product Overview

**V-Strom Ride OS** transforms a smartphone into a dedicated motorcycle instrumentation console. Built for high glanceability in bright outdoor sunlight and night riding conditions, it provides real-time GPS telemetry, Google Maps navigation, trip analytics, mathematical fuel tracking, compass heading, live weather alerts, and emergency roadside assistance.

### Key Capabilities
- **TFT Motorsport Cockpit**: High-contrast AMOLED-friendly dark palette, dynamic SVG circular speedometer with overspeed alert needle, average speed, and maximum speed.
- **Dual Responsive Layout**: Intentionally crafted **Portrait** and **Landscape** modes that adapt instantly when rotating the handlebar phone mount without dropping active GPS tracking.
- **Strictly Real GPS Telemetry**: Zero fabricated data. Uses `navigator.geolocation.watchPosition` with high accuracy, Haversine displacement accumulation, jump plausibility verification, and stale reading detection.
- **Interactive Google Maps**: Real Google Maps JavaScript API integration with satellite/terrain toggle, user follow mode, destination markers, directions polyline, and deep linking to the native Google Maps app for voice-guided navigation.
- **Route Planner (Screen 13)**: Destination search with motorcycle waypoint chips, highway/toll avoidance filters, turn-by-turn cue sheets, route saving, and ETA calculations.
- **Suzuki V-Strom SX 250 Vehicle Profile (Screen 15)**: Factory engine specifications (249cc SOHC oil-cooled SOCS, 26.5 PS, 22.2 Nm), 12 L tank capacity calibration, and interactive pre-ride maintenance checklist (tyre pressures: 22 PSI front, 29/33 PSI rear; oil & chain intervals).
- **Mathematical Fuel Management**: Strict full-tank-to-full-tank interval calculations (`km/L = distance ÷ litres`), aggregate long-term fuel economy, expense tracking, and clearly distinguished GPS-based range estimates.
- **Offline-First IndexedDB Architecture**: All rides, fuel logs, and saved waypoints persist locally in the device's IndexedDB. Never loses a trip on page refresh or tunnel network dropouts.
- **Optional Supabase Cloud Backup (Screen 18)**: PostgreSQL storage with Row-Level Security (RLS) policies.
- **PWA Handlebar Mount Experience**: Installable Progressive Web App with Screen Wake Lock API to prevent the screen from dimming while riding.

---

## 2. Technology Stack

- **Framework**: React 19, TypeScript 5.8, Vite 6
- **Styling**: Tailwind CSS v4, Motorsport AMOLED Design Tokens (`#0a0a0a` background, electric blue `#3b82f6`, warning orange `#f97316`)
- **Icons**: Lucide React
- **Mapping**: `@googlemaps/js-api-loader` (Google Maps JS API, Places Library, Directions Service)
- **Local Database**: `idb` (IndexedDB transactional storage)
- **Cloud Database (Optional)**: `@supabase/supabase-js`
- **PWA**: `vite-plugin-pwa` with Workbox offline service worker & Screen Wake Lock API
- **Testing**: Vitest with jsdom

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

| Variable | Description | Required? |
| :--- | :--- | :--- |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps Platform API key (Maps JS, Directions, Places) | Optional (app runs in preview mode with setup instructions if missing) |
| `VITE_WEATHER_API_KEY` | OpenWeatherMap API key (Current weather, wind speed, gusts) | Optional |
| `VITE_SUPABASE_URL` | Supabase Project URL (`https://xyz.supabase.co`) | Optional (Offline IndexedDB is always primary) |
| `VITE_SUPABASE_ANON_KEY` | Supabase Public Anon Key | Optional |

---

## 4. Google Maps Platform Setup & Security

To configure Google Maps for production:

1. Visit [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project named `V-Strom Ride OS`.
3. Enable the following APIs in **APIs & Services**:
   - **Maps JavaScript API**
   - **Directions API**
   - **Places API (New)**
4. Generate a browser API key and apply **Application Restrictions**:
   - Set **HTTP Referrers (web sites)** to your production domain (e.g. `https://ride-os.yourdomain.com/*`) and local dev (`http://localhost:*`, `http://127.0.0.1:*`).
5. Apply **API Restrictions**: Limit the key strictly to Maps JavaScript API, Directions API, and Places API.
6. Set budget alerts to prevent unexpected billing.

---

## 5. Supabase Setup & Database Migration

If you wish to enable cloud synchronization:

1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in the Supabase Dashboard.
3. Execute the migration file located at:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
   This creates the `profiles`, `rides`, `fuel_entries`, and `saved_places` tables with PostgreSQL **Row-Level Security (RLS)** policies enabled so each user can only read and write their own data.
4. Copy your project URL and anon public key into your `.env` file.

---

## 6. Motorcycle Handlebar Mount Guidelines

For the best and safest riding experience:

1. **Mount Selection**: Use an anti-vibration smartphone mount (e.g., Quad Lock with Vibration Dampener, Peak Design Moto Mount, or RAM Mount) to protect optical image stabilization (OIS) sensors from single-cylinder motorcycle engine vibrations.
2. **Power Supply**: Connect your smartphone to the Suzuki V-Strom SX 250's factory USB charging port (located to the left of the instrument cluster) using an IP-rated weatherproof cable.
3. **Screen Orientation**:
   - **Portrait**: Ideal for tight adventure handlebars and keeping the speedometer front-and-center.
   - **Landscape**: Reorganizes into a dual-cockpit with the map filling the center and the circular speedometer on the left.
4. **Safety & Glove Operation**:
   - Pre-plan your route and start trip tracking before rolling off.
   - All critical actions are large touch targets (≥ 48px).
   - Never type or interact with detailed forms while the motorcycle is in motion.

---

## 7. Installation & PWA Deployment

### Local Development
```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Run automated Vitest test suite
npm test

# Check linting
npm run lint

# Compile production bundle
npm run build
```

### Mobile Phone Local Network Access (Wi-Fi)
To run and view the cockpit directly on your motorcycle handlebar mount phone:

1. Ensure your smartphone is connected to the same Wi-Fi network as your computer.
2. The server is configured with full HTTPS and bound to `0.0.0.0`:
   ```bash
   # Production HTTPS Preview (Port 4173)
   npm run preview

   # Development HTTPS Server with HMR (Port 5173)
   npm run dev
   ```
3. Open the URL in your mobile phone browser:
   ```
   https://192.168.29.122:4173/
   ```
4. **Certificate Notice**: Because a self-signed certificate is used for local development, your mobile browser will show an initial warning. Tap **Advanced** → **Proceed to 192.168.29.122 (unsafe)**.
5. **GPS Hardware Access**: Because HTTPS is active, mobile Chrome and Safari will prompt for **Location Permission** — tap **Allow** to enable real-time GPS speedometer and tracking!
6. **Install PWA**:
   - **Android Chrome**: Menu `⋮` → **Add to Home screen** / **Install app**.
   - **iOS Safari**: Share `⎋` → **Add to Home Screen**.

```bash
# Print Terminal QR Code for instant phone camera scanning:
npm run mobile
```

---

## 8. Safety & Compliance Disclaimer

> **IMPORTANT**: V-Strom Ride OS is a supplementary riding companion and navigation aid. It is **NOT** a certified motorcycle instrument cluster and does **NOT** replace the motorcycle's factory speedometer, odometer, or warning lights. Always observe local road laws and keep your eyes focused on the road ahead.
