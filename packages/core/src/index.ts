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
    activeScenario: z.string().min(1),
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

export type Vendor = z.infer<typeof VendorSchema>;
export type DemoSite = z.infer<typeof DemoSiteSchema>;
export type ListDemoSitesResult = z.infer<typeof ListDemoSitesResultSchema>;

const demoSites = DemoSiteSchema.array().parse([
  {
    siteId: "demo-sunridge-az",
    name: "Sunridge Demo Site",
    vendor: "solaredge",
    location: {
      city: "Phoenix",
      region: "Arizona",
      countryCode: "US",
    },
    capacityKw: 12.4,
    activeScenario: "baseline",
    dataSource: "synthetic",
  },
]);

export function listDemoSites(): ListDemoSitesResult {
  return ListDemoSitesResultSchema.parse({
    sites: demoSites,
    dataSource: "synthetic",
    disclaimer: "Fictional demonstration data; not operational advice.",
  });
}
