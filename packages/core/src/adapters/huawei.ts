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
  kwToW,
  parseFiniteNumber,
  requireIsoDatetime,
  toIsoDate,
} from "./units.js";

export type HuaweiRaw = {
  siteId: string;
  observedAt?: unknown;
  capacity?: unknown;
  dataItemMap?: { day_power?: unknown };
  inverter?: { dataItemMap?: { active_power?: unknown } };
  history?: Array<{
    collectTime?: unknown;
    dataItemMap?: { inverter_power?: unknown };
  }>;
  simulatedCleanBaselineKwhByDate?: Record<string, number>;
};

export const huaweiAdapter: VendorAdapter<HuaweiRaw> = {
  vendor: "huawei",
  normalizeSnapshot(raw: HuaweiRaw): SiteSnapshot {
    const capacityKw = parseFiniteNumber(raw.capacity, "capacity");
    const energyTodayKwh = parseFiniteNumber(
      raw.dataItemMap?.day_power,
      "dataItemMap.day_power",
    );
    const activePowerKw = parseFiniteNumber(
      raw.inverter?.dataItemMap?.active_power,
      "inverter.dataItemMap.active_power",
    );
    const currentPowerW = kwToW(activePowerKw);

    return SiteSnapshotSchema.parse({
      siteId: raw.siteId,
      vendor: "huawei",
      observedAt: requireIsoDatetime(raw.observedAt, "observedAt"),
      capacityKw,
      currentPowerW,
      energyTodayKwh,
      capacityUtilizationPct: capacityUtilizationPct(currentPowerW, capacityKw),
    });
  },
  normalizeHistory(raw: HuaweiRaw): DailyMetric[] {
    const rows = raw.history;
    if (!rows || rows.length === 0) {
      throw new Error("Missing or invalid numeric field: history");
    }

    return rows.map((row, index) => {
      const date = toIsoDate(
        row.collectTime,
        `history[${String(index)}].collectTime`,
      );
      const energyGeneratedKwh = parseFiniteNumber(
        row.dataItemMap?.inverter_power,
        `history[${String(index)}].dataItemMap.inverter_power`,
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
