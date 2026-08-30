import { z } from "zod";

export const VendorSchema = z.enum([
  "solaredge",
  "fronius",
  "enphase",
  "huawei",
]);

export const DemoSiteSchema = z
  .object({
    siteId: z.string().min(1),
    name: z.string().min(1),
    vendor: VendorSchema,
    location: z.object({
      city: z.string().min(1),
      region: z.string().min(1),
      countryCode: z.string().length(2),
    }),
    capacityKw: z.number().positive(),
    activeScenario: z.enum(["baseline", "soiled", "recovering", "dusty"]),
    dataSource: z.literal("synthetic"),
  })
  .strict();

export const ListDemoSitesResultSchema = z
  .object({
    sites: z.array(DemoSiteSchema),
    dataSource: z.literal("synthetic"),
    disclaimer: z.string().min(1),
  })
  .strict();

export const DailyMetricSchema = z
  .object({
    date: z.iso.date(),
    energyGeneratedKwh: z.number().nonnegative(),
    simulatedCleanBaselineKwh: z.number().nonnegative(),
    yieldRatioPct: z.number().nonnegative(),
    soilingLossPct: z.number().min(0).max(100),
    dataSource: z.literal("synthetic"),
  })
  .strict();

export const SiteSnapshotSchema = z
  .object({
    siteId: z.string().min(1),
    vendor: VendorSchema,
    observedAt: z.iso.datetime(),
    capacityKw: z.number().positive(),
    currentPowerW: z.number().nonnegative(),
    energyTodayKwh: z.number().nonnegative(),
    capacityUtilizationPct: z.number().nonnegative(),
  })
  .strict();

export const WeatherDailySchema = z
  .object({
    date: z.iso.date(),
    precipitationMm: z.number().nonnegative().nullable(),
    precipitationProbabilityPct: z.number().min(0).max(100).nullable(),
    shortwaveRadiationMj: z.number().nonnegative().nullable(),
  })
  .strict();

export const WeatherContextSchema = z
  .object({
    siteId: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
    forecastDays: z.number().int().min(1).max(7),
    daily: z.array(WeatherDailySchema),
    airQuality: z
      .object({
        pm10Ugm3: z.number().nonnegative().nullable(),
        dustUgm3: z.number().nonnegative().nullable(),
      })
      .strict(),
    source: z.literal("open-meteo"),
    attribution: z.string().min(1),
    fetchedAt: z.iso.datetime(),
  })
  .strict();

export const CleaningFactorSchema = z
  .object({
    signal: z.string().min(1),
    observed: z.number(),
    unit: z.string().min(1),
    contribution: z.number(),
    explanation: z.string().min(1),
  })
  .strict();

export const CleaningAssessmentSchema = z
  .object({
    decision: z.enum(["clean_soon", "wait_for_rain", "monitor"]),
    evidenceScore: z.number().min(0).max(100),
    dataQuality: z.enum(["high", "medium", "low"]),
    estimatedRecoverableKwh: z.number().nonnegative(),
    factors: z.array(CleaningFactorSchema),
    assumptions: z.array(z.string()),
    warnings: z.array(z.string()),
  })
  .strict();

export const NormalizationTraceEntrySchema = z
  .object({
    rawField: z.string().min(1),
    canonicalField: z.string().min(1),
    unitConversion: z.string().min(1),
  })
  .strict();

export const ProductionMetricsResultSchema = z
  .object({
    siteId: z.string().min(1),
    vendor: VendorSchema,
    snapshot: SiteSnapshotSchema,
    days: z.array(DailyMetricSchema),
    units: z
      .object({
        energy: z.literal("kWh"),
        power: z.literal("W"),
        capacity: z.literal("kW"),
      })
      .strict(),
    dataSource: z.literal("synthetic"),
    assumptions: z.array(z.string()),
    detail: z.enum(["summary", "normalization_trace"]),
    normalizationTrace: z.array(NormalizationTraceEntrySchema).optional(),
  })
  .strict();

export const ToolErrorSchema = z
  .object({
    error: z
      .object({
        code: z.enum([
          "UNKNOWN_SITE",
          "INVALID_DATE_RANGE",
          "RANGE_TOO_LONG",
          "INVALID_FORECAST_HORIZON",
          "WEATHER_UNAVAILABLE",
          "INTERNAL",
        ]),
        message: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export type Vendor = z.infer<typeof VendorSchema>;
export type DemoSite = z.infer<typeof DemoSiteSchema>;
export type ListDemoSitesResult = z.infer<typeof ListDemoSitesResultSchema>;
export type DailyMetric = z.infer<typeof DailyMetricSchema>;
export type SiteSnapshot = z.infer<typeof SiteSnapshotSchema>;
export type WeatherContext = z.infer<typeof WeatherContextSchema>;
export type CleaningAssessment = z.infer<typeof CleaningAssessmentSchema>;
export type CleaningFactor = z.infer<typeof CleaningFactorSchema>;
export type ProductionMetricsResult = z.infer<
  typeof ProductionMetricsResultSchema
>;
export type ToolError = z.infer<typeof ToolErrorSchema>;
export class ToolErrorException extends Error {
  readonly envelope: ToolError;

  constructor(code: ToolError["error"]["code"], message: string) {
    super(message);
    this.name = "ToolErrorException";
    this.envelope = ToolErrorSchema.parse({ error: { code, message } });
  }
}
