import { describe, expect, it } from "vitest";

import { assessCleaning } from "../src/assessment/assess.js";
import { ASSESSMENT_WEIGHTS } from "../src/assessment/weights.js";
import { daysFrom, metric, weatherFixture } from "./fixtures.js";

const older = daysFrom("2026-08-13", 7, {
  energyGeneratedKwh: 10,
  simulatedCleanBaselineKwh: 10,
});

describe("assessCleaning", () => {
  it("recommends clean_soon for a high deficit and no rain", () => {
    const recent = daysFrom("2026-08-20", 7, {
      energyGeneratedKwh: 6,
      simulatedCleanBaselineKwh: 10,
    });
    const result = assessCleaning({
      history: [...older, ...recent],
      weather: weatherFixture({
        airQuality: { pm10Ugm3: 150, dustUgm3: 80 },
      }),
      asOf: "2026-08-26",
    });

    expect(result.decision).toBe("clean_soon");
    expect(result.evidenceScore).toBeGreaterThanOrEqual(
      ASSESSMENT_WEIGHTS.cleanSoonMinScore,
    );
    expect(result.dataQuality).toBe("high");
  });

  it("defers a clean_soon decision when rain is likely", () => {
    const recent = daysFrom("2026-08-20", 7, {
      energyGeneratedKwh: 6,
      simulatedCleanBaselineKwh: 10,
    });
    const result = assessCleaning({
      history: [...older, ...recent],
      weather: weatherFixture({
        airQuality: { pm10Ugm3: 150, dustUgm3: 80 },
        daily: [
          {
            date: "2026-08-26",
            precipitationMm: 3,
            precipitationProbabilityPct: 80,
            shortwaveRadiationMj: 8,
          },
          {
            date: "2026-08-27",
            precipitationMm: 2,
            precipitationProbabilityPct: 70,
            shortwaveRadiationMj: 9,
          },
        ],
      }),
      asOf: "2026-08-26",
    });

    expect(result.decision).toBe("wait_for_rain");
  });

  it("monitors a healthy site", () => {
    const recent = daysFrom("2026-08-20", 7, {
      energyGeneratedKwh: 10,
      simulatedCleanBaselineKwh: 10,
    });
    const result = assessCleaning({
      history: [...older, ...recent],
      weather: weatherFixture(),
      asOf: "2026-08-26",
    });

    expect(result.decision).toBe("monitor");
    expect(result.dataQuality).toBe("high");
  });

  it("marks missing history and weather as low dataQuality", () => {
    const result = assessCleaning({
      history: [
        metric({
          date: "2026-08-26",
          energyGeneratedKwh: 8,
          simulatedCleanBaselineKwh: 10,
        }),
      ],
      weather: weatherFixture({
        daily: [],
        airQuality: { pm10Ugm3: null, dustUgm3: null },
      }),
      asOf: "2026-08-26",
    });

    expect(result.dataQuality).toBe("low");
    expect(result.decision).toBe("monitor");
  });
});
