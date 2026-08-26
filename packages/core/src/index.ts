export type { VendorAdapter } from "./adapter.js";
export {
  enphaseAdapter,
  froniusAdapter,
  huaweiAdapter,
  solarEdgeAdapter,
  type EnphaseRaw,
  type FroniusRaw,
  type HuaweiRaw,
  type SolarEdgeRaw,
} from "./adapters/index.js";
export {
  DailyMetricSchema,
  DemoSiteSchema,
  ListDemoSitesResultSchema,
  SiteSnapshotSchema,
  VendorSchema,
  type DailyMetric,
  type DemoSite,
  type ListDemoSitesResult,
  type SiteSnapshot,
  type Vendor,
} from "./schemas.js";
export { listDemoSites, getDemoSite } from "./sites.js";
export {
  DEFAULT_AS_OF,
  generateRawPayload,
  type GeneratedRawPayload,
} from "./simulator/generate.js";
export { normalizeGenerated } from "./simulator/normalize.js";
