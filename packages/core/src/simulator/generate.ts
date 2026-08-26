import type { EnphaseRaw } from "../adapters/enphase.js";
import type { FroniusRaw } from "../adapters/fronius.js";
import type { HuaweiRaw } from "../adapters/huawei.js";
import type { SolarEdgeRaw } from "../adapters/solaredge.js";
import type { DemoSite } from "../schemas.js";
import { createRng, hashSeed } from "./seed.js";
import {
  DEFAULT_AS_OF,
  DEFAULT_HISTORY_DAYS,
  baselinesByDate,
  currentPowerW,
  simulateDailyEnergy,
  type SimulatedDay,
} from "./series.js";
import { getDemoSite } from "../sites.js";

export { DEFAULT_AS_OF, DEFAULT_HISTORY_DAYS } from "./series.js";

export type GeneratedRawPayload =
  | { vendor: "solaredge"; raw: SolarEdgeRaw }
  | { vendor: "fronius"; raw: FroniusRaw }
  | { vendor: "enphase"; raw: EnphaseRaw }
  | { vendor: "huawei"; raw: HuaweiRaw };

export function generateRawPayload(
  siteId: string,
  asOf = DEFAULT_AS_OF,
  historyDays = DEFAULT_HISTORY_DAYS,
): GeneratedRawPayload {
  const site = getDemoSite(siteId);
  const random = createRng(hashSeed(`${site.siteId}:${asOf}:${String(historyDays)}`));
  const days = simulateDailyEnergy(site, asOf, historyDays, random);
  const latest = days.at(-1);
  if (!latest) {
    throw new Error("History generation produced no days.");
  }

  const powerW = currentPowerW(site, latest, random);
  const baselines = baselinesByDate(days);

  switch (site.vendor) {
    case "solaredge":
      return { vendor: "solaredge", raw: toSolarEdge(site, asOf, days, powerW, baselines) };
    case "fronius":
      return { vendor: "fronius", raw: toFronius(site, asOf, days, powerW, baselines) };
    case "enphase":
      return { vendor: "enphase", raw: toEnphase(site, asOf, days, powerW, baselines) };
    case "huawei":
      return { vendor: "huawei", raw: toHuawei(site, asOf, days, powerW, baselines) };
  }
}

function toSolarEdge(
  site: DemoSite,
  asOf: string,
  days: SimulatedDay[],
  powerW: number,
  baselines: Record<string, number>,
): SolarEdgeRaw {
  return {
    siteId: site.siteId,
    details: { peakPower: site.capacityKw },
    overview: {
      lastUpdateTime: asOf,
      currentPower: { power: powerW },
    },
    energy: {
      values: days.map((day) => ({
        date: `${day.date} 00:00:00`,
        value: Math.round(day.energyGeneratedKwh * 1000),
      })),
    },
    simulatedCleanBaselineKwhByDate: baselines,
  };
}

function toFronius(
  site: DemoSite,
  asOf: string,
  days: SimulatedDay[],
  powerW: number,
  baselines: Record<string, number>,
): FroniusRaw {
  return {
    siteId: site.siteId,
    peakPower: site.capacityKw,
    flowdata: {
      data: {
        channels: [{ channelName: "PowerPV", value: powerW }],
      },
    },
    aggrdata: {
      data: days.map((day) => ({
        logDateTime: day.date === days.at(-1)?.date ? asOf : `${day.date}T12:00:00.000Z`,
        channels: [
          {
            channelName: "EnergyProductionTotal",
            value: Math.round(day.energyGeneratedKwh * 1000),
          },
        ],
      })),
    },
    simulatedCleanBaselineKwhByDate: baselines,
  };
}

function toEnphase(
  site: DemoSite,
  asOf: string,
  days: SimulatedDay[],
  powerW: number,
  baselines: Record<string, number>,
): EnphaseRaw {
  const latest = days.at(-1);
  if (!latest) {
    throw new Error("History generation produced no days.");
  }

  return {
    siteId: site.siteId,
    current_power: powerW,
    energy_today: Math.round(latest.energyGeneratedKwh * 1000),
    size_w: Math.round(site.capacityKw * 1000),
    last_report_at: Math.floor(new Date(asOf).getTime() / 1000),
    start_date: days[0]?.date,
    production: days.map((day) => Math.round(day.energyGeneratedKwh * 1000)),
    simulatedCleanBaselineKwhByDate: baselines,
  };
}

function toHuawei(
  site: DemoSite,
  asOf: string,
  days: SimulatedDay[],
  powerW: number,
  baselines: Record<string, number>,
): HuaweiRaw {
  const latest = days.at(-1);
  if (!latest) {
    throw new Error("History generation produced no days.");
  }

  return {
    siteId: site.siteId,
    observedAt: asOf,
    capacity: site.capacityKw,
    dataItemMap: { day_power: latest.energyGeneratedKwh.toFixed(3) },
    inverter: { dataItemMap: { active_power: (powerW / 1000).toFixed(3) } },
    history: days.map((day) => ({
      collectTime: day.date,
      dataItemMap: { inverter_power: day.energyGeneratedKwh.toFixed(3) },
    })),
    simulatedCleanBaselineKwhByDate: baselines,
  };
}
