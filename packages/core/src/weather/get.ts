import { ToolErrorException, type WeatherContext } from "../schemas.js";
import { getDemoSite } from "../sites.js";
import type { WeatherProvider } from "./provider.js";

export async function getWeatherForSite(
  provider: WeatherProvider,
  siteId: string,
  forecastDays = 7,
): Promise<WeatherContext> {
  getDemoSite(siteId);

  if (forecastDays < 1 || forecastDays > 7) {
    throw new ToolErrorException(
      "INVALID_FORECAST_HORIZON",
      "Forecast horizon must be between 1 and 7 days.",
    );
  }

  try {
    return await provider.getWeatherContext(siteId, forecastDays);
  } catch (error) {
    if (error instanceof ToolErrorException) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Weather lookup failed.";
    throw new ToolErrorException("WEATHER_UNAVAILABLE", message);
  }
}
