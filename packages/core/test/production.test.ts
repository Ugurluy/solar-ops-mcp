import { describe, expect, it } from "vitest";

import { getProductionMetrics } from "../src/production.js";
import { ToolErrorException } from "../src/schemas.js";

describe("getProductionMetrics", () => {
  it("returns normalized days for a valid range", () => {
    const result = getProductionMetrics({
      siteId: "demo-sunridge-az",
      startDate: "2026-08-20",
      endDate: "2026-08-26",
      detail: "normalization_trace",
    });

    expect(result.days).toHaveLength(7);
    expect(result.dataSource).toBe("synthetic");
    expect(result.normalizationTrace?.[0]?.canonicalField).toBe("currentPowerW");
  });

  it("rejects a range longer than 30 days", () => {
    expect(() =>
      getProductionMetrics({
        siteId: "demo-sunridge-az",
        startDate: "2026-07-01",
        endDate: "2026-08-26",
      }),
    ).toThrow(ToolErrorException);
  });

  it("rejects an unknown site", () => {
    expect(() =>
      getProductionMetrics({
        siteId: "not-a-site",
        startDate: "2026-08-20",
        endDate: "2026-08-26",
      }),
    ).toThrow(/Unknown demo site/);
  });
});
