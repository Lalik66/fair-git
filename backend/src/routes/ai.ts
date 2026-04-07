import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../index';
import {
  fetchWeatherData,
  fetchDailyForecast,
  CurrentWeatherData,
  DailyForecastData,
} from '../services/weatherService';
import { aiLogger } from '../utils/logger';

// User-friendly weather error messages
const WEATHER_ERROR_MESSAGES = {
  en: "I can't access weather data right now. Try again in a moment.",
  az: 'Hava məlumatını almaq mümkün olmadı. Biraz sonra yenidən cəhd edin.',
};

const router = Router();

// Baku fallback coordinates
const BAKU_LAT = 40.4093;
const BAKU_LNG = 49.8671;
const BAKU_LOCATION = 'Baku';

// Weather detection keywords
const WEATHER_KEYWORDS_EN = [
  'weather',
  'temperature',
  'rain',
  'precipitation',
  'forecast',
  'humidity',
  'wind',
  'cold',
  'hot',
  'will it rain',
  "what's the weather",
  '7-day',
  'next week',
];

const WEATHER_KEYWORDS_AZ = [
  'hava',
  'temperatur',
  'yagis',
  'yaginti',
  'proqnoz',
  'nemlik',
  'kulek',
  'qar',
  'soyuq',
  'isti',
  'yagis olacaqmi',
  'hava necedir',
  '7 gunluk',
  'gelen hefte',
];

// Daily forecast detection keywords
const DAILY_FORECAST_KEYWORDS = [
  '7-day',
  '7 day',
  'proqnoz',
  'next week',
  'gelen hefte',
  'forecast',
  'weekly',
  'haftelik',
  '7 gunluk',
];

const BASE_SYSTEM_PROMPT = `Siz Sehir Yarmarkasinin resmi virtual komekcisiniz.
Ziyaretcilere ve istirakçilara tedbir haqqinda deqiq, qisa ve nezaketli melumat teqdim edin.
Cavablarinizi Azerbaycan dilinde lakonik, aydin ve hormetcil formada verin.
Eger melumat movcud deyilse, bunu açiq sekilde bildirin ve istifadeçini elaqe bolmesine yonlendirin.

Esas movzular:
- Tedbirin tarixi ve vaxti
- Mekan
- Istirak qaydalari
- Stend icaresi ve qeydiyyat
- Proqram ve eylenceler
- Elaqe melumatlari

Her zaman resmi ve etibarlı uslubu qoruyun. Istifadeçi hansi dilde müraciet ederse, cavabi eyni dilde teqdim edin (Azerbaycan, Ingilis ve ya Rus dili).

You have access to real-time weather data for the fair location when available.

When users ask about weather (temperature, rain, conditions, forecast, humidity, wind, etc.),
analyze the provided weather data and respond naturally and helpfully.

Always mention the location name in weather responses. Use the "location" field from the weather data.
For example: "In Baku, it's currently 22°C and mostly cloudy."

Weather Data Format (when provided):
{
  "temperature": <number in celsius>,
  "weather_description": <string>,
  "precipitation": <number in mm>,
  "location": "<from fair.locationAddress or fair.name, or 'Baku' when using default>"
}

If weather data is not provided, let the user know you cannot access weather information at this moment.

When users send polite greetings or thanks (e.g., "Thank you", "Thanks", "çox sağolun", "sağol", "Goodbye", "Hello", "Salam"), respond with a friendly, brief acknowledgment in the same language:
- English "Thank you" → "You're welcome!" or "Glad I could help!"
- Azerbaijani "çox sağolun" / "sağol" → "Xahiş edirəm!" or "Xoşbəxtəm ki, kömək edə bildim!"
- "Goodbye" / farewell → appropriate farewell in the user's language
Keep these responses short and natural.
`;

/**
 * Check if message contains weather-related keywords
 */
function containsWeatherKeywords(message: string): boolean {
  const normalizedMessage = message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const allKeywords = [...WEATHER_KEYWORDS_EN, ...WEATHER_KEYWORDS_AZ];

  return allKeywords.some((keyword) => {
    const normalizedKeyword = keyword
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return normalizedMessage.includes(normalizedKeyword);
  });
}

/**
 * Check if message is asking for daily forecast
 */
function isDailyForecastRequest(message: string): boolean {
  const normalizedMessage = message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return DAILY_FORECAST_KEYWORDS.some((keyword) => {
    const normalizedKeyword = keyword
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return normalizedMessage.includes(normalizedKeyword);
  });
}

/**
 * Get fair location for weather
 */
async function getFairLocation(): Promise<{
  fairId: string | null;
  latitude: number;
  longitude: number;
  location: string;
}> {
  const now = new Date();

  // 1. Prefer ACTIVE fair first (fair has started, not ended)
  let fair = await prisma.fair.findFirst({
    where: {
      status: 'active',
      endDate: { gte: now },
    },
    select: {
      id: true,
      mapCenterLat: true,
      mapCenterLng: true,
      name: true,
      locationAddress: true,
    },
  });

  // 2. If no active fair, use earliest UPCOMING fair
  if (!fair) {
    fair = await prisma.fair.findFirst({
      where: {
        status: 'upcoming',
        startDate: { gte: now },
      },
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        mapCenterLat: true,
        mapCenterLng: true,
        name: true,
        locationAddress: true,
      },
    });
  }

  // Use fair coordinates if available, otherwise fallback to Baku
  if (fair && fair.mapCenterLat && fair.mapCenterLng) {
    const location = fair.locationAddress || fair.name || BAKU_LOCATION;
    return {
      fairId: fair.id,
      latitude: fair.mapCenterLat,
      longitude: fair.mapCenterLng,
      location,
    };
  }

  // Fallback to Baku
  return {
    fairId: null,
    latitude: BAKU_LAT,
    longitude: BAKU_LNG,
    location: BAKU_LOCATION,
  };
}

/**
 * Build weather context for the system prompt
 */
function buildWeatherContext(
  currentWeather: CurrentWeatherData | null,
  dailyForecast: DailyForecastData | null,
  weatherError: boolean = false
): string {
  // If there was a weather fetch error, include error context for Gemini
  if (weatherError) {
    return `\n\nWEATHER DATA ERROR:
The weather service is temporarily unavailable. When the user asks about weather, please inform them with one of these messages based on the language they are using:
- English: "${WEATHER_ERROR_MESSAGES.en}"
- Azerbaijani: "${WEATHER_ERROR_MESSAGES.az}"`;
  }

  if (!currentWeather && !dailyForecast) {
    return '';
  }

  let context = '\n\nWEATHER DATA:';

  if (currentWeather) {
    context += `\nLocation: ${currentWeather.location}`;
    context += `\nTemperature: ${currentWeather.temperature}°C`;
    context += `\nCondition: ${currentWeather.weather_description}`;
    context += `\nPrecipitation: ${currentWeather.precipitation}mm`;
  }

  if (dailyForecast) {
    context += '\n\n7-DAY FORECAST:';
    context += `\nLocation: ${dailyForecast.location}`;
    for (const day of dailyForecast.forecast) {
      context += `\n${day.date}: ${day.weather_description}, High: ${day.temperature_max}°C, Low: ${day.temperature_min}°C, Precipitation: ${day.precipitation_sum}mm`;
    }
  }

  return context;
}

router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'AI chat is not configured',
        message: 'GEMINI_API_KEY is missing. Please add it to your .env file.',
      });
      return;
    }

    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      res.status(400).json({ error: 'Message cannot be empty' });
      return;
    }

    // Check if message contains weather keywords
    let currentWeather: CurrentWeatherData | null = null;
    let dailyForecast: DailyForecastData | null = null;
    let weatherError = false;

    if (containsWeatherKeywords(trimmedMessage)) {
      try {
        const locationInfo = await getFairLocation();

        // Fetch current weather
        currentWeather = await fetchWeatherData(
          locationInfo.latitude,
          locationInfo.longitude,
          locationInfo.location,
          locationInfo.fairId
        );

        // If user is asking for forecast, fetch daily data
        if (isDailyForecastRequest(trimmedMessage)) {
          dailyForecast = await fetchDailyForecast(
            locationInfo.latitude,
            locationInfo.longitude,
            locationInfo.location,
            locationInfo.fairId
          );
        }

        // Check if weather fetch failed (both null when user asked for weather)
        if (!currentWeather && !dailyForecast) {
          weatherError = true;
        }
      } catch (error) {
        // Log error but don't crash the chat
        aiLogger.error('Weather fetch error:', error);
        // Mark as error so user gets friendly message
        weatherError = true;
      }
    }

    // Build system prompt with weather context (includes error context if applicable)
    const weatherContext = buildWeatherContext(currentWeather, dailyForecast, weatherError);
    const systemPrompt = BASE_SYSTEM_PROMPT + weatherContext;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(trimmedMessage);
    const response = result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    aiLogger.error('AI chat error:', error);
    const err = error as (Error & { message?: string }) | undefined;
    res.status(500).json({
      error: 'Failed to get AI response',
      message:
        process.env.NODE_ENV === 'development'
          ? err?.message
          : 'Something went wrong. Please try again.',
    });
  }
});

export default router;
