import type { VendorAdapter } from "../adapter.js";
import {
  DailyMetricSchema,
  SiteSnapshotSchema,
  type DailyMetric,
  type SiteSnapshot,
} from "../schemas.js";
import {
  capacityUtilizationPct,
  dailyMetricFromEnergy,
  parseFiniteNumber,
  toIsoDate,
  unixSecondsToIso,
  whToKwh,
  wToKw,
} from "./units.js";

export type EnphaseRaw = {
  siteId: string;
  current_power?: unknown;
  energy_today?: unknown;
  size_w?: unknown;
  system_size?: unknown;
  last_report_at?: unknown;
  start_date?: unknown;
  production?: unknown[];
  simulatedCleanBaselineKwhByDate?: Record<string, number>;
};

function addUtcDays(startDate: string, days: number): string {
  const date = new Date(`${startDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const enphaseAdapter: VendorAdapter<EnphaseRaw> = {
  vendor: "enphase",
  normalizeSnapshot(raw: EnphaseRaw): SiteSnapshot {
    const currentPowerW = parseFiniteNumber(raw.current_power, "current_power");
    const energyTodayKwh = whToKwh(
      parseFiniteNumber(raw.energy_today, "energy_today"),
    );
    const capacityW = parseFiniteNumber(
      raw.size_w ?? raw.system_size,
      "size_w|system_size",
    );
    const capacityKw = wToKw(capacityW);

    return SiteSnapshotSchema.parse({
      siteId: raw.siteId,
      vendor: "enphase",
      observedAt: unixSecondsToIso(raw.last_report_at, "last_report_at"),
      capacityKw,
      currentPowerW,
      energyTodayKwh,
      capacityUtilizationPct: capacityUtilizationPct(currentPowerW, capacityKw),
    });
  },
  normalizeHistory(raw: EnphaseRaw): DailyMetric[] {
    const startDate = toIsoDate(raw.start_date, "start_date");
    const production = raw.production;
    if (!Array.isArray(production) || production.length === 0) {
      throw new Error("Missing or invalid numeric field: production");
    }

    return production.map((wattHours, index) => {
      const date = addUtcDays(startDate, index);
      const energyGeneratedKwh = whToKwh(
        parseFiniteNumber(wattHours, `production[${String(index)}]`),
      );

      return DailyMetricSchema.parse(
        dailyMetricFromEnergy(
          { date, energyGeneratedKwh },
          raw.simulatedCleanBaselineKwhByDate,
        ),
      );
    });
  },
};
