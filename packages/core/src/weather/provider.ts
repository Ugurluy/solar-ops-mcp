import type { WeatherContext } from "../schemas.js";

export type WeatherProvider = {
  getWeatherContext(
    siteId: string,
    forecastDays?: number,
  ): Promise<WeatherContext>;
};
