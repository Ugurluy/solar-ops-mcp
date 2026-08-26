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
  requireIsoDatetime,
  toIsoDate,
  whToKwh,
} from "./units.js";

export type SolarEdgeRaw = {
  siteId: string;
  details?: { peakPower?: unknown };
  overview?: {
    lastUpdateTime?: unknown;
    currentPower?: { power?: unknown };
  };
  energy?: { values?: Array<{ date?: unknown; value?: unknown }> };
  simulatedCleanBaselineKwhByDate?: Record<string, number>;
};

function lastEnergyPoint(raw: SolarEdgeRaw): { date: string; wattHours: number } {
  const point = raw.energy?.values?.at(-1);
  if (!point) {
    throw new Error("Missing or invalid numeric field: energy.values");
  }

  return {
    date: toIsoDate(point.date, "energy.values.date"),
    wattHours: parseFiniteNumber(point.value, "energy.values.value"),
  };
}

export const solarEdgeAdapter: VendorAdapter<SolarEdgeRaw> = {
  vendor: "solaredge",
  normalizeSnapshot(raw: SolarEdgeRaw): SiteSnapshot {
    const currentPowerW = parseFiniteNumber(
      raw.overview?.currentPower?.power,
      "overview.currentPower.power",
    );
    const capacityKw = parseFiniteNumber(
      raw.details?.peakPower,
      "details.peakPower",
    );
    const energyTodayKwh = whToKwh(lastEnergyPoint(raw).wattHours);
    const observedAt = requireIsoDatetime(
      raw.overview?.lastUpdateTime,
      "overview.lastUpdateTime",
    );

    return SiteSnapshotSchema.parse({
      siteId: raw.siteId,
      vendor: "solaredge",
      observedAt,
      capacityKw,
      currentPowerW,
      energyTodayKwh,
      capacityUtilizationPct: capacityUtilizationPct(currentPowerW, capacityKw),
    });
  },
  normalizeHistory(raw: SolarEdgeRaw): DailyMetric[] {
    const values = raw.energy?.values;
    if (!values || values.length === 0) {
      throw new Error("Missing or invalid numeric field: energy.values");
    }

    return values.map((point, index) => {
      const date = toIsoDate(point.date, `energy.values[${String(index)}].date`);
      const energyGeneratedKwh = whToKwh(
        parseFiniteNumber(point.value, `energy.values[${String(index)}].value`),
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
