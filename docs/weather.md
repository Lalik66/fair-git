# Add Weather Support to AI Chat (Multi-Agent Workflow)

## Task 1: Implementation (Coder Agent)

Integrate Open-Meteo weather API into Fair Marketplace chatbot.

**Prerequisite:** Add `node-cache` to backend: `npm install node-cache` (in backend directory)

### Requirements

#### 1. **Weather API**: Open-Meteo only
- Endpoint: `https://api.open-meteo.com/v1/forecast`
- Current: `temperature_2m, weather_code, precipitation`
- Daily: Fetch only on explicit request ("7-day forecast?", "Will it rain next week?", "proqnoz")
- Daily endpoint params: `daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum`
- Daily cache key: `weather:${fairId}:daily` (separate from current weather)
- Cache: 10-30 minutes per location

#### 2. **Location Resolution**

**Primary Location Source (use Prisma, NOT raw SQL):**

Match the logic in `backend/src/routes/public.ts` (next-fair):

```typescript
// 1. Prefer ACTIVE fair first (fair has started, not ended)
let fair = await prisma.fair.findFirst({
  where: { status: 'active', endDate: { gte: new Date() } },
  select: { id: true, mapCenterLat: true, mapCenterLng: true, name: true, locationAddress: true },
});

// 2. If no active fair, use earliest UPCOMING fair
if (!fair) {
  fair = await prisma.fair.findFirst({
    where: { status: 'upcoming', startDate: { gte: new Date() } },
    orderBy: { startDate: 'asc' },
    select: { id: true, mapCenterLat: true, mapCenterLng: true, name: true, locationAddress: true },
  });
}
```

**Definition:**
- "Active" = Fair has started but not ended (status='active', endDate >= today)
- "Upcoming" = Fair hasn't started yet (status='upcoming', startDate >= today)
- **Priority:** Active first, then earliest upcoming

**Location Name for Responses:**
- Use `fair.locationAddress` if available (e.g., "Baku, Azerbaijan")
- Else use `fair.name` (fair name)
- When using Baku fallback: use `"Baku"`

**Fallback:** If no fair found or no coordinates, use Baku (lat: 40.4093, lng: 49.8671)

**Location Resolution Flow:**
1. If fair exists AND has coordinates (mapCenterLat, mapCenterLng) → Use them
2. If fair exists but coordinates are NULL → Log error, use Baku
3. If no fair in context → Use Baku
4. If API fails → Show error, don't crash

#### 3. **Weather Detection**

**Keywords to Detect Weather Questions:**

| English | Azerbaijani |
|---------|-------------|
| weather | hava |
| temperature | temperatur |
| rain | yağış |
| precipitation | yağıntı |
| forecast | proqnoz |
| humidity | nəmlik |
| wind | külək (primary), əsd (alternate) |
| cold | soyuq |
| hot | isti |
| will it rain | yağış olacaqmı |
| what's the weather | hava necədir |
| 7-day, next week | 7 günlük, gələn həftə |

**Daily Forecast Detection:** If user asks for "7-day forecast", "proqnoz", "next week", "gələn həftə" → fetch daily data (separate API call with `daily=` params, separate cache key `weather:${fairId}:daily`)

**Detection Logic:**
- Check if user message contains any keywords above
- **If keywords found:** Fetch weather → Include in prompt → Call Gemini
- **If no keywords but message might be weather-related** (e.g., "Do I need an umbrella?", "Should I bring a jacket?"):
  - Let Gemini classify: "Is this weather-related?"
  - If yes → Fetch weather + retry
  - If no → Respond normally

#### 4. **Implementation**

**Files to Create/Modify:**

**New File: `backend/src/services/weatherService.ts`**
- Function: `fetchWeatherData(latitude, longitude)` - current weather
- Function: `fetchDailyForecast(latitude, longitude)` - 7-day forecast (only when explicitly requested)
- Function: `getWeatherFromCache(cacheKey)`
- Function: `cacheWeatherData(cacheKey, data)`
- **Caching:** Node.js `node-cache` (install: `npm install node-cache` in backend)
- **Cache Key Format:** `weather:${fairId}` for current, `weather:${fairId}:daily` for forecast. When no fair: `weather:default` (not `weather:null`)
- Cache TTL: 10-30 minutes (900-1800 seconds)
- Return mapped/readable weather description

**Modify: `backend/src/routes/ai.ts`**
- Detect weather keywords in user message
- Call `weatherService.fetchWeatherData()` when weather detected
- Call `weatherService.fetchDailyForecast()` only when daily forecast keywords detected
- Include weather data as context in prompt
- Handle caching (check cache before API call)
- Pass weather context to Gemini

**Update: Gemini System Prompt**

Add the following section to the system prompt:

```
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
```

**Implementation Example:**
```typescript
const weatherContext = weather 
  ? `\n\nWEATHER DATA:\nLocation: ${weather.location}\nTemperature: ${weather.temperature}°C\nCondition: ${weather.weather_description}\nPrecipitation: ${weather.precipitation}mm`
  : '';

const systemPrompt = baseSystemPrompt + weatherContext;
```

#### 5. **Caching Strategy**

**Caching Implementation:**
- **Tool:** Node.js `node-cache` package (install: `npm install node-cache` in backend directory)
- **Cache Key Format:** `weather:${fairId}` for current, `weather:${fairId}:daily` for forecast. When no fair: `weather:default`
- **TTL (Time-To-Live):** 10-30 minutes (600-1800 seconds)
- **Rate Limiting:** Max 1 Open-Meteo API call per location per 10 minutes
  - If multiple requests within 10 minutes → Use cached data
  - After TTL expires → Fetch fresh data

**Implementation:**
```typescript
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 900 }); // 15 minutes default

async function getWeather(fairIdOrDefault: string, lat: number, lng: number) {
  const cacheKey = `weather:${fairIdOrDefault}`; // Use 'default' when no fair
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  const weather = await fetchFromOpenMeteo(lat, lng);
  cache.set(cacheKey, weather);
  return weather;
}
```

#### 6. **Error Handling**

**Error Scenarios & Responses:**

| Scenario | User Message (English) | User Message (Azerbaijani) |
|----------|------------------------|---------------------------|
| API timeout (>30s) | "I can't access weather data right now. Try again in a moment." | "Hava məlumatını almaq mümkün olmadı. Biraz sonra yenidən cəhd edin." |
| HTTP 503 (unavailable) | Same as above | Same as above |
| Malformed response | Same as above | Same as above |
| No coordinates found | "I don't have location data for this fair. Please try asking again." | "Bu yarmarka üçün ərazi məlumatı yoxdur. Lütfən yenidən soruşun." |
| Network down | Same as timeout | Same as timeout |

**Implementation:**
- Log all errors with context (don't expose to user)
- Retry once on transient failures (timeout, 503)
- Never crash the chat on weather API failure
- Gracefully fallback to normal chatbot response

**Note:** Open-Meteo returns `temperature_2m` (not `temperature`) and `precipitation` in `current`. Check the API response structure when mapping to your format.

#### 7. **Languages Supported**

- English (EN)
- Azerbaijani (AZ)
- Russian (RU) - optional; existing AI system prompt supports it; add RU keywords if extending

---

## Task 2: Code Review (Code-Reviewer Agent)

After the coder completes the implementation, review for completeness, security, performance, and quality.

### Review Checklist

#### **Requirements Completeness**
- [ ] All keywords supported (EN + AZ)
- [ ] Open-Meteo only (no other weather APIs)
- [ ] Fallback to Baku works when no fair location
- [ ] Daily forecast only on explicit request (not forced)
- [ ] Fair location resolved correctly (active first, then upcoming by startDate)
- [ ] NULL coordinate handling implemented
- [ ] Cache key uses `weather:default` when no fair (not `weather:null`)
- [ ] Both EN and AZ error messages included
- [ ] node-cache installed in backend

#### **Security**
- [ ] No hardcoded API keys or secrets in code
- [ ] API responses validated before passing to Gemini
- [ ] User input sanitized (no injection attacks)
- [ ] No sensitive data in logs or errors
- [ ] Error messages don't expose system details

#### **Performance**
- [ ] Caching implemented (10-30 min TTL)
- [ ] Cache is checked before every API call
- [ ] No redundant Open-Meteo calls within cache window
- [ ] Rate limiting enforced (max 1 call per location per 10 min)
- [ ] node-cache working correctly

#### **Error Handling**
- [ ] No crashes on API failure
- [ ] User-friendly error messages (tested in EN + AZ)
- [ ] Retry logic implemented for transient failures
- [ ] Graceful degradation (missing weather ≠ broken chat)
- [ ] All error paths logged for debugging

#### **Code Quality**
- [ ] TypeScript types throughout (no `any`)
- [ ] No debug logs or console.logs left in production code
- [ ] Follows project's existing code style
- [ ] Comments explain non-obvious logic (especially caching)
- [ ] Function signatures clear and documented

#### **Functionality Testing** (verify manually)

| Test Case | Expected Result |
|-----------|-----------------|
| "What's the weather?" | Shows current temperature, condition, and location |
| "Hava necədir?" (Azerbaijani) | Same as above in natural Azerbaijani response |
| "Will it rain today?" | Shows precipitation info and probability |
| "7-day forecast?" | Fetches and displays daily forecast |
| Ask weather 5x in 30 seconds | Only 1 API call made, rest use cache |
| API timeout scenario | Shows user-friendly error, chat continues |
| API returns 503 | Retries once, then shows error |
| Fair has no coordinates | Defaults to Baku, no crash |
| No fair in context | Defaults to Baku, cache key = weather:default |
| Malformed API response | Gracefully handles, shows error |

#### **Documentation**
- [ ] Code comments explain caching logic
- [ ] JSDoc comments on all weatherService functions
- [ ] README or inline docs show weather feature usage
- [ ] Error states documented

### Review Output

**1. Detailed Comments**
- Comment directly on code issues
- Link to specific lines

**2. Summary Report**
Include:
- What works well
- What needs fixes
- Critical blockers
- Nice-to-have improvements

**3. Status & Issues**
Format:
```
STATUS: APPROVED / NEEDS FIXES

CRITICAL ISSUES (must fix):
- Issue 1: [description + link]
- Issue 2: [description + link]

IMPORTANT ISSUES (should fix):
- Issue 1: [description]

NICE-TO-HAVE (can defer):
- Issue 1: [description]
```

**4. Approval Criteria**
Code is APPROVED when:
- ✅ All CRITICAL issues resolved
- ✅ All test cases passing
- ✅ Code follows project standards
- ✅ No security vulnerabilities
- ✅ Performance acceptable (no wasted API calls)
- ✅ Error messages user-friendly in EN + AZ
- ✅ Works in both languages

---

## Workflow

1. **Coder implements all requirements** (Task 1)
   - Installs node-cache in backend
   - Creates weatherService.ts
   - Modifies ai.ts routes
   - Updates Gemini system prompt
   - Implements caching & error handling

2. **Coder completes implementation**
   - Implementation is ready for review
   - Code-reviewer is notified (or proceeds to review)

3. **Code-reviewer checks all items** (Task 2 checklist)
   - Reviews completeness
   - Tests all scenarios
   - Checks security & performance
   - Creates detailed review comments

4. **Decision:**
   - **If APPROVED:** Code ready for merge to main
   - **If NEEDS FIXES:** Go to step 5

5. **Coder addresses issues**
   - Fix all 🔴 CRITICAL items immediately
   - Fix 🟡 IMPORTANT items (can discuss alternatives)
   - 🟢 NICE-TO-HAVE can be deferred to future PR

6. **Re-review** (if fixes were needed)
   - Code-reviewer checks that CRITICAL issues resolved
   - Approve or request additional fixes (max 2 review cycles)

7. **Merge & Deploy**
   - Once APPROVED: Merge to main
   - Monitor for errors in production

---

## Key Implementation Details (For Coder Reference)

### Weather Code Mapping (WMO Codes)
Open-Meteo returns WMO codes. Convert them to human-readable descriptions:

```
0: Clear sky
1: Mostly clear
2: Partly cloudy
3: Overcast
45: Foggy
48: Depositing rime fog
51: Light drizzle
53: Moderate drizzle
55: Dense drizzle
61: Slight rain
63: Moderate rain
65: Heavy rain
71: Slight snow
73: Moderate snow
75: Heavy snow
77: Snow grains
80: Slight rain showers
81: Moderate rain showers
82: Violent rain showers
85: Slight snow showers
86: Heavy snow showers
95: Thunderstorm with slight hail
96: Thunderstorm with hail
99: Thunderstorm with heavy hail
```

**Option A:** Include mapping in weatherService.ts
**Option B:** Pass WMO code to Gemini, let AI interpret naturally

### Example API Call (Current Weather)
```typescript
const response = await fetch(
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,precipitation`
);
const data = await response.json();
// data.current = { temperature_2m, weather_code, precipitation }
// Note: field names may vary - check Open-Meteo docs for exact structure
```

### Example API Call (Daily Forecast)
```typescript
const response = await fetch(
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum`
);
const data = await response.json();
// data.daily = { time[], temperature_2m_max[], ... }
```

### Caching Best Practice
```typescript
// Always check cache FIRST before API call
// Use fairId or 'default' when no fair - never null/undefined
const cacheKey = `weather:${fairId ?? 'default'}`;
const cachedWeather = cache.get(cacheKey);
if (cachedWeather) {
  return cachedWeather; // Fast path
}

// Cache miss → fetch & cache
const weather = await fetchFromOpenMeteo(lat, lng);
cache.set(cacheKey, weather);
return weather;
```

---

## Summary of Changes from Original Prompt

✅ **Fair resolution logic** matches public.ts (active first, then upcoming)  
✅ **Caching implementation** specified (node-cache, key format with 'default' fallback)  
✅ **Gemini system prompt** provided (exact text to add)  
✅ **Fair location NULL handling** defined with clear fallback logic  
✅ **Location name source** specified (locationAddress, name, or "Baku")  
✅ **Error messages** in EN + AZ (fixed Cyrillic typo: yarmarka)  
✅ **Keywords** expanded (külək for wind, daily forecast terms)  
✅ **Daily forecast** implementation specified (separate endpoint, cache key)  
✅ **Cache key** for no-fair case: `weather:default`  
✅ **node-cache** install step added  
✅ **Open-Meteo** response structure note added  
✅ **Workflow** simplified (no Git branch assumption)  
✅ **Testing scenarios** detailed  

---

**Ready to hand to agents!** 🚀
