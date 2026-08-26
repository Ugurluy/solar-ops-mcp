export function parseFiniteNumber(value: unknown, field: string): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw new Error(`Missing or invalid numeric field: ${field}`);
}

export function whToKwh(wattHours: number): number {
  return wattHours / 1000;
}

export function kwToW(kilowatts: number): number {
  return kilowatts * 1000;
}

export function wToKw(watts: number): number {
  return watts / 1000;
}

export function capacityUtilizationPct(
  currentPowerW: number,
  capacityKw: number,
): number {
  if (capacityKw <= 0) {
    return 0;
  }

  return (currentPowerW / kwToW(capacityKw)) * 100;
}

export function toIsoDate(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`Missing or invalid date field: ${field}`);
  }

  const date = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Missing or invalid date field: ${field}`);
  }

  return date;
}

export function requireIsoDatetime(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing or invalid datetime field: ${field}`);
  }

  return value;
}

export function unixSecondsToIso(value: unknown, field: string): string {
  const seconds = parseFiniteNumber(value, field);
  return new Date(seconds * 1000).toISOString();
}

export function dailyMetricFromEnergy(
  input: {
    date: string;
    energyGeneratedKwh: number;
  },
  simulatedCleanBaselineKwhByDate?: Record<string, number>,
): {
  date: string;
  energyGeneratedKwh: number;
  simulatedCleanBaselineKwh: number;
  yieldRatioPct: number;
  soilingLossPct: number;
  dataSource: "synthetic";
} {
  const baseline =
    simulatedCleanBaselineKwhByDate?.[input.date] ?? input.energyGeneratedKwh;
  const yieldRatioPct =
    baseline > 0 ? (input.energyGeneratedKwh / baseline) * 100 : 0;
  const soilingLossPct = Math.min(
    100,
    Math.max(0, 100 - yieldRatioPct),
  );

  return {
    date: input.date,
    energyGeneratedKwh: input.energyGeneratedKwh,
    simulatedCleanBaselineKwh: baseline,
    yieldRatioPct,
    soilingLossPct,
    dataSource: "synthetic",
  };
}
