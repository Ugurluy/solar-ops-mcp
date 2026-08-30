import { Suspense } from "react";

import { AppShell } from "../../components/AppShell";
import { ToolExplorer } from "../../components/ToolExplorer";

export default function ExplorerPage() {
  return (
    <AppShell current="explorer">
      <header className="page-header">
        <h1>MCP Tool Explorer</h1>
        <p className="lede">
          Discovers and invokes the same Streamable HTTP endpoint an assistant
          uses. History stays in this browser session only.
        </p>
      </header>
      <Suspense fallback={<p className="muted">Opening explorer…</p>}>
        <ToolExplorer />
      </Suspense>
    </AppShell>
  );
}
