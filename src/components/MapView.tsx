/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { useApp } from '../context/AppContext';
import {
  Search,
  Navigation,
  Layers,
  Car,
  X,
  Compass,
  Plus,
  Minus,
  Briefcase,
  Home,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RotateCcw,
  Check,
  Key,
  Utensils,
  Hotel,
  Ticket,
  Landmark,
  Train,
  Pill,
  CreditCard,
  Fuel,
  Wrench,
  Sun,
  CloudSun,
} from 'lucide-react';
import AdventureMapView from './AdventureMapView';
import { formatDistance, formatDurationMs } from '../utils/gpsUtils';
import { generateId } from '../utils/idUtils';
import type { RouteInfo, RouteStep } from '../types';

interface MapViewProps {
  height?: string | number;
  showControls?: boolean;
  isFullScreen?: boolean;
  onMapReady?: (map: google.maps.Map) => void;
  destination?: { lat: number; lng: number; name?: string };
}

// Preset locations matching the user's screenshot
interface PresetLocation {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lng: number;
  type: 'work' | 'home' | 'place';
  badge?: string;
}

const PRESET_LOCATIONS: PresetLocation[] = [
  {
    id: 'work',
    name: 'Work',
    subtitle: 'Bandra Kurla Complex, Mumbai',
    lat: 19.0657,
    lng: 72.8687,
    type: 'work',
    badge: 'Set location',
  },
  {
    id: 'home',
    name: 'Home',
    subtitle: '19.078074, 73.018253',
    lat: 19.078074,
    lng: 73.018253,
    type: 'home',
    badge: 'Edit',
  },
  {
    id: 'google-mumbai',
    name: 'Google Mumbai',
    subtitle: 'Level 7, Plot, C, G Block BKC, Bandra Kurla Complex',
    lat: 19.0645,
    lng: 72.8690,
    type: 'place',
    badge: 'Recently viewed',
  },
  {
    id: 'ghansoli-station',
    name: 'Ghansoli Railway Station (West)',
    subtitle: 'Sector 3, Ghansoli, Navi Mumbai, Maharashtra',
    lat: 19.1245,
    lng: 72.9972,
    type: 'place',
  },
  {
    id: 'gateway-of-india',
    name: 'Gateway Of India Mumbai',
    subtitle: "Gateway of India, BRADY'S FLATS, Apollo Bunder, Colaba",
    lat: 18.9220,
    lng: 72.8347,
    type: 'place',
  },
];

// Category filter pills matching the user's screenshot (+ motorcycle specific)
const CATEGORY_PILLS = [
  { id: 'restaurants', label: 'Restaurants', icon: Utensils, query: 'restaurant' },
  { id: 'fuel', label: 'Petrol / Fuel', icon: Fuel, query: 'petrol pump' },
  { id: 'hotels', label: 'Hotels', icon: Hotel, query: 'hotel' },
  { id: 'things-to-do', label: 'Things to do', icon: Ticket, query: 'tourist attraction' },
  { id: 'service', label: 'Bike Service', icon: Wrench, query: 'motorcycle repair' },
  { id: 'museums', label: 'Museums', icon: Landmark, query: 'museum' },
  { id: 'transit', label: 'Transit', icon: Train, query: 'transit station' },
  { id: 'pharmacies', label: 'Pharmacies', icon: Pill, query: 'pharmacy' },
  { id: 'atms', label: 'ATMs', icon: CreditCard, query: 'atm' },
];

export default function MapView({
  height = '100%',
  showControls = true,
  isFullScreen = true,
  onMapReady,
  destination: propDestination,
}: MapViewProps) {
  const { state, dispatch } = useApp();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const destMarkerRef = useRef<google.maps.Marker | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const poiMarkersRef = useRef<google.maps.Marker[]>([]);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [mapError, setMapError] = useState<string | null>(null);
  // Default to 'hybrid' (satellite imagery + roads) as requested in the user's screenshot!
  const [mapType, setMapType] = useState<'hybrid' | 'roadmap' | 'satellite' | 'terrain'>('hybrid');
  const [following, setFollowing] = useState(true);
  const [trafficEnabled, setTrafficEnabled] = useState(true);
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  // Search & Real-Time Autocomplete state
  interface PlaceSuggestion {
    id: string;
    placeId?: string;
    mainText: string;
    secondaryText: string;
    description: string;
    lat?: number;
    lng?: number;
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ name: string; address: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const debounceTimerRef = useRef<any>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Active Bike Route State
  const [activeRoute, setActiveRoute] = useState<{
    destination: { lat: number; lng: number; name: string };
    distanceKm: number;
    durationMin: number;
    steps: RouteStep[];
  } | null>(null);

  const apiKey = state.settings.googleMapsApiKey?.trim() || '';

  // Mumbai BKC default center coordinate (matches user's screenshot)
  const defaultCenter = useMemo(
    () => ({
      lat: state.lastSample?.lat ?? 19.0657,
      lng: state.lastSample?.lng ?? 72.8687,
    }),
    [state.lastSample]
  );

  // ──────────────────────────────────────────────────────────
  // Calculate BIKE ROUTE (Always Bike / Two-Wheeler path only)
  // ──────────────────────────────────────────────────────────
  const calculateBikeRoute = useCallback(
    (dest: { lat: number; lng: number; name: string }) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const origin = state.lastSample
        ? { lat: state.lastSample.lat, lng: state.lastSample.lng }
        : defaultCenter;

      // Update destination marker
      destMarkerRef.current?.setMap(null);
      destMarkerRef.current = new google.maps.Marker({
        position: dest,
        map,
        title: dest.name,
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 7,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        zIndex: 150,
      });

      const directionsService = new google.maps.DirectionsService();

      const tryDriving = () => {
        try {
          directionsService.route(
            {
              origin,
              destination: { lat: dest.lat, lng: dest.lng },
              travelMode: google.maps.TravelMode.DRIVING,
              avoidTolls: false,
              provideRouteAlternatives: true,
            },
            (dResult, dStatus) => {
              if (dStatus === google.maps.DirectionsStatus.OK && dResult && dResult.routes[0]) {
                applyBikeRouteResult(dResult, dest, origin);
              }
            }
          );
        } catch (err) {
          console.warn('Driving directions error:', err);
        }
      };

      try {
        directionsService.route(
          {
            origin,
            destination: { lat: dest.lat, lng: dest.lng },
            travelMode: google.maps.TravelMode.BICYCLING,
            provideRouteAlternatives: true,
          },
          (bResult, bStatus) => {
            if (bStatus === google.maps.DirectionsStatus.OK && bResult && bResult.routes[0]) {
              applyBikeRouteResult(bResult, dest, origin);
            } else {
              tryDriving();
            }
          }
        );
      } catch {
        tryDriving();
      }
    },
    [state.lastSample, defaultCenter]
  );

  const applyBikeRouteResult = (
    result: google.maps.DirectionsResult,
    dest: { lat: number; lng: number; name: string },
    origin: google.maps.LatLngLiteral
  ) => {
    const map = mapInstanceRef.current;
    if (!map || !result.routes[0]) return;

    polylineRef.current?.setMap(null);

    const leg = result.routes[0].legs[0];
    const distanceM = leg.distance?.value ?? 0;
    const durationS = leg.duration?.value ?? 0;
    const distanceKm = Number((distanceM / 1000).toFixed(1));
    const durationMin = Math.round(durationS / 60);

    // High-visibility glowing bike polyline
    const path = result.routes[0].overview_path;
    polylineRef.current = new google.maps.Polyline({
      path,
      map,
      strokeColor: '#38bdf8', // Vibrant Cyan / Bike Blue
      strokeOpacity: 0.95,
      strokeWeight: 6,
      zIndex: 120,
    });

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(origin);
    bounds.extend(dest);
    map.fitBounds(bounds, 70);

    // Parse turn-by-turn steps
    const steps: RouteStep[] = leg.steps.map((s) => ({
      instruction: s.instructions.replace(/<[^>]+>/g, ''), // Strip HTML
      distanceMetres: s.distance?.value ?? 0,
      durationSeconds: s.duration?.value ?? 0,
      lat: s.end_location.lat(),
      lng: s.end_location.lng(),
    }));

    setActiveRoute({
      destination: dest,
      distanceKm,
      durationMin,
      steps,
    });

    // Also sync to global AppContext navigation
    const routeInfo: RouteInfo = {
      distanceMetres: distanceM,
      durationSeconds: durationS,
      summary: result.routes[0].summary || `Bike Route to ${dest.name}`,
      steps,
      polyline: '',
      warnings: result.routes[0].warnings || [],
      copyrights: result.routes[0].copyrights || '',
    };

    dispatch({
      type: 'SET_NAVIGATION',
      nav: {
        isNavigating: true,
        destination: { lat: dest.lat, lng: dest.lng, name: dest.name },
        route: routeInfo,
        currentStepIndex: 0,
        distanceRemainingM: distanceM,
        etaMs: Date.now() + durationS * 1000,
      },
    });
  };

  // ──────────────────────────────────────────────────────────
  // Initialize Google Maps in Hybrid / Satellite mode
  // ──────────────────────────────────────────────────────────
  const initGoogleMap = useCallback(async () => {
    if (!apiKey) {
      setMapError('no_key');
      return;
    }
    if (!mapRef.current) return;

    try {
      setMapError(null);
      const loader = new Loader({
        apiKey,
        version: 'weekly',
        libraries: ['places', 'geometry'],
      });
      await loader.load();

      const map = new google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 15,
        mapTypeId: mapType,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        backgroundColor: '#0a0a0a',
      });

      mapInstanceRef.current = map;

      // Current location marker with pulse halo
      markerRef.current = new google.maps.Marker({
        position: defaultCenter,
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#38bdf8',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: 'Current Motorcycle Position',
        zIndex: 200,
      });

      // Traffic Layer
      trafficLayerRef.current = new google.maps.TrafficLayer();
      if (trafficEnabled) {
        trafficLayerRef.current.setMap(map);
      }

      dispatch({ type: 'SET_MAPS_LOADED', loaded: true });
      onMapReady?.(map);

      // If prop destination exists, route to it immediately
      if (propDestination) {
        calculateBikeRoute({
          lat: propDestination.lat,
          lng: propDestination.lng,
          name: propDestination.name ?? 'Destination',
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Map load failed';
      console.warn('Google Maps loader failed:', msg);
      setMapError(
        msg.includes('ApiNotActivatedMapError') || msg.includes('InvalidKeyMapError')
          ? 'invalid_key'
          : 'load_error'
      );
    }
  }, [apiKey, defaultCenter, mapType, trafficEnabled, dispatch, onMapReady, propDestination, calculateBikeRoute]);

  // Load Map when apiKey exists
  useEffect(() => {
    if (apiKey) {
      initGoogleMap();
    } else {
      setMapError('no_key');
    }

    return () => {
      markerRef.current?.setMap(null);
      destMarkerRef.current?.setMap(null);
      polylineRef.current?.setMap(null);
      poiMarkersRef.current.forEach((m) => m.setMap(null));
      trafficLayerRef.current?.setMap(null);
    };
  }, [apiKey, initGoogleMap]);

  // Update motorcycle location on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    if (!map || !marker || !state.lastSample) return;

    const pos = { lat: state.lastSample.lat, lng: state.lastSample.lng };
    marker.setPosition(pos);
    if (following) {
      map.panTo(pos);
    }
  }, [state.lastSample, following]);

  // Update map type
  useEffect(() => {
    mapInstanceRef.current?.setMapTypeId(mapType);
  }, [mapType]);

  // Update traffic layer
  useEffect(() => {
    if (!trafficLayerRef.current || !mapInstanceRef.current) return;
    trafficLayerRef.current.setMap(trafficEnabled ? mapInstanceRef.current : null);
  }, [trafficEnabled]);

  // ──────────────────────────────────────────────────────────
  // Real-Time Location-Biased Autocomplete & Search Engine
  // ──────────────────────────────────────────────────────────

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setInputFocused(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const fallbackNominatimSearch = async (query: string, currentPos: { lat: number; lng: number }) => {
    try {
      const viewbox = `${currentPos.lng - 0.5},${currentPos.lat + 0.5},${currentPos.lng + 0.5},${currentPos.lat - 0.5}`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&viewbox=${viewbox}&bounded=0`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped: PlaceSuggestion[] = data.map((item: any) => {
            const parts = (item.display_name || '').split(',');
            return {
              id: String(item.place_id || generateId()),
              mainText: parts[0]?.trim() || item.name || query,
              secondaryText: parts.slice(1, 4).join(',').trim(),
              description: item.display_name,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
            };
          });
          setSuggestions(mapped);
          setShowSuggestions(true);
        }
      }
    } catch {
      // Ignore
    }
  };

  const fallbackGeocodeSearch = useCallback((query: string, currentPos: { lat: number; lng: number }) => {
    try {
      if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
        const geocoder = new google.maps.Geocoder();
        const bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(currentPos.lat - 0.5, currentPos.lng - 0.5),
          new google.maps.LatLng(currentPos.lat + 0.5, currentPos.lng + 0.5)
        );

        geocoder.geocode({ address: query, bounds }, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
            const mapped: PlaceSuggestion[] = results.slice(0, 5).map((r) => {
              const parts = r.formatted_address.split(',');
              return {
                id: r.place_id || generateId(),
                placeId: r.place_id,
                mainText: parts[0]?.trim() || query,
                secondaryText: parts.slice(1).join(',').trim(),
                description: r.formatted_address,
                lat: r.geometry.location.lat(),
                lng: r.geometry.location.lng(),
              };
            });
            setSuggestions(mapped);
            setShowSuggestions(true);
            return;
          }
          fallbackNominatimSearch(query, currentPos);
        });
        return;
      }
    } catch (err) {
      console.warn('Google Geocoder fallback failed:', err);
    }
    fallbackNominatimSearch(query, currentPos);
  }, []);

  const fetchSuggestions = useCallback((query: string) => {
    if (!query || query.trim().length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const currentPos = state.lastSample
      ? { lat: state.lastSample.lat, lng: state.lastSample.lng }
      : defaultCenter;

    try {
      if (typeof google !== 'undefined' && google.maps && google.maps.places) {
        const autocompleteService = new google.maps.places.AutocompleteService();
        const centerLatLng = new google.maps.LatLng(currentPos.lat, currentPos.lng);

        autocompleteService.getPlacePredictions(
          {
            input: query,
            locationBias: new google.maps.Circle({
              center: centerLatLng,
              radius: 40000, // 40 km radius around current motorcycle position!
            }),
            origin: centerLatLng,
          },
          (predictions, status) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              predictions &&
              predictions.length > 0
            ) {
              const mapped: PlaceSuggestion[] = predictions.map((p) => ({
                id: p.place_id,
                placeId: p.place_id,
                mainText: p.structured_formatting?.main_text || p.description,
                secondaryText: p.structured_formatting?.secondary_text || '',
                description: p.description,
              }));
              setSuggestions(mapped);
              setShowSuggestions(true);
              return;
            }
            fallbackGeocodeSearch(query, currentPos);
          }
        );
        return;
      }
    } catch (err) {
      console.warn('Google AutocompleteService failed:', err);
    }

    fallbackGeocodeSearch(query, currentPos);
  }, [state.lastSample, defaultCenter, fallbackGeocodeSearch]);

  // Real-time debounce query listener
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(searchQuery.trim());
    }, 220);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery, fetchSuggestions]);

  const geocodeAndRoute = (query: string) => {
    setIsSearching(true);
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: query }, (results, status) => {
      setIsSearching(false);
      if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
        const loc = results[0].geometry.location;
        calculateBikeRoute({
          lat: loc.lat(),
          lng: loc.lng(),
          name: results[0].formatted_address.split(',')[0] || query,
        });
        setSearchResults([]);
      } else {
        alert('Could not find location. Please try another search term.');
      }
    });
  };

  const handleSelectSuggestion = (suggestion: PlaceSuggestion) => {
    setSearchQuery(suggestion.mainText);
    setShowSuggestions(false);
    setInputFocused(false);

    if (suggestion.lat !== undefined && suggestion.lng !== undefined) {
      calculateBikeRoute({
        lat: suggestion.lat,
        lng: suggestion.lng,
        name: suggestion.mainText,
      });
      return;
    }

    if (suggestion.placeId && mapInstanceRef.current) {
      const placesService = new google.maps.places.PlacesService(mapInstanceRef.current);
      placesService.getDetails(
        { placeId: suggestion.placeId, fields: ['geometry', 'name', 'formatted_address'] },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
            calculateBikeRoute({
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              name: place.name || suggestion.mainText,
            });
            return;
          }
          geocodeAndRoute(suggestion.description || suggestion.mainText);
        }
      );
      return;
    }

    geocodeAndRoute(suggestion.description || suggestion.mainText);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setShowSuggestions(false);
    geocodeAndRoute(searchQuery.trim());
  };

  // Category pill search (Restaurants, Fuel, Hotels, etc.)
  const handleCategoryClick = (category: typeof CATEGORY_PILLS[0]) => {
    setSelectedCategory(category.id);
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous POI markers
    poiMarkersRef.current.forEach((m) => m.setMap(null));
    poiMarkersRef.current = [];

    const center = map.getCenter() || defaultCenter;
    const placesService = new google.maps.places.PlacesService(map);

    placesService.textSearch(
      {
        query: category.query,
        location: center,
        radius: 4000,
      },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const list: Array<{ name: string; address: string; lat: number; lng: number }> = [];

          results.slice(0, 8).forEach((place) => {
            if (place.geometry?.location) {
              const pos = place.geometry.location;
              const marker = new google.maps.Marker({
                position: pos,
                map,
                title: place.name,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 6,
                  fillColor: '#f59e0b',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 1.5,
                },
              });

              marker.addListener('click', () => {
                calculateBikeRoute({
                  lat: pos.lat(),
                  lng: pos.lng(),
                  name: place.name || 'Selected Place',
                });
              });

              poiMarkersRef.current.push(marker);
              list.push({
                name: place.name || 'Place',
                address: place.formatted_address || '',
                lat: pos.lat(),
                lng: pos.lng(),
              });
            }
          });

          setSearchResults(list);
          setIsPanelCollapsed(false);
        }
      }
    );
  };

  // Save new key
  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: {
        ...state.settings,
        googleMapsApiKey: keyInput.trim(),
        updatedAt: Date.now(),
      },
    });
    setShowKeyModal(false);
    setMapError(null);
  };

  // Fallback to AdventureMapView if no key
  if (!apiKey || mapError) {
    return (
      <div style={{ position: 'relative', height, width: '100%' }}>
        <AdventureMapView
          height="100%"
          showControls={showControls}
          destination={propDestination}
          onOpenKeyModal={() => setShowKeyModal(true)}
        />
        {showKeyModal && (
          <KeyModal
            keyInput={keyInput}
            setKeyInput={setKeyInput}
            onSave={handleSaveKey}
            onClose={() => setShowKeyModal(false)}
            currentError={mapError}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height, width: '100%', overflow: 'hidden' }}>
      {/* Google Map Canvas */}
      <div ref={mapRef} style={{ width: '100%', height: '100%', background: '#0a0a0a' }} />

      {/* ──────────────────────────────────────────────────────────
          TOP FLOATING SEARCH BAR & CATEGORY PILLS (Screenshot Match)
         ────────────────────────────────────────────────────────── */}
      {isFullScreen && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 12,
            right: 12,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            pointerEvents: 'none',
          }}
        >
          {/* Top Row: Search Input + Real-Time Autocomplete Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
            <div ref={searchContainerRef} style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
              <form
                onSubmit={handleSearchSubmit}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--color-surface)',
                  borderRadius: 24,
                  padding: '6px 14px',
                  boxShadow: 'var(--neu-shadow-out), 0 4px 16px rgba(0,0,0,0.3)',
                  gap: 8,
                }}
              >
                <Search size={18} color="var(--color-text-muted)" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search Google Maps"
                  value={searchQuery}
                  onFocus={() => {
                    setInputFocused(true);
                    setShowSuggestions(true);
                  }}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-sans)',
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSuggestions([]);
                      setShowSuggestions(false);
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={16} />
                  </button>
                )}
                {/* Direction arrow button (matches blue directional icon in screenshot) */}
                <button
                  type="submit"
                  title="Get Bike Route"
                  style={{
                    background: 'var(--color-accent)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px var(--color-accent-glow)',
                    flexShrink: 0,
                  }}
                >
                  <Navigation size={15} style={{ transform: 'rotate(45deg)' }} />
                </button>
              </form>

              {/* ──────────────────────────────────────────────────────────
                  FLOATING AUTOCOMPLETE SUGGESTIONS DROPDOWN
                 ────────────────────────────────────────────────────────── */}
              {showSuggestions && (
                <div
                  className="fade-in card"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    right: 0,
                    maxHeight: 320,
                    overflowY: 'auto',
                    padding: 0,
                    borderRadius: 16,
                    background: 'var(--color-surface)',
                    boxShadow: 'var(--neu-shadow-out), 0 12px 36px rgba(0,0,0,0.55)',
                    zIndex: 2000,
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {suggestions.length > 0 ? (
                    <>
                      <div
                        style={{
                          padding: '8px 14px',
                          fontSize: 10,
                          fontWeight: 800,
                          color: 'var(--color-text-dim)',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          borderBottom: '1px solid var(--color-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>Suggestions Near You</span>
                        <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>🏍️ Bike Paths</span>
                      </div>
                      {suggestions.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => handleSelectSuggestion(s)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--color-border)',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface2)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: '50%',
                              background: 'var(--color-surface2)',
                              boxShadow: 'var(--neu-shadow-in)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <MapPin size={15} color="var(--color-accent)" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {s.mainText}
                            </div>
                            {s.secondaryText && (
                              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {s.secondaryText}
                              </div>
                            )}
                          </div>
                          <Navigation size={13} color="var(--color-accent)" />
                        </div>
                      ))}
                    </>
                  ) : !searchQuery.trim() ? (
                    <>
                      <div
                        style={{
                          padding: '8px 14px',
                          fontSize: 10,
                          fontWeight: 800,
                          color: 'var(--color-text-dim)',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          borderBottom: '1px solid var(--color-border)',
                        }}
                      >
                        Popular & Recent Destinations
                      </div>
                      {PRESET_LOCATIONS.map((loc) => (
                        <div
                          key={loc.id}
                          onClick={() => {
                            setSearchQuery(loc.name);
                            setShowSuggestions(false);
                            setInputFocused(false);
                            calculateBikeRoute({
                              lat: loc.lat,
                              lng: loc.lng,
                              name: loc.name,
                            });
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--color-border)',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface2)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: '50%',
                              background: 'var(--color-surface2)',
                              boxShadow: 'var(--neu-shadow-in)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {loc.type === 'home' ? (
                              <Home size={14} color="#22c55e" />
                            ) : loc.type === 'work' ? (
                              <Briefcase size={14} color="var(--color-accent)" />
                            ) : (
                              <Clock size={14} color="var(--color-text-dim)" />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                              {loc.name}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {loc.subtitle}
                            </div>
                          </div>
                          <Navigation size={13} color="var(--color-accent)" />
                        </div>
                      ))}
                    </>
                  ) : (
                    <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>
                      Searching locations near you…
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Horizontally Scrollable Category Filter Pills (matching screenshot) */}
          <div
            className="scrollable"
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4,
              pointerEvents: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            {CATEGORY_PILLS.map((p) => {
              const Icon = p.icon;
              const isActive = selectedCategory === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleCategoryClick(p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: isActive ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: isActive ? '#ffffff' : 'var(--color-text)',
                    border: 'none',
                    borderRadius: 20,
                    padding: '7px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? '0 4px 12px var(--color-accent-glow)' : 'var(--neu-shadow-btn)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <Icon size={14} color={isActive ? '#ffffff' : 'var(--color-accent)'} />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          LEFT FLOATING CARD / DRAWER (Screenshot Match)
         ────────────────────────────────────────────────────────── */}
      {isFullScreen && (
        <div
          style={{
            position: 'absolute',
            top: 110,
            left: 12,
            width: 380,
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: 'calc(100% - 170px)',
            zIndex: 90,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            pointerEvents: 'auto',
          }}
        >
          {/* Main Card with Places & Bike Routing */}
          <div
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
              boxShadow: 'var(--neu-shadow-out), 0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            {/* Header / Collapse bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-surface2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>
                  {searchResults.length > 0 ? 'Search Results' : 'Recent & Saved'}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: 'var(--color-accent)',
                    background: 'rgba(59, 130, 246, 0.15)',
                    padding: '2px 6px',
                    borderRadius: 6,
                    textTransform: 'uppercase',
                  }}
                >
                  🏍️ Bike Routing
                </span>
              </div>
              <button
                onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                {isPanelCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>
            </div>

            {!isPanelCollapsed && (
              <div className="scrollable" style={{ maxHeight: 280, overflowY: 'auto' }}>
                {/* Search Results list if active */}
                {searchResults.length > 0
                  ? searchResults.map((r, i) => (
                      <div
                        key={i}
                        onClick={() =>
                          calculateBikeRoute({
                            lat: r.lat,
                            lng: r.lng,
                            name: r.name,
                          })
                        }
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--color-border)',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface2)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: 'var(--color-surface2)',
                            boxShadow: 'var(--neu-shadow-in)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <MapPin size={16} color="var(--color-accent)" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.address}
                          </div>
                        </div>
                        <Navigation size={14} color="var(--color-accent)" />
                      </div>
                    ))
                  : /* Preset Destinations (Home, Work, Google Mumbai, Ghansoli, Gateway of India) */
                    PRESET_LOCATIONS.map((loc) => (
                      <div
                        key={loc.id}
                        onClick={() =>
                          calculateBikeRoute({
                            lat: loc.lat,
                            lng: loc.lng,
                            name: loc.name,
                          })
                        }
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--color-border)',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface2)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Icon */}
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: 'var(--color-surface2)',
                            boxShadow: 'var(--neu-shadow-in)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {loc.type === 'work' ? (
                            <Briefcase size={15} color="var(--color-accent)" />
                          ) : loc.type === 'home' ? (
                            <Home size={15} color="#22c55e" />
                          ) : (
                            <Clock size={15} color="var(--color-text-dim)" />
                          )}
                        </div>

                        {/* Name & Subtitle */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                              {loc.name}
                            </span>
                            {loc.badge && (
                              <span style={{ fontSize: 10, color: 'var(--color-accent)', fontWeight: 600 }}>
                                {loc.badge}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {loc.subtitle}
                          </div>
                        </div>
                      </div>
                    ))}
              </div>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────
              Area Traffic & Weather Snapshot Card (Screenshot Match)
             ────────────────────────────────────────────────────────── */}
          <div
            className="card"
            style={{
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: 'var(--neu-shadow-out), 0 4px 16px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>
                Bandra Kurla Complex
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 800, color: 'var(--color-warn)' }}>
                <span>33°</span>
                <Sun size={15} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Car size={14} color="var(--color-danger)" />
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.3 }}>
                <div style={{ fontWeight: 700, color: 'var(--color-danger)' }}>Heavy traffic in this area</div>
                <div style={{ color: 'var(--color-text-muted)' }}>Typical conditions with delays up to 8 min</div>
              </div>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────
              Active Bike Route HUD (when a route is chosen)
             ────────────────────────────────────────────────────────── */}
          {activeRoute && (
            <div
              className="fade-in card"
              style={{
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-accent)',
                boxShadow: 'var(--neu-shadow-out), 0 0 16px var(--color-accent-glow)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase' }}>
                  🏍️ Two-Wheeler Path Active
                </span>
                <button
                  onClick={() => {
                    setActiveRoute(null);
                    polylineRef.current?.setMap(null);
                    destMarkerRef.current?.setMap(null);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                >
                  <X size={15} />
                </button>
              </div>

              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>
                {activeRoute.destination.name}
              </div>

              <div style={{ display: 'flex', gap: 14, fontSize: 13, alignItems: 'center' }}>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Distance: </span>
                  <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>
                    {activeRoute.distanceKm} km
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Bike Time: </span>
                  <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>
                    {activeRoute.durationMin} mins
                  </strong>
                </div>
              </div>

              {activeRoute.steps[0] && (
                <div
                  style={{
                    background: 'var(--color-surface2)',
                    padding: '8px 10px',
                    borderRadius: 8,
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--color-text)',
                  }}
                >
                  <Navigation size={13} color="var(--color-accent)" />
                  <span style={{ flex: 1 }}>{activeRoute.steps[0].instruction}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          BOTTOM-LEFT FLOATING LAYERS BUTTON (Screenshot Match)
         ────────────────────────────────────────────────────────── */}
      {showControls && (
        <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 100 }}>
          <button
            onClick={() => setShowLayersMenu(!showLayersMenu)}
            title="Map Layers"
            style={{
              width: 58,
              height: 58,
              borderRadius: 14,
              border: '2px solid rgba(255, 255, 255, 0.4)',
              background: 'url(https://maps.gstatic.com/tactile/layerswitcher/satellite_1x.png) center/cover no-repeat, #1e293b',
              boxShadow: 'var(--neu-shadow-btn), 0 4px 14px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: 4,
              cursor: 'pointer',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.75)',
                color: '#ffffff',
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 4,
                width: '100%',
                textAlign: 'center',
              }}
            >
              Layers
            </div>
          </button>

          {/* Layers Popover Menu */}
          {showLayersMenu && (
            <div
              className="card fade-in"
              style={{
                position: 'absolute',
                bottom: 68,
                left: 0,
                width: 210,
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
                Map Type
              </div>

              {[
                { id: 'hybrid', label: 'Satellite / Hybrid (Active)' },
                { id: 'roadmap', label: 'Default Roadmap' },
                { id: 'terrain', label: 'Terrain' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setMapType(t.id as any);
                    setShowLayersMenu(false);
                  }}
                  className="btn"
                  style={{
                    justifyContent: 'flex-start',
                    padding: '8px 10px',
                    minHeight: 36,
                    fontSize: 12,
                    background: mapType === t.id ? 'var(--color-surface2)' : 'transparent',
                    color: mapType === t.id ? 'var(--color-accent)' : 'var(--color-text)',
                    boxShadow: mapType === t.id ? 'var(--neu-shadow-in)' : 'none',
                  }}
                >
                  {t.label}
                </button>
              ))}

              <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />

              {/* Traffic Layer Toggle */}
              <button
                onClick={() => setTrafficEnabled(!trafficEnabled)}
                className="btn"
                style={{
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  minHeight: 36,
                  fontSize: 12,
                  background: trafficEnabled ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                  color: trafficEnabled ? 'var(--color-success)' : 'var(--color-text)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Car size={14} /> Live Traffic
                </span>
                <span style={{ fontSize: 10, fontWeight: 700 }}>{trafficEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          BOTTOM-RIGHT MAP CONTROLS (Zoom & Re-Center)
         ────────────────────────────────────────────────────────── */}
      {showControls && (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            right: 16,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* Re-center on Motorcycle GPS */}
          <button
            className="btn btn-icon"
            onClick={() => {
              setFollowing(true);
              if (mapInstanceRef.current) {
                const target = state.lastSample
                  ? { lat: state.lastSample.lat, lng: state.lastSample.lng }
                  : defaultCenter;
                mapInstanceRef.current.panTo(target);
                mapInstanceRef.current.setZoom(16);
              }
            }}
            title="Re-centre GPS on Motorcycle"
            style={{
              background: 'var(--color-surface)',
              boxShadow: 'var(--neu-shadow-btn)',
              color: following ? 'var(--color-accent)' : 'var(--color-text)',
            }}
          >
            <Navigation size={18} />
          </button>

          {/* Zoom In */}
          <button
            className="btn btn-icon"
            onClick={() => {
              const map = mapInstanceRef.current;
              if (map) map.setZoom((map.getZoom() || 15) + 1);
            }}
            title="Zoom In"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--neu-shadow-btn)' }}
          >
            <Plus size={18} />
          </button>

          {/* Zoom Out */}
          <button
            className="btn btn-icon"
            onClick={() => {
              const map = mapInstanceRef.current;
              if (map) map.setZoom((map.getZoom() || 15) - 1);
            }}
            title="Zoom Out"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--neu-shadow-btn)' }}
          >
            <Minus size={18} />
          </button>
        </div>
      )}

      {showKeyModal && (
        <KeyModal
          keyInput={keyInput}
          setKeyInput={setKeyInput}
          onSave={handleSaveKey}
          onClose={() => setShowKeyModal(false)}
          currentError={mapError}
        />
      )}
    </div>
  );
}

function KeyModal({
  keyInput,
  setKeyInput,
  onSave,
  onClose,
  currentError,
}: {
  keyInput: string;
  setKeyInput: (s: string) => void;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
  currentError: string | null;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 16,
          boxShadow: '0 12px 36px rgba(0,0,0,0.8)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Key size={16} color="var(--color-accent)" /> Configure Google Maps API
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
          Paste your Google Maps Platform API key below to activate Google vector maps, traffic layer, and Places search.
        </div>

        {currentError && (
          <div style={{ fontSize: 11, color: 'var(--color-warn)', background: 'rgba(249, 115, 22, 0.1)', padding: 8, borderRadius: 6 }}>
            Note: If you don't have a Google Cloud billing account, V-Strom Ride OS automatically runs the OpenStreetMap Adventure Engine.
          </div>
        )}

        <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="text"
            className="input"
            placeholder="AIzaSy..."
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              <Check size={14} /> Save & Activate
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
