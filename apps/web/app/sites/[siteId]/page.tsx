import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "../../../components/AppShell";
import { DecisionBadge } from "../../../components/DecisionBadge";
import { FactorBars } from "../../../components/FactorBars";
import { ProductionChart } from "../../../components/ProductionChart";
import { loadSiteDetail } from "../../../lib/dashboard";
import {
  formatNumber,
  formatScenario,
  formatVendor,
} from "../../../lib/format";

export const dynamic = "force-dynamic";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const detail = await loadSiteDetail(siteId);
  if (detail === undefined) {
    notFound();
  }

  const { site, snapshot, days, assessment, weather, loadError } = detail;
  const recent = days.slice(-7);
  const recentGenerated = recent.reduce(
    (sum, day) => sum + day.energyGeneratedKwh,
    0,
  );
  const recentBaseline = recent.reduce(
    (sum, day) => sum + day.simulatedCleanBaselineKwh,
    0,
  );

  return (
    <AppShell current="sites">
      <header className="page-header">
        <p className="kicker">
          {formatVendor(site.vendor)} · {site.siteId}
        </p>
        <h1>{site.name}</h1>
        <p className="lede">
          {site.location.city}, {site.location.region} ·{" "}
          {formatNumber(site.capacityKw)} kW ·{" "}
          {formatScenario(site.activeScenario)}
        </p>
        <DecisionBadge decision={assessment?.decision} />
      </header>

      <section className="split">
        <article className="panel">
          <h2>Production versus clean baseline</h2>
          <p className="muted">
            Last 14 synthetic days. Capacity utilization is instantaneous power
            ÷ nameplate, not weather-adjusted efficiency.
          </p>
          <ProductionChart days={days} />
          <ul className="meta">
            <li>
              Recent 7d generated {formatNumber(recentGenerated)} kWh vs
              baseline {formatNumber(recentBaseline)} kWh
            </li>
            <li>
              Now {formatNumber(snapshot.currentPowerW, 0)} W · today{" "}
              {formatNumber(snapshot.energyTodayKwh)} kWh ·{" "}
              {formatNumber(snapshot.capacityUtilizationPct, 0)}% nameplate
            </li>
          </ul>
        </article>

        <article className="panel">
          <h2>Weather context</h2>
          {weather !== undefined ? (
            <>
              <ul className="weather-list">
                <li>
                  PM10 {formatNullable(weather.airQuality.pm10Ugm3)} µg/m³ ·
                  dust {formatNullable(weather.airQuality.dustUgm3)} µg/m³
                </li>
                {weather.daily.slice(0, 5).map((day) => (
                  <li key={day.date}>
                    {day.date}: {formatNullable(day.precipitationMm)} mm,{" "}
                    {formatNullable(day.precipitationProbabilityPct)}% chance,{" "}
                    {formatNullable(day.shortwaveRadiationMj)} MJ radiation
                  </li>
                ))}
              </ul>
              <p className="muted">{weather.attribution}</p>
            </>
          ) : (
            <p className="muted">
              {loadError ?? "Live weather is not available for this site."}
            </p>
          )}
        </article>
      </section>

      <section className="panel">
        <h2>Cleaning assessment</h2>
        {assessment !== undefined ? (
          <>
            <ul className="meta">
              <li>Evidence score {formatNumber(assessment.evidenceScore, 0)}</li>
              <li>Data quality {assessment.dataQuality}</li>
              <li>
                Simulated recoverable {formatNumber(assessment.estimatedRecoverableKwh)}{" "}
                kWh
              </li>
            </ul>
            <FactorBars factors={assessment.factors} />
            <h3>Assumptions</h3>
            <ul>
              {assessment.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {assessment.warnings.length > 0 ? (
              <>
                <h3>Warnings</h3>
                <ul>
                  {assessment.warnings.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        ) : (
          <p className="muted">
            {loadError ?? "Assessment could not be computed."}
          </p>
        )}
        <p>
          <Link
            href={`/explorer?tool=get_cleaning_recommendation&siteId=${site.siteId}`}
          >
            Run this site in the MCP Tool Explorer
          </Link>
        </p>
      </section>
    </AppShell>
  );
}

function formatNullable(value: number | null): string {
  return value === null ? "—" : formatNumber(value);
}
