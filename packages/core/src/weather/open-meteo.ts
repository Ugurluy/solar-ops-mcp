import { z } from "zod";

import { WeatherContextSchema, type WeatherContext } from "../schemas.js";
import { OPEN_METEO_ATTRIBUTION } from "./attribution.js";
import { getSiteCoordinates, roundCoordinate } from "./coordinates.js";
import type { WeatherProvider } from "./provider.js";

const CACHE_MS = 15 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 8_000;
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

const NullableNumberArray = z.array(z.number().nullable());

const ForecastResponseSchema = z.looseObject({
  daily: z.object({
    time: z.array(z.string()),
    precipitation_sum: NullableNumberArray,
    precipitation_probability_max: NullableNumberArray,
    shortwave_radiation_sum: NullableNumberArray,
  }),
});

const AirQualityResponseSchema = z.looseObject({
  hourly: z.object({
    time: z.array(z.string()),
    pm10: NullableNumberArray,
    dust: NullableNumberArray,
  }),
});

export type OpenMeteoClientOptions = {
  fetch?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
  forecastUrl?: string;
  airQualityUrl?: string;
};

export function createOpenMeteoClient(
  options: OpenMeteoClientOptions = {},
): WeatherProvider {
  const fetchImpl = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const forecastUrl = options.forecastUrl ?? FORECAST_URL;
  const airQualityUrl = options.airQualityUrl ?? AIR_QUALITY_URL;
  const cache = new Map<string, WeatherContext>();
  const inflight = new Map<string, Promise<WeatherContext>>();

  return {
    async getWeatherContext(
      siteId: string,
      forecastDays = 7,
    ): Promise<WeatherContext> {
      if (forecastDays < 1 || forecastDays > 7) {
        throw new Error("Forecast horizon must be between 1 and 7 days.");
      }

      const coordinates = getSiteCoordinates(siteId);
      const bucket = Math.floor(now() / CACHE_MS);
      const cacheKey = [
        siteId,
        String(forecastDays),
        String(bucket),
        String(coordinates.latitude),
        String(coordinates.longitude),
      ].join(":");
      const cached = cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const pending = inflight.get(cacheKey);
      if (pending) {
        return pending;
      }

      const request = fetchWeather({
        siteId,
        forecastDays,
        coordinates,
        fetchImpl,
        timeoutMs,
        forecastUrl,
        airQualityUrl,
        fetchedAt: new Date(now()).toISOString(),
      }).then(
        (context) => {
          cache.set(cacheKey, context);
          inflight.delete(cacheKey);
          return context;
        },
        (error: unknown) => {
          inflight.delete(cacheKey);
          throw error;
        },
      );

      inflight.set(cacheKey, request);
      return request;
    },
  };
}

async function fetchWeather(input: {
  siteId: string;
  forecastDays: number;
  coordinates: { latitude: number; longitude: number };
  fetchImpl: typeof fetch;
  timeoutMs: number;
  forecastUrl: string;
  airQualityUrl: string;
  fetchedAt: string;
}): Promise<WeatherContext> {
  const { latitude, longitude } = input.coordinates;
  const airQualityDays = Math.min(input.forecastDays, 5);
  const [forecastJson, airQualityJson] = await Promise.all([
    getJson(
      input.fetchImpl,
      buildForecastUrl(
        input.forecastUrl,
        latitude,
        longitude,
        input.forecastDays,
      ),
      input.timeoutMs,
    ),
    getJson(
      input.fetchImpl,
      buildAirQualityUrl(
        input.airQualityUrl,
        latitude,
        longitude,
        airQualityDays,
      ),
      input.timeoutMs,
    ),
  ]);

  const forecast = ForecastResponseSchema.parse(forecastJson);
  const airQuality = AirQualityResponseSchema.parse(airQualityJson);

  return WeatherContextSchema.parse({
    siteId: input.siteId,
    latitude: roundCoordinate(latitude),
    longitude: roundCoordinate(longitude),
    forecastDays: input.forecastDays,
    daily: forecast.daily.time.map((date, index) => ({
      date: date.slice(0, 10),
      precipitationMm: forecast.daily.precipitation_sum[index] ?? null,
      precipitationProbabilityPct:
        forecast.daily.precipitation_probability_max[index] ?? null,
      shortwaveRadiationMj:
        forecast.daily.shortwave_radiation_sum[index] ?? null,
    })),
    airQuality: {
      pm10Ugm3: mean(airQuality.hourly.pm10.slice(0, 24)),
      dustUgm3: mean(airQuality.hourly.dust.slice(0, 24)),
    },
    source: "open-meteo",
    attribution: OPEN_METEO_ATTRIBUTION,
    fetchedAt: input.fetchedAt,
  });
}

function buildForecastUrl(
  base: string,
  latitude: number,
  longitude: number,
  forecastDays: number,
): string {
  const url = new URL(base);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "daily",
    "precipitation_sum,precipitation_probability_max,shortwave_radiation_sum",
  );
  url.searchParams.set("forecast_days", String(forecastDays));
  url.searchParams.set("timezone", "UTC");
  return url.toString();
}

function buildAirQualityUrl(
  base: string,
  latitude: number,
  longitude: number,
  forecastDays: number,
): string {
  const url = new URL(base);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("hourly", "pm10,dust");
  url.searchParams.set("forecast_days", String(forecastDays));
  url.searchParams.set("timezone", "UTC");
  return url.toString();
}

async function getJson(
  fetchImpl: typeof fetch,
  url: string,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Open-Meteo request failed (${String(response.status)})`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Open-Meteo request timed out.");
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function mean(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) {
    return null;
  }

  return present.reduce((sum, value) => sum + value, 0) / present.length;
}
