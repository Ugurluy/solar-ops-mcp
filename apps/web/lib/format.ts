import type { CleaningAssessment, Vendor } from "@pv-ops/core";

const VENDOR_LABELS: Record<Vendor, string> = {
  solaredge: "SolarEdge",
  fronius: "Fronius",
  enphase: "Enphase",
  huawei: "Huawei",
};

const DECISION_LABELS: Record<CleaningAssessment["decision"], string> = {
  clean_soon: "Clean soon",
  wait_for_rain: "Wait for rain",
  monitor: "Monitor",
};

const SCENARIO_LABELS = {
  baseline: "Baseline",
  soiled: "Soiled",
  recovering: "Recovering",
  dusty: "Dusty",
} as const;

export function formatVendor(vendor: Vendor): string {
  return VENDOR_LABELS[vendor];
}

export function formatDecision(
  decision: CleaningAssessment["decision"],
): string {
  return DECISION_LABELS[decision];
}

export function formatScenario(
  scenario: keyof typeof SCENARIO_LABELS,
): string {
  return SCENARIO_LABELS[scenario];
}

export function formatNumber(value: number, digits = 1): string {
  return value.toFixed(digits);
}
