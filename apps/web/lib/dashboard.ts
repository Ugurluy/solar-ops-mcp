import {
  ToolErrorException,
  assessDemoSite,
  createOpenMeteoClient,
  getDemoSite,
  getProductionMetrics,
  getWeatherForSite,
  listDemoSites,
  type CleaningAssessment,
  type DailyMetric,
  type DemoSite,
  type SiteSnapshot,
  type WeatherContext,
} from "@pv-ops/core";

import { noStoreFetch } from "./no-store-fetch";

export const DEMO_END_DATE = "2026-08-26";
export const OVERVIEW_START_DATE = "2026-08-20";
export const DETAIL_START_DATE = "2026-08-13";

const weather = createOpenMeteoClient({ fetch: noStoreFetch });

export type OverviewCard = {
  site: DemoSite;
  snapshot: SiteSnapshot;
  assessment: CleaningAssessment | undefined;
  loadError: string | undefined;
};

export type SiteDetail = {
  site: DemoSite;
  snapshot: SiteSnapshot;
  days: DailyMetric[];
  assessment: CleaningAssessment | undefined;
  weather: WeatherContext | undefined;
  loadError: string | undefined;
};

export function loadOverviewCards(): Promise<OverviewCard[]> {
  return Promise.all(
    listDemoSites().sites.map(async (site) => {
      const metrics = getProductionMetrics({
        siteId: site.siteId,
        startDate: OVERVIEW_START_DATE,
        endDate: DEMO_END_DATE,
      });

      try {
        const { assessment } = await assessDemoSite(site.siteId, weather);
        return {
          site,
          snapshot: metrics.snapshot,
          assessment,
          loadError: undefined,
        };
      } catch (error) {
        return {
          site,
          snapshot: metrics.snapshot,
          assessment: undefined,
          loadError: toLoadError(error),
        };
      }
    }),
  );
}

export async function loadSiteDetail(
  siteId: string,
): Promise<SiteDetail | undefined> {
  try {
    getDemoSite(siteId);
  } catch {
    return undefined;
  }

  const metrics = getProductionMetrics({
    siteId,
    startDate: DETAIL_START_DATE,
    endDate: DEMO_END_DATE,
    detail: "normalization_trace",
  });

  try {
    const [{ assessment }, weatherContext] = await Promise.all([
      assessDemoSite(siteId, weather),
      getWeatherForSite(weather, siteId, 7),
    ]);
    return {
      site: getDemoSite(siteId),
      snapshot: metrics.snapshot,
      days: metrics.days,
      assessment,
      weather: weatherContext,
      loadError: undefined,
    };
  } catch (error) {
    return {
      site: getDemoSite(siteId),
      snapshot: metrics.snapshot,
      days: metrics.days,
      assessment: undefined,
      weather: undefined,
      loadError: toLoadError(error),
    };
  }
}

function toLoadError(error: unknown): string {
  if (error instanceof ToolErrorException) {
    return error.envelope.error.message;
  }

  return error instanceof Error ? error.message : "Unable to load live weather.";
}
