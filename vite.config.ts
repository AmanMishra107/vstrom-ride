import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';

const useHttps = process.env.VITE_HTTPS === 'true';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(useHttps ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'V-Strom Ride OS',
        short_name: 'RideOS',
        description: 'Premium motorcycle riding dashboard for Suzuki V-Strom',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'fullscreen',
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        categories: ['navigation', 'utilities'],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/maps\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'google-maps', expiration: { maxEntries: 50, maxAgeSeconds: 3600 } },
          },
          {
            urlPattern: /^https:\/\/api\.openweathermap\.org\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'weather-api', expiration: { maxEntries: 10, maxAgeSeconds: 600 } },
          },
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'open-meteo-api', expiration: { maxEntries: 10, maxAgeSeconds: 600 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 8080,
    host: '0.0.0.0', // Listen on all network interfaces
    cors: true,
  },
  preview: {
    port: 4173,
    host: '0.0.0.0', // Listen on all network interfaces for mobile preview
    cors: true,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-maps': ['@googlemaps/js-api-loader'],
          'vendor-leaflet': ['leaflet'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-idb': ['idb'],
        },
      },
    },
  },
});
