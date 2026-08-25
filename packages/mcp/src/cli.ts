#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";

import { registerPvOpsTools, SERVER_INFO } from "./index.js";

const server = new McpServer(SERVER_INFO);
registerPvOpsTools(server);

await server.connect(new StdioServerTransport());
