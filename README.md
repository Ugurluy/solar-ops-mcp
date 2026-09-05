# Solar Ops MCP

An explainable **solar operations** server for AI assistants.

It turns fictional inverter site data into tools an assistant can call: list sites, inspect production, pull public weather context, and assess whether panel cleaning is worth considering. The recommendation engine is deterministic; the assistant only supplies the conversation.

This is a portfolio project with **synthetic demo sites**, not operational advice and not a real vendor integration.

## Current status

The MCP server, dashboard, and sanitization gate are in place. `@yagizugurlu/pv-ops-mcp` is on npm. Deploy the web app to Vercel next.

## Tools

| Tool | What it returns |
| --- | --- |
| `list_demo_sites` | Four fictional sites, vendors, city-level locations, and scenarios |
| `get_production_metrics` | Normalized daily energy (max 30 days), optional field-mapping trace |
| `get_weather_context` | Open-Meteo precipitation, radiation, PM10, and dust for a demo site ID |
| `get_cleaning_recommendation` | Explainable `clean_soon` / `wait_for_rain` / `monitor` assessment |

Read-only resource: `pvops://methodology` (units, simulation limits, scoring weights).

Weather lookups accept only the four demo site IDs, so the public endpoint is not an open coordinate proxy.

## Stack

Node.js 22, TypeScript, npm workspaces, Zod, MCP SDK v2, Next.js, Vitest.

## Run locally

```bash
nvm use 22
npm install
npm test
npm run build
```

Dashboard: `npm run dev`, then `http://localhost:3000` (sites) and `http://localhost:3000/explorer` (MCP Tool Explorer session).

HTTP MCP: point a client at `http://localhost:3000/api/mcp` (POST / Streamable HTTP). Opening that URL in a browser is not a tool call.

## npm CLI

After publish:

```bash
npx -y @yagizugurlu/pv-ops-mcp
```

Cursor / Claude Desktop:

```json
{
  "mcpServers": {
    "pv-ops": {
      "command": "npx",
      "args": ["-y", "@yagizugurlu/pv-ops-mcp"]
    }
  }
}
```

Local stdio (after `npm run build`): `node packages/mcp/dist/cli.js`

## Vercel

Import [Ugurluy/solar-ops-mcp](https://github.com/Ugurluy/solar-ops-mcp) in Vercel.

- Framework: Next.js
- Root Directory: `apps/web`
- Node.js: 22

`apps/web/vercel.json` installs and builds from the workspace root so `@pv-ops/core` and the MCP package resolve. The remote MCP URL is `https://<your-app>.vercel.app/api/mcp`.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run sanitize -- --history
npm run pack:inspect
```
