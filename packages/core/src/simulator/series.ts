import type { DemoSite } from "../schemas.js";

export const DEFAULT_AS_OF = "2026-08-26T18:00:00.000Z";
export const DEFAULT_HISTORY_DAYS = 14;

export type SimulatedDay = {
  date: string;
  energyGeneratedKwh: number;
  simulatedCleanBaselineKwh: number;
};

function yieldForDay(
  scenario: DemoSite["activeScenario"],
  dayIndex: number,
  dayCount: number,
  random: () => number,
): number {
  const progress = dayCount <= 1 ? 1 : dayIndex / (dayCount - 1);
  const wobble = (random() - 0.5) * 0.04;

  switch (scenario) {
    case "baseline":
      return 0.97 + wobble;
    case "soiled":
      return 0.84 - progress * 0.06 + wobble;
    case "recovering":
      return 0.8 + progress * 0.16 + wobble;
    case "dusty":
      return 0.74 - progress * 0.04 + wobble;
  }
}

export function simulateDailyEnergy(
  site: DemoSite,
  asOf: string,
  historyDays: number,
  random: () => number,
): SimulatedDay[] {
  const end = new Date(asOf);
  const days: SimulatedDay[] = [];

  for (let offset = historyDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(end);
    date.setUTCDate(date.getUTCDate() - offset);
    const dateStamp = date.toISOString().slice(0, 10);
    const dayIndex = historyDays - 1 - offset;
    const yieldRatio = Math.min(
      1,
      Math.max(
        0.55,
        yieldForDay(site.activeScenario, dayIndex, historyDays, random),
      ),
    );
    const simulatedCleanBaselineKwh = roundHours(
      site.capacityKw * (4.4 + random() * 0.6),
    );
    const energyGeneratedKwh = roundHours(
      simulatedCleanBaselineKwh * yieldRatio,
    );

    days.push({
      date: dateStamp,
      energyGeneratedKwh,
      simulatedCleanBaselineKwh,
    });
  }

  return days;
}

function roundHours(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function currentPowerW(
  site: DemoSite,
  latest: SimulatedDay,
  random: () => number,
): number {
  const utilization = Math.min(
    0.85,
    (latest.energyGeneratedKwh / latest.simulatedCleanBaselineKwh) * 0.55 +
      random() * 0.05,
  );

  return Math.round(site.capacityKw * 1000 * utilization);
}

export function baselinesByDate(
  days: SimulatedDay[],
): Record<string, number> {
  return Object.fromEntries(
    days.map((day) => [day.date, day.simulatedCleanBaselineKwh]),
  );
}
