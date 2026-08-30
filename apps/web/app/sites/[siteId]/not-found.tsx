import Link from "next/link";

import { AppShell } from "../../../components/AppShell";

export default function SiteNotFound() {
  return (
    <AppShell current="sites">
      <div className="error-box">
        <h1>Unknown demo site</h1>
        <p>Weather and production lookups only accept the four demo site IDs.</p>
        <p>
          <Link href="/">Back to sites</Link>
        </p>
      </div>
    </AppShell>
  );
}
