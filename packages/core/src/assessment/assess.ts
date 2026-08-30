import { addUtcDays, toIsoDateStamp } from "../dates.js";
import {
  CleaningAssessmentSchema,
  type CleaningAssessment,
  type CleaningFactor,
  type DailyMetric,
  type WeatherContext,
} from "../schemas.js";
import { ASSESSMENT_WEIGHTS as W } from "./weights.js";

export function assessCleaning(input: {
  history: DailyMetric[];
  weather: WeatherContext;
  asOf?: string;
}): CleaningAssessment {
  const history = [...input.history].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
  const asOf = toIsoDateStamp(
    input.asOf ?? history.at(-1)?.date ?? input.weather.daily[0]?.date ?? "",
  );
  const warnings: string[] = [];
  const assumptions = [
    "Yield and recovery figures are simulated estimates, not a weather-adjusted PV model.",
    "evidenceScore measures cleaning-evidence strength, not forecast accuracy.",
    "Upcoming rain can defer a clean_soon decision to wait_for_rain.",
  ];

  if (asOf === "") {
    throw new Error("Cleaning assessment requires an as-of date.");
  }

  const recentStart = addUtcDays(asOf, -(7 - 1));
  const recent = history.filter(
    (day) => day.date >= recentStart && day.date <= asOf,
  );
  const older = history.filter((day) => day.date < recentStart);
  const factors = [
    productionFactor(recent, older, warnings),
    soilingLossFactor(recent),
    soilingDurationFactor(history, asOf),
    particulateFactor(
      "pm10",
      input.weather.airQuality.pm10Ugm3,
      "µg/m³",
      W.pm10Max,
      10,
      warnings,
    ),
    particulateFactor(
      "dust",
      input.weather.airQuality.dustUgm3,
      "µg/m³",
      W.dustMax,
      8,
      warnings,
    ),
  ];
  const evidenceScore = roundScore(
    factors.reduce((sum, factor) => sum + factor.contribution, 0),
  );
  const rainLikely = isRainLikely(input.weather, warnings);
  const decision =
    evidenceScore >= W.cleanSoonMinScore
      ? rainLikely
        ? "wait_for_rain"
        : "clean_soon"
      : "monitor";
  const estimatedRecoverableKwh = roundKwh(
    recent.reduce(
      (sum, day) =>
        sum +
        Math.max(0, day.simulatedCleanBaselineKwh - day.energyGeneratedKwh),
      0,
    ),
  );
  const dataQuality = qualityFor({
    historyDays: history.length,
    recentDays: recent.length,
    olderDays: older.length,
    weather: input.weather,
  });

  if (dataQuality === "low") {
    warnings.push(
      "Limited history or weather completeness reduced dataQuality.",
    );
  }

  return CleaningAssessmentSchema.parse({
    decision,
    evidenceScore,
    dataQuality,
    estimatedRecoverableKwh,
    factors,
    assumptions,
    warnings,
  });
}

function productionFactor(
  recent: DailyMetric[],
  older: DailyMetric[],
  warnings: string[],
): CleaningFactor {
  if (recent.length < W.minRecentDays || older.length < W.minOlderDays) {
    warnings.push(
      "Recent-versus-older production comparison was skipped because the sample is too small.",
    );
    return factor(
      "production_deficit",
      0,
      "%",
      0,
      "Not enough complete days to compare the recent week with older output.",
    );
  }

  const recentKwh = sum(recent.map((day) => day.energyGeneratedKwh));
  const olderAverage =
    sum(older.map((day) => day.energyGeneratedKwh)) / older.length;
  const expectedWeekKwh = olderAverage * 7;
  const deficitPct =
    expectedWeekKwh > 0
      ? Math.max(0, ((expectedWeekKwh - recentKwh) / expectedWeekKwh) * 100)
      : 0;
  const contribution = Math.min(W.productionDeficitMax, deficitPct * 1.2);

  return factor(
    "production_deficit",
    roundScore(deficitPct),
    "%",
    contribution,
    `Recent 7-day output is ${roundScore(deficitPct).toFixed(1)}% below the older-days weekly expectation.`,
  );
}

function soilingLossFactor(recent: DailyMetric[]): CleaningFactor {
  const meanLoss =
    recent.length === 0
      ? 0
      : sum(recent.map((day) => day.soilingLossPct)) / recent.length;
  const contribution = Math.min(W.soilingLossMax, meanLoss * 0.4);

  return factor(
    "soiling_loss",
    roundScore(meanLoss),
    "%",
    contribution,
    `Mean simulated soiling loss over the recent window is ${roundScore(meanLoss).toFixed(1)}%.`,
  );
}

function soilingDurationFactor(
  history: DailyMetric[],
  asOf: string,
): CleaningFactor {
  const ended = history.filter((day) => day.date <= asOf);
  let days = 0;
  for (let index = ended.length - 1; index >= 0; index -= 1) {
    const point = ended[index];
    if (!point || point.soilingLossPct < W.soilingDurationThresholdPct) {
      break;
    }
    days += 1;
  }

  const contribution = Math.min(W.soilingDurationMax, days * 2.5);
  return factor(
    "soiling_duration",
    days,
    "days",
    contribution,
    `${String(days)} consecutive recent day(s) show simulated soiling loss of at least ${String(W.soilingDurationThresholdPct)}%.`,
  );
}

function particulateFactor(
  signal: "pm10" | "dust",
  observed: number | null,
  unit: string,
  maxContribution: number,
  scale: number,
  warnings: string[],
): CleaningFactor {
  if (observed === null) {
    warnings.push(`Missing ${signal} from the weather context.`);
    return factor(
      signal,
      0,
      unit,
      0,
      `No ${signal} reading was available, so this factor did not add evidence.`,
    );
  }

  const contribution = Math.min(maxContribution, observed / scale);
  return factor(
    signal,
    roundScore(observed),
    unit,
    contribution,
    `Mean ${signal} is ${roundScore(observed).toFixed(1)} ${unit}.`,
  );
}

function isRainLikely(weather: WeatherContext, warnings: string[]): boolean {
  const upcoming = weather.daily.slice(0, 2);
  if (upcoming.length === 0) {
    warnings.push("No precipitation forecast days were available.");
    return false;
  }

  const precip = sum(upcoming.map((day) => day.precipitationMm ?? 0));
  const probability = Math.max(
    0,
    ...upcoming.map((day) => day.precipitationProbabilityPct ?? 0),
  );

  return precip >= W.rainPrecipMm || probability >= W.rainProbabilityPct;
}

function qualityFor(input: {
  historyDays: number;
  recentDays: number;
  olderDays: number;
  weather: WeatherContext;
}): "high" | "medium" | "low" {
  const weatherComplete =
    input.weather.daily.length >= 2 &&
    input.weather.airQuality.pm10Ugm3 !== null &&
    input.weather.airQuality.dustUgm3 !== null &&
    input.weather.daily
      .slice(0, 2)
      .every((day) => day.precipitationMm !== null);

  if (
    input.historyDays < 10 ||
    input.recentDays < W.minRecentDays ||
    input.olderDays < W.minOlderDays ||
    !weatherComplete
  ) {
    return "low";
  }

  if (
    input.historyDays < 14 ||
    input.weather.daily.length < input.weather.forecastDays
  ) {
    return "medium";
  }

  return "high";
}

function factor(
  signal: string,
  observed: number,
  unit: string,
  contribution: number,
  explanation: string,
): CleaningFactor {
  return {
    signal,
    observed,
    unit,
    contribution: roundScore(contribution),
    explanation,
  };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundKwh(value: number): number {
  return Math.round(value * 1000) / 1000;
}
