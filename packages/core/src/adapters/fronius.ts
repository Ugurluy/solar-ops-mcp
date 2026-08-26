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

type FroniusChannel = { channelName?: string; value?: unknown };

export type FroniusRaw = {
  siteId: string;
  peakPower?: unknown;
  flowdata?: { data?: { channels?: FroniusChannel[] } };
  aggrdata?: {
    data?: Array<{ logDateTime?: unknown; channels?: FroniusChannel[] }>;
  };
  simulatedCleanBaselineKwhByDate?: Record<string, number>;
};

function channelValue(
  channels: FroniusChannel[] | undefined,
  names: string[],
  field: string,
): number {
  if (!channels) {
    throw new Error(`Missing or invalid numeric field: ${field}`);
  }

  const lookup = new Map(
    channels
      .filter((channel) => typeof channel.channelName === "string")
      .map((channel) => [
        channel.channelName?.toLowerCase() ?? "",
        channel.value,
      ]),
  );

  for (const name of names) {
    const value = lookup.get(name.toLowerCase());
    if (value !== undefined && value !== null) {
      return parseFiniteNumber(value, field);
    }
  }

  throw new Error(`Missing or invalid numeric field: ${field}`);
}

export const froniusAdapter: VendorAdapter<FroniusRaw> = {
  vendor: "fronius",
  normalizeSnapshot(raw: FroniusRaw): SiteSnapshot {
    const currentPowerW = channelValue(
      raw.flowdata?.data?.channels,
      ["PowerPV", "PowerOutput"],
      "flowdata.data.channels PowerPV|PowerOutput",
    );
    const firstDay = raw.aggrdata?.data?.[0];
    const energyTodayKwh = whToKwh(
      channelValue(
        firstDay?.channels,
        ["EnergyProductionTotal", "EnergyOutput"],
        "aggrdata.data.channels EnergyProductionTotal|EnergyOutput",
      ),
    );
    const capacityKw = parseFiniteNumber(raw.peakPower, "peakPower");
    const observedAt = requireIsoDatetime(
      firstDay?.logDateTime,
      "aggrdata.data[0].logDateTime",
    );

    return SiteSnapshotSchema.parse({
      siteId: raw.siteId,
      vendor: "fronius",
      observedAt,
      capacityKw,
      currentPowerW,
      energyTodayKwh,
      capacityUtilizationPct: capacityUtilizationPct(currentPowerW, capacityKw),
    });
  },
  normalizeHistory(raw: FroniusRaw): DailyMetric[] {
    const rows = raw.aggrdata?.data;
    if (!rows || rows.length === 0) {
      throw new Error("Missing or invalid numeric field: aggrdata.data");
    }

    return rows.map((row, index) => {
      const date = toIsoDate(
        row.logDateTime,
        `aggrdata.data[${String(index)}].logDateTime`,
      );
      const energyGeneratedKwh = whToKwh(
        channelValue(
          row.channels,
          ["EnergyProductionTotal", "EnergyOutput"],
          `aggrdata.data[${String(index)}] EnergyProductionTotal|EnergyOutput`,
        ),
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
