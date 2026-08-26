import { describe, expect, it } from "vitest";

import type { VendorAdapter } from "../src/adapter.js";
import {
  DailyMetricSchema,
  SiteSnapshotSchema,
  type DailyMetric,
  type SiteSnapshot,
} from "../src/schemas.js";

const snapshot = {
  siteId: "demo-sunridge-az",
  vendor: "solaredge",
  observedAt: "2026-08-26T12:00:00.000Z",
  capacityKw: 12.4,
  currentPowerW: 6200,
  energyTodayKwh: 18.5,
  capacityUtilizationPct: 50,
} as const;

const metric = {
  date: "2026-08-25",
  energyGeneratedKwh: 42,
  simulatedCleanBaselineKwh: 48,
  yieldRatioPct: 87.5,
  soilingLossPct: 12.5,
  dataSource: "synthetic",
} as const;

describe("canonical schemas", () => {
  it("accepts a valid site snapshot", () => {
    expect(SiteSnapshotSchema.parse(snapshot)).toEqual(snapshot);
  });

  it("accepts a valid daily metric", () => {
    expect(DailyMetricSchema.parse(metric)).toEqual(metric);
  });

  it("rejects a snapshot missing currentPowerW", () => {
    expect(() =>
      SiteSnapshotSchema.parse({
        siteId: snapshot.siteId,
        vendor: snapshot.vendor,
        observedAt: snapshot.observedAt,
        capacityKw: snapshot.capacityKw,
        energyTodayKwh: snapshot.energyTodayKwh,
        capacityUtilizationPct: snapshot.capacityUtilizationPct,
      }),
    ).toThrow();
  });
});

describe("VendorAdapter", () => {
  it("describes snapshot and history normalization only", () => {
    const adapter: VendorAdapter<{ powerW: number }> = {
      vendor: "solaredge",
      normalizeSnapshot: (raw): SiteSnapshot =>
        SiteSnapshotSchema.parse({
          ...snapshot,
          currentPowerW: raw.powerW,
        }),
      normalizeHistory: (): DailyMetric[] => [DailyMetricSchema.parse(metric)],
    };

    expect(adapter.vendor).toBe("solaredge");
    expect(adapter.normalizeSnapshot({ powerW: 1000 }).currentPowerW).toBe(
      1000,
    );
    expect(adapter.normalizeHistory({ powerW: 0 })).toHaveLength(1);
  });
});
