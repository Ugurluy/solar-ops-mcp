import {
  enphaseAdapter,
  froniusAdapter,
  huaweiAdapter,
  solarEdgeAdapter,
} from "../adapters/index.js";
import type { DailyMetric, SiteSnapshot } from "../schemas.js";
import type { GeneratedRawPayload } from "./generate.js";

export function normalizeGenerated(payload: GeneratedRawPayload): {
  snapshot: SiteSnapshot;
  history: DailyMetric[];
} {
  switch (payload.vendor) {
    case "solaredge":
      return {
        snapshot: solarEdgeAdapter.normalizeSnapshot(payload.raw),
        history: solarEdgeAdapter.normalizeHistory(payload.raw),
      };
    case "fronius":
      return {
        snapshot: froniusAdapter.normalizeSnapshot(payload.raw),
        history: froniusAdapter.normalizeHistory(payload.raw),
      };
    case "enphase":
      return {
        snapshot: enphaseAdapter.normalizeSnapshot(payload.raw),
        history: enphaseAdapter.normalizeHistory(payload.raw),
      };
    case "huawei":
      return {
        snapshot: huaweiAdapter.normalizeSnapshot(payload.raw),
        history: huaweiAdapter.normalizeHistory(payload.raw),
      };
  }
}
