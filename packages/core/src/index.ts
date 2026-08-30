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
export { assessCleaning } from "./assessment/assess.js";
export { assessDemoSite } from "./assessment/demo.js";
export { ASSESSMENT_WEIGHTS } from "./assessment/weights.js";
export { getProductionMetrics } from "./production.js";
export {
  CleaningAssessmentSchema,
  CleaningFactorSchema,
  DailyMetricSchema,
  DemoSiteSchema,
  ListDemoSitesResultSchema,
  ProductionMetricsResultSchema,
  SiteSnapshotSchema,
  ToolErrorException,
  ToolErrorSchema,
  VendorSchema,
  WeatherContextSchema,
  WeatherDailySchema,
  type CleaningAssessment,
  type CleaningFactor,
  type DailyMetric,
  type DemoSite,
  type ListDemoSitesResult,
  type ProductionMetricsResult,
  type SiteSnapshot,
  type ToolError,
  type Vendor,
  type WeatherContext,
} from "./schemas.js";
export { listDemoSites, getDemoSite } from "./sites.js";
export {
  DEFAULT_AS_OF,
  generateRawPayload,
  type GeneratedRawPayload,
} from "./simulator/generate.js";
export { normalizeGenerated } from "./simulator/normalize.js";
export { OPEN_METEO_ATTRIBUTION } from "./weather/attribution.js";
export { getWeatherForSite } from "./weather/get.js";
export { createOpenMeteoClient } from "./weather/open-meteo.js";
export type { WeatherProvider } from "./weather/provider.js";
