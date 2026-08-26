import { describe, expect, it } from "vitest";

import { enphaseAdapter } from "../src/adapters/enphase.js";
import { froniusAdapter } from "../src/adapters/fronius.js";
import { huaweiAdapter } from "../src/adapters/huawei.js";
import { solarEdgeAdapter } from "../src/adapters/solaredge.js";

describe("vendor field and unit mappings", () => {
  it("maps SolarEdge Wh energy and W power into kWh and utilization", () => {
    const snapshot = solarEdgeAdapter.normalizeSnapshot({
      siteId: "demo-sunridge-az",
      details: { peakPower: 10 },
      overview: {
        lastUpdateTime: "2026-08-26T12:00:00.000Z",
        currentPower: { power: 2500 },
      },
      energy: { values: [{ date: "2026-08-26 00:00:00", value: 12500 }] },
    });

    expect(snapshot.currentPowerW).toBe(2500);
    expect(snapshot.energyTodayKwh).toBe(12.5);
    expect(snapshot.capacityUtilizationPct).toBe(25);
    expect(snapshot.vendor).toBe("solaredge");
  });

  it("prefers Fronius PowerPV and EnergyProductionTotal channels", () => {
    const snapshot = froniusAdapter.normalizeSnapshot({
      siteId: "demo-fronius",
      peakPower: 8,
      flowdata: {
        data: {
          channels: [
            { channelName: "PowerOutput", value: 100 },
            { channelName: "PowerPV", value: 4000 },
          ],
        },
      },
      aggrdata: {
        data: [
          {
            logDateTime: "2026-08-26T12:00:00.000Z",
            channels: [
              { channelName: "EnergyOutput", value: 1000 },
              { channelName: "EnergyProductionTotal", value: 8000 },
            ],
          },
        ],
      },
    });

    expect(snapshot.currentPowerW).toBe(4000);
    expect(snapshot.energyTodayKwh).toBe(8);
    expect(snapshot.capacityUtilizationPct).toBe(50);
  });

  it("converts Enphase capacity W and energy Wh", () => {
    const snapshot = enphaseAdapter.normalizeSnapshot({
      siteId: "demo-enphase",
      current_power: 1500,
      energy_today: 9000,
      size_w: 6000,
      last_report_at: 1_724_673_600,
    });

    expect(snapshot.capacityKw).toBe(6);
    expect(snapshot.energyTodayKwh).toBe(9);
    expect(snapshot.capacityUtilizationPct).toBe(25);
  });

  it("parses Huawei string kWh energy and kW inverter power", () => {
    const snapshot = huaweiAdapter.normalizeSnapshot({
      siteId: "demo-huawei",
      observedAt: "2026-08-26T12:00:00.000Z",
      capacity: 12,
      dataItemMap: { day_power: "18.4" },
      inverter: { dataItemMap: { active_power: "3.6" } },
    });

    expect(snapshot.energyTodayKwh).toBe(18.4);
    expect(snapshot.currentPowerW).toBe(3600);
    expect(snapshot.capacityUtilizationPct).toBe(30);
  });

  it("rejects missing SolarEdge power", () => {
    expect(() =>
      solarEdgeAdapter.normalizeSnapshot({
        siteId: "demo-sunridge-az",
        details: { peakPower: 10 },
        overview: { lastUpdateTime: "2026-08-26T12:00:00.000Z" },
        energy: { values: [{ date: "2026-08-26", value: 1000 }] },
      }),
    ).toThrow(/overview.currentPower.power/);
  });

  it("rejects malformed Huawei energy", () => {
    expect(() =>
      huaweiAdapter.normalizeSnapshot({
        siteId: "demo-huawei",
        observedAt: "2026-08-26T12:00:00.000Z",
        capacity: 12,
        dataItemMap: { day_power: "not-a-number" },
        inverter: { dataItemMap: { active_power: 1 } },
      }),
    ).toThrow(/day_power/);
  });

  it("maps Enphase lifetime production array from start_date", () => {
    const history = enphaseAdapter.normalizeHistory({
      siteId: "demo-enphase",
      start_date: "2026-08-24",
      production: [4000, 5000],
    });

    expect(history).toEqual([
      expect.objectContaining({
        date: "2026-08-24",
        energyGeneratedKwh: 4,
      }),
      expect.objectContaining({
        date: "2026-08-25",
        energyGeneratedKwh: 5,
      }),
    ]);
  });
});
