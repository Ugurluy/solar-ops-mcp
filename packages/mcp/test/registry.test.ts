import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { McpServer } from "@modelcontextprotocol/server";
import { CleaningAssessmentSchema, type WeatherProvider } from "@pv-ops/core";
import { afterEach, describe, expect, it } from "vitest";

import {
  METHODOLOGY_URI,
  registerPvOpsTools,
  SERVER_INFO,
} from "../src/index.js";

const closeCallbacks: Array<() => Promise<void>> = [];

const fixtureWeather: WeatherProvider = {
  getWeatherContext: (siteId, forecastDays = 7) =>
    Promise.resolve({
      siteId,
      latitude: 33.45,
      longitude: -112.07,
      forecastDays,
      daily: Array.from({ length: forecastDays }, (_, index) => {
        const date = new Date("2026-08-26T00:00:00.000Z");
        date.setUTCDate(date.getUTCDate() + index);
        return {
          date: date.toISOString().slice(0, 10),
          precipitationMm: 0,
          precipitationProbabilityPct: 5,
          shortwaveRadiationMj: 22,
        };
      }),
      airQuality: { pm10Ugm3: 18, dustUgm3: 6 },
      source: "open-meteo",
      attribution: "test fixture",
      fetchedAt: "2026-08-26T18:00:00.000Z",
    }),
};

afterEach(async () => {
  await Promise.all(closeCallbacks.splice(0).map(async (close) => close()));
});

async function connectClient() {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const server = new McpServer(SERVER_INFO);
  const client = new Client({ name: "registry-test", version: "0.0.0" });
  registerPvOpsTools(server, { weather: fixtureWeather });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  closeCallbacks.push(
    async () => client.close(),
    async () => server.close(),
  );
  return client;
}

describe("PV Ops MCP registry", () => {
  it("discovers four tools and the methodology resource", async () => {
    const client = await connectClient();
    const tools = await client.listTools();
    const resources = await client.listResources();

    expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
      "get_cleaning_recommendation",
      "get_production_metrics",
      "get_weather_context",
      "list_demo_sites",
    ]);
    expect(resources.resources.map((resource) => resource.uri)).toContain(
      METHODOLOGY_URI,
    );
  });

  it("lists demo sites", async () => {
    const client = await connectClient();
    const result = await client.callTool({
      name: "list_demo_sites",
      arguments: {},
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      dataSource: "synthetic",
      sites: [
        { siteId: "demo-sunridge-az" },
        { siteId: "demo-cedar-or" },
        { siteId: "demo-harbor-ca" },
        { siteId: "demo-mesa-nv" },
      ],
    });
  });

  it("returns production metrics and rejects a range over 30 days", async () => {
    const client = await connectClient();
    const ok = await client.callTool({
      name: "get_production_metrics",
      arguments: {
        siteId: "demo-sunridge-az",
        startDate: "2026-08-20",
        endDate: "2026-08-26",
        detail: "normalization_trace",
      },
    });
    const tooLong = await client.callTool({
      name: "get_production_metrics",
      arguments: {
        siteId: "demo-sunridge-az",
        startDate: "2026-07-01",
        endDate: "2026-08-26",
      },
    });

    expect(ok.isError).not.toBe(true);
    expect(ok.structuredContent).toMatchObject({
      dataSource: "synthetic",
      detail: "normalization_trace",
    });
    expect(tooLong.isError).toBe(true);
    expect(tooLong.structuredContent).toMatchObject({
      error: { code: "RANGE_TOO_LONG" },
    });
  });

  it("returns weather context for a demo site only", async () => {
    const client = await connectClient();
    const ok = await client.callTool({
      name: "get_weather_context",
      arguments: { siteId: "demo-mesa-nv", forecastDays: 3 },
    });
    const unknown = await client.callTool({
      name: "get_weather_context",
      arguments: { siteId: "not-a-site" },
    });

    expect(ok.isError).not.toBe(true);
    expect(ok.structuredContent).toMatchObject({
      siteId: "demo-mesa-nv",
      source: "open-meteo",
    });
    expect(unknown.isError).toBe(true);
    expect(unknown.structuredContent).toMatchObject({
      error: { code: "UNKNOWN_SITE" },
    });
  });

  it("returns a cleaning assessment and methodology text", async () => {
    const client = await connectClient();
    const recommendation = await client.callTool({
      name: "get_cleaning_recommendation",
      arguments: { siteId: "demo-harbor-ca", detail: "full" },
    });
    const methodology = await client.readResource({ uri: METHODOLOGY_URI });

    expect(recommendation.isError).not.toBe(true);
    const assessment = CleaningAssessmentSchema.parse(
      recommendation.structuredContent,
    );
    expect(["clean_soon", "wait_for_rain", "monitor"]).toContain(
      assessment.decision,
    );
    expect(methodology.contents[0]).toMatchObject({
      uri: METHODOLOGY_URI,
      mimeType: "text/markdown",
    });

    const unknown = await client.callTool({
      name: "get_cleaning_recommendation",
      arguments: { siteId: "not-a-site" },
    });
    expect(unknown.isError).toBe(true);
    expect(unknown.structuredContent).toMatchObject({
      error: { code: "UNKNOWN_SITE" },
    });
  });
});
