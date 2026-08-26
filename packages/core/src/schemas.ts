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

export type Vendor = z.infer<typeof VendorSchema>;
export type DemoSite = z.infer<typeof DemoSiteSchema>;
export type ListDemoSitesResult = z.infer<typeof ListDemoSitesResultSchema>;
export type DailyMetric = z.infer<typeof DailyMetricSchema>;
export type SiteSnapshot = z.infer<typeof SiteSnapshotSchema>;
