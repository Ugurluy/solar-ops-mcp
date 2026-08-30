import { describe, expect, it, vi } from "vitest";

import { OPEN_METEO_ATTRIBUTION } from "../src/weather/attribution.js";
import { createOpenMeteoClient } from "../src/weather/open-meteo.js";

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input.url;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const forecastBody = {
  daily: {
    time: ["2026-08-26", "2026-08-27"],
    precipitation_sum: [0.1, 0],
    precipitation_probability_max: [10, 5],
    shortwave_radiation_sum: [22.2, 21.8],
  },
};

const airQualityBody = {
  hourly: {
    time: ["2026-08-26T00:00", "2026-08-26T01:00"],
    pm10: [20, 22],
    dust: [4, 6],
  },
};

describe("Open-Meteo weather client", () => {
  it("restricts lookup to demo sites and rounds coordinates", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes("air-quality")) {
        return Promise.resolve(jsonResponse(airQualityBody));
      }

      expect(url).toContain("latitude=33.45");
      expect(url).toContain("longitude=-112.07");
      return Promise.resolve(jsonResponse(forecastBody));
    });

    const client = createOpenMeteoClient({
      fetch: fetchMock as unknown as typeof fetch,
      now: () => Date.parse("2026-08-26T18:00:00.000Z"),
    });

    await expect(client.getWeatherContext("unknown-site")).rejects.toThrow(
      /Unknown demo site/,
    );

    const weather = await client.getWeatherContext("demo-sunridge-az", 2);

    expect(weather.latitude).toBe(33.45);
    expect(weather.attribution).toBe(OPEN_METEO_ATTRIBUTION);
    expect(weather.airQuality.pm10Ugm3).toBe(21);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reuses a 15-minute cache", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = requestUrl(input);
      return Promise.resolve(
        jsonResponse(
          url.includes("air-quality") ? airQualityBody : forecastBody,
        ),
      );
    });
    const client = createOpenMeteoClient({
      fetch: fetchMock as unknown as typeof fetch,
      now: () => Date.parse("2026-08-26T18:00:00.000Z"),
    });

    await client.getWeatherContext("demo-sunridge-az", 2);
    await client.getWeatherContext("demo-sunridge-az", 2);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
