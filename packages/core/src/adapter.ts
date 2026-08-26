import type { DailyMetric, SiteSnapshot, Vendor } from "./schemas.js";

export type VendorAdapter<TRaw> = {
  readonly vendor: Vendor;
  normalizeSnapshot(raw: TRaw): SiteSnapshot;
  normalizeHistory(raw: TRaw): DailyMetric[];
};
