import type { McpServer } from "@modelcontextprotocol/server";
import {
  ListDemoSitesResultSchema,
  listDemoSites,
} from "@pv-ops/core";
import { z } from "zod";

export const SERVER_INFO = {
  name: "pv-ops-mcp",
  version: "0.0.0",
} as const;

export function registerPvOpsTools(server: McpServer): void {
  server.registerTool(
    "list_demo_sites",
    {
      title: "List demo solar sites",
      description:
        "Lists fictional solar sites available for PV operations demonstrations.",
      inputSchema: z.object({}).strict(),
      outputSchema: ListDemoSitesResultSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    () => {
      const result = listDemoSites();

      return {
        content: [
          {
            type: "text",
            text: result.sites
              .map(
                (site) =>
                  `${site.name} (${site.siteId}) — ${String(site.capacityKw)} kW, ${site.location.city}, ${site.location.region}`,
              )
              .join("\n"),
          },
        ],
        structuredContent: result,
      };
    },
  );
}
