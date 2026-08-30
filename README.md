# Solar Ops MCP

An explainable **solar operations** server for AI assistants.

It turns fictional inverter site data into tools an assistant can call: list sites, inspect production, pull public weather context, and assess whether panel cleaning is worth considering. The recommendation engine is deterministic; the assistant only supplies the conversation.

This is a portfolio project with **synthetic demo sites**, not operational advice and not a real vendor integration.

## Current status

The MCP server and dashboard are in place. Overview and site detail read the domain model; the Tool Explorer calls same-origin `/api/mcp` over Streamable HTTP. npm publish and Vercel are next.

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

Stdio CLI (after build): `node packages/mcp/dist/cli.js`

Dashboard: `npm run dev`, then `http://localhost:3000` (sites) and `http://localhost:3000/explorer` (MCP Tool Explorer session).

HTTP MCP: point a client at `http://localhost:3000/api/mcp` (POST / Streamable HTTP). Opening that URL in a browser is not a tool call.

Local Cursor / Claude Desktop config (after `npm run build`):

```json
{
  "mcpServers": {
    "pv-ops": {
      "command": "node",
      "args": ["/absolute/path/to/pv-ops-mcp/packages/mcp/dist/cli.js"]
    }
  }
}
```
