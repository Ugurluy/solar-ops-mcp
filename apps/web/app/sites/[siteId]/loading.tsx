import { AppShell } from "../../../components/AppShell";

export default function SiteLoading() {
  return (
    <AppShell current="sites">
      <p className="muted">Loading site detail…</p>
      <div className="skeleton" />
    </AppShell>
  );
}
