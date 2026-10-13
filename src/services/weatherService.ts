// ============================================================
// Weather Service — Dual-Engine (Open-Meteo & OpenWeatherMap)
// ============================================================

import type { WeatherData, HourlyWeather } from '../types';

const WEATHERAPI_BASE = 'https://api.weatherapi.com/v1';
const OWM_BASE = 'https://api.openweathermap.org/data/2.5';
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

let cachedWeather: WeatherData | null = null;

export async function fetchWeather(
  lat: number,
  lng: number,
  apiKey?: string,
  preferredProvider: 'auto' | 'open-meteo' | 'openweathermap' | 'weatherapi' = 'auto'
): Promise<WeatherData> {
  // Check cache
  if (
    cachedWeather &&
    Math.abs(cachedWeather.lat - lat) < 0.01 &&
    Math.abs(cachedWeather.lng - lng) < 0.01 &&
    Date.now() - cachedWeather.fetchedAt < CACHE_TTL_MS
  ) {
    return cachedWeather;
  }

  const cleanKey = apiKey?.trim();

  // If user has an API key or requests weatherapi/openweathermap:
  if (cleanKey && cleanKey.length > 0) {
    if (preferredProvider === 'weatherapi' || preferredProvider === 'auto') {
      try {
        const data = await fetchWeatherAPI(lat, lng, cleanKey);
        cachedWeather = data;
        return data;
      } catch (err) {
        console.warn('WeatherAPI.com request failed, attempting fallback:', err);
      }
    }

    if (preferredProvider === 'openweathermap' || preferredProvider === 'auto') {
      try {
        const data = await fetchOpenWeatherMap(lat, lng, cleanKey);
        cachedWeather = data;
        return data;
      } catch (err) {
        console.warn('OpenWeatherMap failed, falling back to Open-Meteo:', err);
      }
    }
  }

  // Default: Open-Meteo
  const data = await fetchOpenMeteo(lat, lng);
  cachedWeather = data;
  return data;
}

// ------------------------------------------------------------
// Open-Meteo Implementation (Free, Real meteorological data)
// ------------------------------------------------------------
async function fetchOpenMeteo(lat: number, lng: number): Promise<WeatherData> {
  const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&wind_speed_unit=kmh&timezone=auto`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    throw new Error(`Open-Meteo HTTP error: ${res.status}`);
  }

  const json = await res.json();
  const current = json.current;
  const hourly = json.hourly;

  const wCode = current.weather_code ?? 0;
  const { condition, description, iconCode } = wmoCodeToCondition(wCode);

  const windSpeedKmh = Math.round((current.wind_speed_10m ?? 0) * 10) / 10;
  const windGustsKmh = current.wind_gusts_10m ? Math.round(current.wind_gusts_10m * 10) / 10 : undefined;
  const temp = Math.round((current.temperature_2m ?? 20) * 10) / 10;
  const feelsLike = Math.round((current.apparent_temperature ?? temp) * 10) / 10;
  const precip = current.precipitation ?? 0;

  // Next 6 hours forecast
  const hourlyForecast: HourlyWeather[] = [];
  if (hourly?.time && Array.isArray(hourly.time)) {
    const nowHour = new Date().getHours();
    for (let i = 0; i < hourly.time.length; i++) {
      const itemHour = new Date(hourly.time[i]).getHours();
      if (itemHour >= nowHour && hourlyForecast.length < 6) {
        const itemCode = hourly.weather_code?.[i] ?? 0;
        const info = wmoCodeToCondition(itemCode);
        hourlyForecast.push({
          time: `${itemHour}:00`,
          temp: Math.round(hourly.temperature_2m?.[i] ?? temp),
          precipitationProb: hourly.precipitation_probability?.[i] ?? 0,
          condition: info.condition,
          windSpeed: Math.round(hourly.wind_speed_10m?.[i] ?? windSpeedKmh),
        });
      }
    }
  }

  const advisory = generateMotorcycleAdvisory(temp, windSpeedKmh, windGustsKmh, precip, condition);

  return {
    temp,
    feelsLike,
    condition,
    description,
    iconCode,
    humidity: current.relative_humidity_2m ?? 50,
    windSpeed: windSpeedKmh,
    windDeg: current.wind_direction_10m ?? 0,
    windGust: windGustsKmh,
    visibility: 10, // km standard clear
    precipitation: precip,
    fetchedAt: Date.now(),
    lat,
    lng,
    provider: 'open-meteo',
    hourlyForecast,
    motorcycleAdvisory: advisory,
  };
}

// ------------------------------------------------------------
// OpenWeatherMap Implementation
// ------------------------------------------------------------
async function fetchOpenWeatherMap(lat: number, lng: number, apiKey: string): Promise<WeatherData> {
  const url = `${OWM_BASE}/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenWeatherMap error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const main = data.main as Record<string, number>;
  const wind = data.wind as Record<string, number>;
  const weatherArr = data.weather as Array<Record<string, unknown>>;
  const rain = data.rain as Record<string, number> | undefined;
  const visibility = data.visibility as number | undefined;

  const temp = Math.round((main.temp ?? 20) * 10) / 10;
  const feelsLike = Math.round((main.feels_like ?? temp) * 10) / 10;
  const windSpeedKmh = Math.round((wind?.speed ?? 0) * 3.6 * 10) / 10; // m/s → km/h
  const windGustsKmh = wind?.gust ? Math.round(wind.gust * 3.6 * 10) / 10 : undefined;
  const condition = String(weatherArr?.[0]?.main ?? 'Clear');
  const description = String(weatherArr?.[0]?.description ?? 'clear sky');
  const iconCode = String(weatherArr?.[0]?.icon ?? '01d');
  const precip = rain?.['1h'] ?? 0;

  const advisory = generateMotorcycleAdvisory(temp, windSpeedKmh, windGustsKmh, precip, condition);

  return {
    temp,
    feelsLike,
    condition,
    description,
    iconCode,
    humidity: main.humidity ?? 50,
    windSpeed: windSpeedKmh,
    windDeg: wind?.deg ?? 0,
    windGust: windGustsKmh,
    visibility: visibility ? visibility / 1000 : 10,
    precipitation: precip,
    fetchedAt: Date.now(),
    lat,
    lng,
    provider: 'openweathermap',
    motorcycleAdvisory: advisory,
  };
}

// ------------------------------------------------------------
// Helpers & Condition Mappers
// ------------------------------------------------------------
function wmoCodeToCondition(code: number): { condition: string; description: string; iconCode: string } {
  switch (code) {
    case 0:
      return { condition: 'Clear', description: 'Clear sky', iconCode: '01d' };
    case 1:
      return { condition: 'Mainly Clear', description: 'Mainly clear', iconCode: '02d' };
    case 2:
      return { condition: 'Partly Cloudy', description: 'Partly cloudy', iconCode: '03d' };
    case 3:
      return { condition: 'Overcast', description: 'Overcast skies', iconCode: '04d' };
    case 45:
    case 48:
      return { condition: 'Fog', description: 'Foggy conditions', iconCode: '50d' };
    case 51:
    case 53:
    case 55:
      return { condition: 'Drizzle', description: 'Light mist & drizzle', iconCode: '09d' };
    case 61:
    case 63:
    case 65:
      return { condition: 'Rain', description: 'Precipitation / rain', iconCode: '10d' };
    case 71:
    case 73:
    case 75:
      return { condition: 'Snow', description: 'Snow fall', iconCode: '13d' };
    case 80:
    case 81:
    case 82:
      return { condition: 'Showers', description: 'Heavy passing showers', iconCode: '09d' };
    case 95:
    case 96:
    case 99:
      return { condition: 'Thunderstorm', description: 'Thunderstorm & gusty winds', iconCode: '11d' };
    default:
      return { condition: 'Clear', description: 'Fair weather', iconCode: '01d' };
  }
}

function generateMotorcycleAdvisory(
  temp: number,
  windSpeed: number,
  windGusts: number | undefined,
  precip: number,
  condition: string
): { level: 'good' | 'caution' | 'warning'; title: string; description: string } {
  const gusts = windGusts ?? windSpeed;

  if (gusts >= 45) {
    return {
      level: 'warning',
      title: 'High Crosswind Advisory',
      description: `Gusts of ${Math.round(gusts)} km/h detected. Hold a relaxed but firm handlebar grip. Counter-steer into wind gusts on elevated bridges and open highway stretches.`,
    };
  }

  if (precip > 0.5 || condition.toLowerCase().includes('rain') || condition.toLowerCase().includes('storm')) {
    return {
      level: 'warning',
      title: 'Wet Surface Advisory',
      description: 'Precipitation detected. Double your braking distance, smooth out throttle inputs, and avoid road paint markings and steel expansion joints.',
    };
  }

  if (gusts >= 30) {
    return {
      level: 'caution',
      title: 'Moderate Crosswinds',
      description: `Wind gusts around ${Math.round(gusts)} km/h. Expect buffeting when passing large commercial trucks and clearing tree lines.`,
    };
  }

  if (temp <= 7) {
    return {
      level: 'caution',
      title: 'Cold Tarmac Warning',
      description: `Ambient ${Math.round(temp)}°C. Motorcycle tyres take significantly longer to reach operating temperature. Allow 10–15 km for tyre warm-up.`,
    };
  }

  if (temp >= 38) {
    return {
      level: 'caution',
      title: 'High Heat / Dehydration Alert',
      description: `Ambient ${Math.round(temp)}°C. Rider fatigue sets in quickly. Drink water and take shade breaks every 60–80 km.`,
    };
  }

  return {
    level: 'good',
    title: 'Optimal Riding Conditions',
    description: `Clear view, dry tarmac, and calm ${Math.round(windSpeed)} km/h breeze. Great weather for adventure touring on the V-Strom!`,
  };
}

// ------------------------------------------------------------
// WeatherAPI.com Implementation (Rich real-time + forecast)
// ------------------------------------------------------------
async function fetchWeatherAPI(lat: number, lng: number, apiKey: string): Promise<WeatherData> {
  const url = `${WEATHERAPI_BASE}/forecast.json?key=${apiKey}&q=${lat},${lng}&days=2&aqi=no&alerts=no`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`WeatherAPI error ${res.status}: ${body}`);
  }

  const json = await res.json();
  const current = json.current;
  const temp = Math.round((current.temp_c ?? 20) * 10) / 10;
  const feelsLike = Math.round((current.feelslike_c ?? temp) * 10) / 10;
  const condition = String(current.condition?.text ?? 'Clear');
  const iconCode = String(current.condition?.icon ?? '');
  const windSpeedKmh = Math.round((current.wind_kph ?? 0) * 10) / 10;
  const windGustsKmh = current.gust_kph ? Math.round(current.gust_kph * 10) / 10 : undefined;
  const precip = current.precip_mm ?? 0;

  // Next 6 hours forecast
  const hourlyForecast: HourlyWeather[] = [];
  const forecastDays = json.forecast?.forecastday ?? [];
  const allHours: Array<Record<string, unknown>> = [];
  for (const day of forecastDays) {
    if (Array.isArray(day.hour)) {
      allHours.push(...day.hour);
    }
  }

  const nowEpoch = Math.floor(Date.now() / 1000);
  for (const h of allHours) {
    const timeEpoch = Number(h.time_epoch ?? 0);
    if (timeEpoch >= nowEpoch - 1800 && hourlyForecast.length < 6) {
      const timeStr = String(h.time ?? '');
      const hourPart = timeStr.includes(' ') ? timeStr.split(' ')[1] : timeStr;
      const cond = (h.condition as Record<string, unknown>)?.text
        ? String((h.condition as Record<string, unknown>).text)
        : 'Clear';
      hourlyForecast.push({
        time: hourPart,
        temp: Math.round(Number(h.temp_c ?? temp)),
        precipitationProb: Number(h.chance_of_rain ?? 0),
        condition: cond,
        windSpeed: Math.round(Number(h.wind_kph ?? windSpeedKmh)),
      });
    }
  }

  const advisory = generateMotorcycleAdvisory(temp, windSpeedKmh, windGustsKmh, precip, condition);

  return {
    temp,
    feelsLike,
    condition,
    description: condition,
    iconCode,
    humidity: current.humidity ?? 50,
    windSpeed: windSpeedKmh,
    windDeg: current.wind_degree ?? 0,
    windGust: windGustsKmh,
    visibility: current.vis_km ?? 10,
    precipitation: precip,
    uvIndex: current.uv,
    fetchedAt: Date.now(),
    lat,
    lng,
    provider: 'weatherapi',
    hourlyForecast,
    motorcycleAdvisory: advisory,
  };
}

export function getWeatherIconUrl(iconCode: string): string {
  if (iconCode.startsWith('http://') || iconCode.startsWith('https://')) {
    return iconCode;
  }
  if (iconCode.startsWith('//')) {
    return `https:${iconCode}`;
  }
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

export function windDirLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export function clearWeatherCache(): void {
  cachedWeather = null;
}

