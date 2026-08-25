# Solar Ops MCP

An explainable **solar operations** server for AI assistants.

It turns fictional inverter site data into tools an assistant can call: list sites, inspect production, pull public weather context, and assess whether panel cleaning is worth considering. The recommendation engine is deterministic; the assistant only supplies the conversation.

This is a portfolio project with **synthetic demo sites**, not operational advice and not a real vendor integration.

## Current status

Day 1 is in place: one demo site (`Sunridge`, Phoenix) and one MCP tool, `list_demo_sites`, over both local stdio and Streamable HTTP (`/api/mcp`).

Later days add four vendor-shaped payload adapters, Open-Meteo weather, the cleaning assessment, a Next.js dashboard with a live MCP Tool Explorer, npm, and Vercel.

## Stack

Node.js 22, TypeScript, npm workspaces, Zod, MCP SDK v2, Next.js, Vitest.

## Run locally

```bash
nvm use 22
npm install
npm test
npm run build
```

Stdio CLI (after build): `node packages/mcp/dist/cli.js`

HTTP endpoint: `npm run dev`, then `http://localhost:3000/api/mcp`
