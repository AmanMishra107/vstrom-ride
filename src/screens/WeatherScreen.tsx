import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { fetchWeather, getWeatherIconUrl, windDirLabel } from '../services/weatherService';
import type { WeatherData } from '../types';
import {
  RefreshCw,
  AlertTriangle,
  Wind,
  Droplets,
  Eye,
  ShieldCheck,
  Compass,
  Thermometer,
  Clock,
  Sparkles,
} from 'lucide-react';

import ModuleHeader from '../components/ModuleHeader';

export default function WeatherScreen() {
  const { state, navigate } = useApp();
  const { lastSample, settings } = state;
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default to Bangalore if GPS has not reported yet
  const lat = lastSample?.lat ?? 12.9716;
  const lng = lastSample?.lng ?? 77.5946;

  const fetchData = async () => {
    if (!settings.weatherEnabled) {
      setError('Weather is disabled in Settings.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchWeather(
        lat,
        lng,
        settings.weatherApiKey,
        settings.weatherProvider ?? 'auto'
      );
      setWeather(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Weather fetch failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [lat, lng, settings.weatherApiKey, settings.weatherProvider]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="scrollable" style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <ModuleHeader
        title="Motorcycle Weather"
        subtitle="Real-time conditions, wind telemetry & road surface advisory"
        fallbackScreen="cockpit"
        rightAction={
          <button className="btn btn-ghost btn-icon" onClick={fetchData} disabled={loading} title="Refresh Weather">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        }
      />

      {error ? (
        <div className="card" style={{ background: '#1a0f0f', border: '1px solid #3d1515', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle size={18} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: 'var(--color-danger)' }}>{error}</div>
        </div>
      ) : loading && !weather ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: 'var(--color-accent)' }} />
          Fetching live meteorological telemetry...
        </div>
      ) : weather ? (
        <>
          {/* Main Weather Card */}
          <div
            className="card card-glow"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              background: 'linear-gradient(145deg, #121927 0%, #111111 100%)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-accent)', fontWeight: 700, textTransform: 'uppercase' }}>
                {weather.provider === 'weatherapi'
                  ? 'WeatherAPI.com Live'
                  : weather.provider === 'openweathermap'
                  ? 'OpenWeatherMap Global'
                  : 'Open-Meteo High-Res Model'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
                {lat.toFixed(3)}°N, {lng.toFixed(3)}°E
              </div>
            </div>

            {/* Big Temperature & Condition */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <img
                src={getWeatherIconUrl(weather.iconCode)}
                alt={weather.condition}
                width={70}
                height={70}
                style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 46, fontWeight: 900, lineHeight: 1 }}>
                  {Math.round(weather.temp)}°<span style={{ fontSize: 24, fontWeight: 400, color: 'var(--color-text-muted)' }}>C</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginTop: 2, textTransform: 'capitalize' }}>
                  {weather.description}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  Feels like {Math.round(weather.feelsLike)}°C • Humidity {weather.humidity}%
                </div>
              </div>
            </div>

            {/* Grid Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 4 }}>
              <div style={{ background: 'var(--color-surface2)', padding: '8px 10px', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-muted)' }}>
                  <Wind size={13} color="var(--color-accent)" /> Wind
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>
                  {weather.windSpeed} <span style={{ fontSize: 10, fontWeight: 500 }}>km/h</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>
                  {windDirLabel(weather.windDeg)} ({weather.windDeg}°)
                </div>
              </div>

              <div style={{ background: 'var(--color-surface2)', padding: '8px 10px', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-muted)' }}>
                  <Compass size={13} color="var(--color-speed)" /> Gusts
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2, color: (weather.windGust ?? 0) > 35 ? 'var(--color-warn)' : 'var(--color-text)' }}>
                  {weather.windGust ?? weather.windSpeed} <span style={{ fontSize: 10, fontWeight: 500 }}>km/h</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>Peak Burst</div>
              </div>

              <div style={{ background: 'var(--color-surface2)', padding: '8px 10px', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-muted)' }}>
                  <Droplets size={13} color="#38bdf8" /> Rain
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>
                  {weather.precipitation ?? 0} <span style={{ fontSize: 10, fontWeight: 500 }}>mm/h</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>Precipitation</div>
              </div>
            </div>
          </div>

          {/* Motorcycle Riding Advisory */}
          {weather.motorcycleAdvisory && (
            <div
              className="card"
              style={{
                borderLeft: `4px solid ${
                  weather.motorcycleAdvisory.level === 'warning'
                    ? 'var(--color-danger)'
                    : weather.motorcycleAdvisory.level === 'caution'
                    ? 'var(--color-warn)'
                    : 'var(--color-success)'
                }`,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 13, color: weather.motorcycleAdvisory.level === 'warning' ? 'var(--color-danger)' : weather.motorcycleAdvisory.level === 'caution' ? 'var(--color-warn)' : 'var(--color-success)' }}>
                <ShieldCheck size={16} /> {weather.motorcycleAdvisory.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                {weather.motorcycleAdvisory.description}
              </div>
            </div>
          )}

          {/* 6-Hour Forecast Timeline */}
          {weather.hourlyForecast && weather.hourlyForecast.length > 0 && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text)' }}>
                <Clock size={15} color="var(--color-accent)" /> Upcoming 6-Hour Ride Forecast
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weather.hourlyForecast.length}, 1fr)`, gap: 6 }}>
                {weather.hourlyForecast.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'var(--color-surface2)',
                      padding: '8px 4px',
                      borderRadius: 8,
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{h.time}</div>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{h.temp}°</div>
                    <div style={{ fontSize: 9, color: h.precipitationProb > 30 ? '#38bdf8' : 'var(--color-text-dim)' }}>
                      {h.precipitationProb > 0 ? `${h.precipitationProb}% 🌧️` : 'Dry'}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--color-text-dim)' }}>
                      {h.windSpeed} km/h
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extra Meteorological Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="metric-tile" style={{ padding: '8px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-dim)' }}>
                <Eye size={13} /> Visibility
              </div>
              <div className="metric-value" style={{ fontSize: 15, marginTop: 2 }}>
                {weather.visibility ?? 10} km
              </div>
            </div>
            <div className="metric-tile" style={{ padding: '8px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-dim)' }}>
                <Thermometer size={13} /> Air Temp
              </div>
              <div className="metric-value" style={{ fontSize: 15, marginTop: 2 }}>
                {weather.temp}°C
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Provider Info & Settings shortcut */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--color-text-dim)', padding: '0 4px' }}>
        <span>Refreshes on location change</span>
        <button
          onClick={() => navigate('settings')}
          style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 11 }}
        >
          Configure Weather API Key →
        </button>
      </div>
    </div>
  );
}
