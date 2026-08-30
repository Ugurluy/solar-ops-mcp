import type { McpServer } from "@modelcontextprotocol/server";
import {
  CleaningAssessmentSchema,
  ListDemoSitesResultSchema,
  ProductionMetricsResultSchema,
  ToolErrorException,
  ToolErrorSchema,
  WeatherContextSchema,
  assessDemoSite,
  createOpenMeteoClient,
  getProductionMetrics,
  getWeatherForSite,
  listDemoSites,
  type WeatherProvider,
} from "@pv-ops/core";
import { z } from "zod";

import { METHODOLOGY_TEXT, METHODOLOGY_URI } from "./methodology.js";

export { METHODOLOGY_URI } from "./methodology.js";

export const SERVER_INFO = {
  name: "pv-ops-mcp",
  version: "0.0.0",
} as const;

const READ_ONLY = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export type RegisterPvOpsOptions = {
  weather?: WeatherProvider;
};

export function registerPvOpsTools(
  server: McpServer,
  options: RegisterPvOpsOptions = {},
): void {
  const weather = options.weather ?? createOpenMeteoClient();

  server.registerTool(
    "list_demo_sites",
    {
      title: "List demo solar sites",
      description:
        "Lists fictional solar sites available for PV operations demonstrations.",
      inputSchema: z.object({}).strict(),
      outputSchema: ListDemoSitesResultSchema,
      annotations: READ_ONLY,
    },
    () => {
      const result = listDemoSites();
      return success(
        result.sites
          .map(
            (site) =>
              `${site.name} (${site.siteId}) — ${String(site.capacityKw)} kW, ${site.location.city}, ${site.location.region} [${site.activeScenario}]`,
          )
          .join("\n"),
        result,
      );
    },
  );

  server.registerTool(
    "get_production_metrics",
    {
      title: "Get production metrics",
      description:
        "Returns normalized synthetic daily production for a demo site. Maximum 30 days.",
      inputSchema: z
        .object({
          siteId: z.string().min(1),
          startDate: z.iso.date(),
          endDate: z.iso.date(),
          detail: z.enum(["summary", "normalization_trace"]).optional(),
        })
        .strict(),
      outputSchema: z.union([
        ProductionMetricsResultSchema,
        ToolErrorSchema,
      ]),
      annotations: READ_ONLY,
    },
    (input) => {
      try {
        const result = getProductionMetrics({
          siteId: input.siteId,
          startDate: input.startDate,
          endDate: input.endDate,
          ...(input.detail === undefined ? {} : { detail: input.detail }),
        });
        const lines = result.days
          .map(
            (day) =>
              `${day.date}: ${String(day.energyGeneratedKwh)} kWh generated vs ${String(day.simulatedCleanBaselineKwh)} kWh simulated clean baseline`,
          )
          .join("\n");
        return success(
          `${result.snapshot.vendor} ${result.siteId}\n${lines}`,
          result,
        );
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "get_weather_context",
    {
      title: "Get weather context",
      description:
        "Returns Open-Meteo precipitation, radiation, PM10, and dust for a demo site ID only.",
      inputSchema: z
        .object({
          siteId: z.string().min(1),
          forecastDays: z.number().int().min(1).max(7).optional(),
        })
        .strict(),
      outputSchema: z.union([WeatherContextSchema, ToolErrorSchema]),
      annotations: READ_ONLY,
    },
    async (input) => {
      try {
        const result = await getWeatherForSite(
          weather,
          input.siteId,
          input.forecastDays ?? 7,
        );
        return success(
          `${result.siteId}: PM10 ${String(result.airQuality.pm10Ugm3)} µg/m³, dust ${String(result.airQuality.dustUgm3)} µg/m³. ${result.attribution}`,
          result,
        );
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "get_cleaning_recommendation",
    {
      title: "Get cleaning recommendation",
      description:
        "Combines synthetic production and weather context into an explainable cleaning assessment.",
      inputSchema: z
        .object({
          siteId: z.string().min(1),
          detail: z.enum(["summary", "full"]).optional(),
        })
        .strict(),
      outputSchema: z.union([CleaningAssessmentSchema, ToolErrorSchema]),
      annotations: READ_ONLY,
    },
    async (input) => {
      try {
        const { assessment } = await assessDemoSite(input.siteId, weather);
        const detail = input.detail ?? "summary";
        const factorLines =
          detail === "full"
            ? assessment.factors
                .map(
                  (factor) =>
                    `${factor.signal}: ${String(factor.observed)} ${factor.unit} (contribution ${String(factor.contribution)}) — ${factor.explanation}`,
                )
                .join("\n")
            : assessment.factors
                .map((factor) => `${factor.signal}: ${factor.explanation}`)
                .join("\n");
        return success(
          `Decision: ${assessment.decision}. Evidence score ${String(assessment.evidenceScore)} (${assessment.dataQuality} data quality).\n${factorLines}`,
          assessment,
        );
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerResource(
    "methodology",
    METHODOLOGY_URI,
    {
      title: "PV Ops methodology",
      description:
        "Simulation assumptions, units, limitations, and recommendation weights.",
      mimeType: "text/markdown",
    },
    (uri) => ({
      contents: [{ uri: uri.href, text: METHODOLOGY_TEXT, mimeType: "text/markdown" }],
    }),
  );
}

function success(text: string, structuredContent: unknown) {
  return {
    content: [{ type: "text" as const, text }],
    structuredContent,
  };
}

function failure(error: unknown) {
  const envelope =
    error instanceof ToolErrorException
      ? error.envelope
      : ToolErrorSchema.parse({
          error: {
            code: "INTERNAL",
            message: error instanceof Error ? error.message : "Unexpected error.",
          },
        });

  return {
    isError: true,
    content: [{ type: "text" as const, text: envelope.error.message }],
    structuredContent: envelope,
  };
}
