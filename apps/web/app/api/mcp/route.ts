import { registerPvOpsTools } from "@pv-ops/mcp";
import { createMcpHandler } from "mcp-handler";

const handler = createMcpHandler((server) => {
  registerPvOpsTools(server);
});

export { handler as DELETE, handler as GET, handler as POST };
