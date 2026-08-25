import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { McpServer } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";

import { registerPvOpsTools, SERVER_INFO } from "../src/index.js";

const closeCallbacks: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(closeCallbacks.splice(0).map(async (close) => close()));
});

describe("PV Ops MCP registry", () => {
  it("discovers and calls list_demo_sites", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const server = new McpServer(SERVER_INFO);
    const client = new Client({ name: "registry-test", version: "0.0.0" });
    registerPvOpsTools(server);

    await server.connect(serverTransport);
    await client.connect(clientTransport);
    closeCallbacks.push(
      async () => client.close(),
      async () => server.close(),
    );

    const tools = await client.listTools();
    const result = await client.callTool({
      name: "list_demo_sites",
      arguments: {},
    });

    expect(tools.tools.map((tool) => tool.name)).toContain("list_demo_sites");
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      dataSource: "synthetic",
      sites: [{ siteId: "demo-sunridge-az" }],
    });
  });
});
