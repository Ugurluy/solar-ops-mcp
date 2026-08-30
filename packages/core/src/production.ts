import { inclusiveDayCount } from "./dates.js";
import {
  ProductionMetricsResultSchema,
  ToolErrorException,
  type ProductionMetricsResult,
  type Vendor,
} from "./schemas.js";
import { getDemoSite } from "./sites.js";
import { generateRawPayload } from "./simulator/generate.js";
import { normalizeGenerated } from "./simulator/normalize.js";

const MAX_RANGE_DAYS = 30;

const VENDOR_TRACES: Record<
  Vendor,
  ProductionMetricsResult["normalizationTrace"]
> = {
  solaredge: [
    {
      rawField: "overview.currentPower.power",
      canonicalField: "currentPowerW",
      unitConversion: "W unchanged",
    },
    {
      rawField: "energy.values[].value",
      canonicalField: "energyGeneratedKwh",
      unitConversion: "Wh → kWh ÷ 1000",
    },
    {
      rawField: "details.peakPower",
      canonicalField: "capacityKw",
      unitConversion: "kW unchanged",
    },
  ],
  fronius: [
    {
      rawField: "flowdata.data.channels PowerPV|PowerOutput",
      canonicalField: "currentPowerW",
      unitConversion: "W unchanged",
    },
    {
      rawField: "aggrdata.data.channels EnergyProductionTotal|EnergyOutput",
      canonicalField: "energyGeneratedKwh",
      unitConversion: "Wh → kWh ÷ 1000",
    },
    {
      rawField: "peakPower",
      canonicalField: "capacityKw",
      unitConversion: "kW unchanged",
    },
  ],
  enphase: [
    {
      rawField: "current_power",
      canonicalField: "currentPowerW",
      unitConversion: "W unchanged",
    },
    {
      rawField: "energy_today / production[]",
      canonicalField: "energyGeneratedKwh",
      unitConversion: "Wh → kWh ÷ 1000",
    },
    {
      rawField: "size_w|system_size",
      canonicalField: "capacityKw",
      unitConversion: "W → kW ÷ 1000",
    },
  ],
  huawei: [
    {
      rawField: "inverter.dataItemMap.active_power",
      canonicalField: "currentPowerW",
      unitConversion: "kW → W × 1000",
    },
    {
      rawField: "dataItemMap.day_power",
      canonicalField: "energyTodayKwh",
      unitConversion: "kWh string parsed as kWh",
    },
    {
      rawField: "capacity",
      canonicalField: "capacityKw",
      unitConversion: "kW unchanged",
    },
  ],
};

export function getProductionMetrics(input: {
  siteId: string;
  startDate: string;
  endDate: string;
  detail?: "summary" | "normalization_trace";
}): ProductionMetricsResult {
  getDemoSite(input.siteId);

  const span = inclusiveDayCount(input.startDate, input.endDate);
  if (span < 1) {
    throw new ToolErrorException(
      "INVALID_DATE_RANGE",
      "startDate must be on or before endDate.",
    );
  }
  if (span > MAX_RANGE_DAYS) {
    throw new ToolErrorException(
      "RANGE_TOO_LONG",
      `Date range cannot exceed ${String(MAX_RANGE_DAYS)} days.`,
    );
  }

  const detail = input.detail ?? "summary";
  const generated = generateRawPayload(
    input.siteId,
    `${input.endDate}T18:00:00.000Z`,
    span,
  );
  const { snapshot, history } = normalizeGenerated(generated);
  const days = history.filter(
    (day) => day.date >= input.startDate && day.date <= input.endDate,
  );

  return ProductionMetricsResultSchema.parse({
    siteId: input.siteId,
    vendor: snapshot.vendor,
    snapshot,
    days,
    units: { energy: "kWh", power: "W", capacity: "kW" },
    dataSource: "synthetic",
    assumptions: [
      "Daily energy is synthetic vendor-shaped data, then normalized.",
      "simulatedCleanBaselineKwh is a scenario estimate, not a weather-adjusted PV model.",
    ],
    detail,
    ...(detail === "normalization_trace"
      ? { normalizationTrace: VENDOR_TRACES[snapshot.vendor] }
      : {}),
  });
}
