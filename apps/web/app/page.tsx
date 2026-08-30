import Link from "next/link";

import { AppShell } from "../components/AppShell";
import { DecisionBadge } from "../components/DecisionBadge";
import { loadOverviewCards } from "../lib/dashboard";
import {
  formatNumber,
  formatScenario,
  formatVendor,
} from "../lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cards = await loadOverviewCards();

  return (
    <AppShell current="sites">
      <header className="page-header">
        <h1>Demo sites</h1>
        <p className="lede">
          Four fictional plants, four vendor-shaped payloads, one canonical
          model. Badges come from the same cleaning assessment the MCP tools
          expose.
        </p>
      </header>
      <section className="grid" aria-label="Demo sites">
        {cards.map((card) => (
          <Link
            className="card"
            href={`/sites/${card.site.siteId}`}
            key={card.site.siteId}
          >
            <span className="card__kicker">
              {formatVendor(card.site.vendor)} · {card.site.siteId}
            </span>
            <h2>{card.site.name}</h2>
            <ul className="meta">
              <li>
                {card.site.location.city}, {card.site.location.region}
              </li>
              <li>{formatNumber(card.site.capacityKw)} kW</li>
              <li>{formatScenario(card.site.activeScenario)}</li>
            </ul>
            <p>
              {formatNumber(card.snapshot.currentPowerW, 0)} W now ·{" "}
              {formatNumber(card.snapshot.capacityUtilizationPct, 0)}% of
              nameplate
            </p>
            <DecisionBadge decision={card.assessment?.decision} />
            {card.loadError !== undefined ? (
              <p className="muted">{card.loadError}</p>
            ) : null}
          </Link>
        ))}
      </section>
    </AppShell>
  );
}
