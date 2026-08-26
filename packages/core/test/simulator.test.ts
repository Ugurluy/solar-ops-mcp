import { describe, expect, it } from "vitest";

import {
  DailyMetricSchema,
  SiteSnapshotSchema,
  generateRawPayload,
  listDemoSites,
  normalizeGenerated,
} from "../src/index.js";

describe("seeded raw payload generators", () => {
  it("lists four fictional sites with distinct vendors", () => {
    const sites = listDemoSites().sites;

    expect(sites).toHaveLength(4);
    expect(sites.map((site) => site.vendor).sort()).toEqual([
      "enphase",
      "fronius",
      "huawei",
      "solaredge",
    ]);
  });

  it("is deterministic for the same site and timestamp", () => {
    const first = generateRawPayload("demo-sunridge-az");
    const second = generateRawPayload("demo-sunridge-az");

    expect(first).toEqual(second);
  });

  it("emits four distinct vendor payload shapes", () => {
    const payloads = listDemoSites().sites.map((site) =>
      generateRawPayload(site.siteId),
    );

    expect(payloads[0]?.raw).toHaveProperty("overview.currentPower.power");
    expect(payloads[1]?.raw).toHaveProperty("flowdata.data.channels");
    expect(payloads[2]?.raw).toHaveProperty("current_power");
    expect(payloads[3]?.raw).toHaveProperty("dataItemMap.day_power");
  });

  it("normalizes every generated payload into the same canonical model", () => {
    const normalized = listDemoSites().sites.map((site) => {
      const payload = generateRawPayload(site.siteId);
      const result = normalizeGenerated(payload);
      return {
        vendor: site.vendor,
        snapshot: SiteSnapshotSchema.parse(result.snapshot),
        history: result.history.map((day) => DailyMetricSchema.parse(day)),
      };
    });

    for (const item of normalized) {
      expect(item.snapshot.vendor).toBe(item.vendor);
      expect(item.history).toHaveLength(14);
      expect(item.history[0]?.dataSource).toBe("synthetic");
    }

    const canonicalKeys = normalized.map((item) =>
      Object.keys(item.snapshot).sort().join(","),
    );
    expect(new Set(canonicalKeys).size).toBe(1);
  });
});
