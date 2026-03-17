import NodeCache from 'node-cache';
import { weatherLogger } from '../utils/logger';

// Initialize cache with TTL of 15 minutes (900 seconds)
const weatherCache = new NodeCache({ stdTTL: 900, checkperiod: 120 });

// WMO Weather Code mapping
const WEATHER_CODE_MAP: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with heavy hail',
};

// Types for weather data
export interface CurrentWeatherData {
  temperature: number;
  weather_code: number;
  weather_description: string;
  precipitation: number;
  location: string;
}

export interface DailyForecastDay {
  date: string;
  temperature_max: number;
  temperature_min: number;
  weather_code: number;
  weather_description: string;
  precipitation_sum: number;
}

export interface DailyForecastData {
  location: string;
  forecast: DailyForecastDay[];
}

// Open-Meteo API response types
interface OpenMeteoCurrentResponse {
  current: {
    temperature_2m: number;
    weather_code: number;
    precipitation: number;
  };
}

interface OpenMeteoDailyResponse {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    precipitation_sum: number[];
  };
}

/**
 * Get weather description from WMO code
 */
function getWeatherDescription(code: number): string {
  return WEATHER_CODE_MAP[code] || 'Unknown';
}

/**
 * Generate cache key for current weather
 */
export function getCurrentWeatherCacheKey(fairId: string | null): string {
  return `weather:${fairId || 'default'}`;
}

/**
 * Generate cache key for daily forecast
 */
export function getDailyForecastCacheKey(fairId: string | null): string {
  return `weather:${fairId || 'default'}:daily`;
}

/**
 * Get weather data from cache
 */
export function getWeatherFromCache<T>(cacheKey: string): T | undefined {
  return weatherCache.get<T>(cacheKey);
}

/**
 * Cache weather data
 */
export function cacheWeatherData<T>(cacheKey: string, data: T): void {
  weatherCache.set(cacheKey, data);
}

/**
 * Validate current weather API response structure
 */
function validateCurrentWeatherResponse(data: unknown): data is OpenMeteoCurrentResponse {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const response = data as Record<string, unknown>;

  if (!response.current || typeof response.current !== 'object') {
    return false;
  }

  const current = response.current as Record<string, unknown>;

  return (
    typeof current.temperature_2m === 'number' &&
    typeof current.weather_code === 'number' &&
    typeof current.precipitation === 'number'
  );
}

/**
 * Validate daily forecast API response structure
 */
function validateDailyForecastResponse(data: unknown): data is OpenMeteoDailyResponse {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const response = data as Record<string, unknown>;

  if (!response.daily || typeof response.daily !== 'object') {
    return false;
  }

  const daily = response.daily as Record<string, unknown>;

  if (
    !Array.isArray(daily.time) ||
    !Array.isArray(daily.temperature_2m_max) ||
    !Array.isArray(daily.temperature_2m_min) ||
    !Array.isArray(daily.weather_code) ||
    !Array.isArray(daily.precipitation_sum)
  ) {
    return false;
  }

  // Ensure arrays have at least one element and are of same length
  const length = daily.time.length;
  if (
    length === 0 ||
    daily.temperature_2m_max.length !== length ||
    daily.temperature_2m_min.length !== length ||
    daily.weather_code.length !== length ||
    daily.precipitation_sum.length !== length
  ) {
    return false;
  }

  return true;
}

/**
 * Fetch with retry on transient failures
 */
async function fetchWithRetry(url: string, retries: number = 1): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      // Retry on transient server errors
      if (response.status === 503 && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
    }
  }

  throw lastError || new Error('Failed to fetch after retries');
}

/**
 * Fetch current weather data from Open-Meteo API
 */
export async function fetchWeatherData(
  latitude: number,
  longitude: number,
  location: string,
  fairId: string | null
): Promise<CurrentWeatherData | null> {
  const cacheKey = getCurrentWeatherCacheKey(fairId);

  // Check cache first
  const cachedData = getWeatherFromCache<CurrentWeatherData>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,precipitation`;

    const response = await fetchWithRetry(url);

    if (!response.ok) {
      weatherLogger.error(`Weather API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    // Validate API response structure
    if (!validateCurrentWeatherResponse(data)) {
      weatherLogger.error('Invalid weather API response structure');
      return null;
    }

    const weatherData: CurrentWeatherData = {
      temperature: Math.round(data.current.temperature_2m * 10) / 10,
      weather_code: data.current.weather_code,
      weather_description: getWeatherDescription(data.current.weather_code),
      precipitation: data.current.precipitation,
      location,
    };

    // Cache the result
    cacheWeatherData(cacheKey, weatherData);

    return weatherData;
  } catch (error) {
    weatherLogger.error('Error fetching weather data:', error);
    return null;
  }
}

/**
 * Fetch 7-day daily forecast from Open-Meteo API
 */
export async function fetchDailyForecast(
  latitude: number,
  longitude: number,
  location: string,
  fairId: string | null
): Promise<DailyForecastData | null> {
  const cacheKey = getDailyForecastCacheKey(fairId);

  // Check cache first
  const cachedData = getWeatherFromCache<DailyForecastData>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum`;

    const response = await fetchWithRetry(url);

    if (!response.ok) {
      weatherLogger.error(`Weather API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    // Validate API response structure
    if (!validateDailyForecastResponse(data)) {
      weatherLogger.error('Invalid daily forecast API response structure');
      return null;
    }

    const forecast: DailyForecastDay[] = data.daily.time.map((date, index) => ({
      date,
      temperature_max: Math.round(data.daily.temperature_2m_max[index] * 10) / 10,
      temperature_min: Math.round(data.daily.temperature_2m_min[index] * 10) / 10,
      weather_code: data.daily.weather_code[index],
      weather_description: getWeatherDescription(data.daily.weather_code[index]),
      precipitation_sum: data.daily.precipitation_sum[index],
    }));

    const forecastData: DailyForecastData = {
      location,
      forecast,
    };

    // Cache the result
    cacheWeatherData(cacheKey, forecastData);

    return forecastData;
  } catch (error) {
    weatherLogger.error('Error fetching daily forecast:', error);
    return null;
  }
}
