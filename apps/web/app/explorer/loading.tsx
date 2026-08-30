import { AppShell } from "../../components/AppShell";

export default function ExplorerLoading() {
  return (
    <AppShell current="explorer">
      <p className="muted">Loading Tool Explorer…</p>
      <div className="skeleton" />
    </AppShell>
  );
}
