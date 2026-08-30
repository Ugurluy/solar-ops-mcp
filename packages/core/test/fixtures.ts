import type { DailyMetric, WeatherContext } from "../src/schemas.js";
import { OPEN_METEO_ATTRIBUTION } from "../src/weather/attribution.js";

export function metric(input: {
  date: string;
  energyGeneratedKwh: number;
  simulatedCleanBaselineKwh: number;
}): DailyMetric {
  const yieldRatioPct =
    input.simulatedCleanBaselineKwh > 0
      ? (input.energyGeneratedKwh / input.simulatedCleanBaselineKwh) * 100
      : 0;

  return {
    date: input.date,
    energyGeneratedKwh: input.energyGeneratedKwh,
    simulatedCleanBaselineKwh: input.simulatedCleanBaselineKwh,
    yieldRatioPct,
    soilingLossPct: Math.min(100, Math.max(0, 100 - yieldRatioPct)),
    dataSource: "synthetic",
  };
}

export function weatherFixture(
  overrides: Partial<WeatherContext> = {},
): WeatherContext {
  return {
    siteId: "demo-sunridge-az",
    latitude: 33.45,
    longitude: -112.07,
    forecastDays: 2,
    daily: [
      {
        date: "2026-08-26",
        precipitationMm: 0,
        precipitationProbabilityPct: 5,
        shortwaveRadiationMj: 22,
      },
      {
        date: "2026-08-27",
        precipitationMm: 0,
        precipitationProbabilityPct: 10,
        shortwaveRadiationMj: 21,
      },
    ],
    airQuality: { pm10Ugm3: 12, dustUgm3: 4 },
    source: "open-meteo",
    attribution: OPEN_METEO_ATTRIBUTION,
    fetchedAt: "2026-08-26T18:00:00.000Z",
    ...overrides,
  };
}

export function daysFrom(
  startDate: string,
  count: number,
  values: { energyGeneratedKwh: number; simulatedCleanBaselineKwh: number },
): DailyMetric[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(`${startDate}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return metric({
      date: date.toISOString().slice(0, 10),
      ...values,
    });
  });
}
