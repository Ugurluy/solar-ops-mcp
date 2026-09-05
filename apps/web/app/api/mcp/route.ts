import { registerPvOpsTools, SERVER_INFO } from "@yagizugurlu/pv-ops-mcp";
import { createMcpHandler } from "mcp-handler";

const handler = createMcpHandler((server) => {
  registerPvOpsTools(server);
}, { serverInfo: SERVER_INFO });

export { handler as DELETE, handler as POST };

export async function GET(request: Request) {
  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("text/html") && !accept.includes("text/event-stream")) {
    return new Response(BROWSER_GET_PAGE, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return handler(request);
}

const BROWSER_GET_PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>PV Ops MCP endpoint</title>
  </head>
  <body>
    <h1>This is an MCP endpoint, not a web page</h1>
    <p>
      Assistants talk to <code>/api/mcp</code> with HTTP POST (Streamable HTTP).
      A GET from a browser is not a tool call, so the protocol answers
      <code>405 Method not allowed</code>.
    </p>
    <p>
      Connect Cursor or MCP Inspector to this URL, or use the stdio CLI:
      <code>node packages/mcp/dist/cli.js</code>
    </p>
    <p><a href="/">Sites dashboard</a> · <a href="/explorer">Tool Explorer</a></p>
  </body>
</html>
`;
