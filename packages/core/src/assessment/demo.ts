import type { CleaningAssessment, DailyMetric } from "../schemas.js";
import { generateRawPayload } from "../simulator/generate.js";
import { normalizeGenerated } from "../simulator/normalize.js";
import { getWeatherForSite } from "../weather/get.js";
import type { WeatherProvider } from "../weather/provider.js";
import { assessCleaning } from "./assess.js";

export async function assessDemoSite(
  siteId: string,
  weather: WeatherProvider,
  options?: { asOf?: string; forecastDays?: number },
): Promise<{
  history: DailyMetric[];
  assessment: CleaningAssessment;
}> {
  const generated =
    options?.asOf === undefined
      ? generateRawPayload(siteId)
      : generateRawPayload(siteId, options.asOf);
  const { history } = normalizeGenerated(generated);
  const weatherContext = await getWeatherForSite(
    weather,
    siteId,
    options?.forecastDays ?? 7,
  );
  const assessment = assessCleaning({
    history,
    weather: weatherContext,
    ...(options?.asOf === undefined ? {} : { asOf: options.asOf }),
  });

  return { history, assessment };
}
