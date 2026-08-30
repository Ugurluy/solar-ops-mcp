import { AppShell } from "../components/AppShell";

export default function Loading() {
  return (
    <AppShell current="sites">
      <p className="muted">Loading demo sites…</p>
      <div className="grid">
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    </AppShell>
  );
}
