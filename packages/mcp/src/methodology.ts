import { ASSESSMENT_WEIGHTS, OPEN_METEO_ATTRIBUTION } from "@pv-ops/core";

export const METHODOLOGY_URI = "pvops://methodology";

export const METHODOLOGY_TEXT = `# PV Ops methodology

This server uses **synthetic** demo sites. It is not operational advice and not a live vendor integration.

## Units

- Power: watts (W)
- Energy: kilowatt-hours (kWh)
- Capacity: kilowatts (kW)
- \`capacityUtilizationPct\`: instantaneous power ÷ nameplate capacity. This is not weather-adjusted efficiency.

## Simulation

Four fictional sites emit vendor-shaped JSON (SolarEdge, Fronius, Enphase, Huawei). Adapters convert those payloads into one canonical model. Daily clean-baseline kWh is a seeded scenario estimate.

## Cleaning assessment weights

These weights are original to this portfolio project.

- Production deficit (recent 7 days vs older days): max ${String(ASSESSMENT_WEIGHTS.productionDeficitMax)}
- Simulated soiling loss: max ${String(ASSESSMENT_WEIGHTS.soilingLossMax)}
- Soiling duration: max ${String(ASSESSMENT_WEIGHTS.soilingDurationMax)}
- PM10: max ${String(ASSESSMENT_WEIGHTS.pm10Max)}
- Dust: max ${String(ASSESSMENT_WEIGHTS.dustMax)}
- \`clean_soon\` when evidenceScore ≥ ${String(ASSESSMENT_WEIGHTS.cleanSoonMinScore)}, unless upcoming rain defers to \`wait_for_rain\`
- Rain deferral: next two days ≥ ${String(ASSESSMENT_WEIGHTS.rainPrecipMm)} mm or probability ≥ ${String(ASSESSMENT_WEIGHTS.rainProbabilityPct)}%

\`evidenceScore\` is cleaning-evidence strength, not model accuracy. \`dataQuality\` reflects completeness, not confidence.

## Weather

Lookups are limited to the four demo site IDs. Coordinates are rounded. ${OPEN_METEO_ATTRIBUTION}
`;
