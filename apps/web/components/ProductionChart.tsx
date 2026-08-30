"use client";

import type { DailyMetric } from "@pv-ops/core";

type ProductionChartProps = {
  days: DailyMetric[];
};

export function ProductionChart({ days }: ProductionChartProps) {
  if (days.length === 0) {
    return <p className="muted">No production days in this window.</p>;
  }

  const width = 640;
  const height = 220;
  const pad = { top: 16, right: 12, bottom: 28, left: 40 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const maxKwh = Math.max(
    ...days.flatMap((day) => [
      day.energyGeneratedKwh,
      day.simulatedCleanBaselineKwh,
    ]),
    1,
  );
  const x = (index: number) =>
    pad.left +
    (days.length === 1 ? innerWidth / 2 : (index / (days.length - 1)) * innerWidth);
  const y = (value: number) =>
    pad.top + innerHeight - (value / maxKwh) * innerHeight;
  const generated = days
    .map((day, index) => `${String(x(index))},${String(y(day.energyGeneratedKwh))}`)
    .join(" ");
  const baseline = days
    .map(
      (day, index) =>
        `${String(x(index))},${String(y(day.simulatedCleanBaselineKwh))}`,
    )
    .join(" ");
  const first = days[0];
  const last = days[days.length - 1];

  return (
    <div className="chart">
      <svg
        viewBox={`0 0 ${String(width)} ${String(height)}`}
        role="img"
        aria-label="Daily generated energy versus simulated clean baseline"
      >
        <line
          x1={pad.left}
          y1={pad.top}
          x2={pad.left}
          y2={height - pad.bottom}
          stroke="#d4ccbe"
        />
        <line
          x1={pad.left}
          y1={height - pad.bottom}
          x2={width - pad.right}
          y2={height - pad.bottom}
          stroke="#d4ccbe"
        />
        <polyline fill="none" stroke="#78716c" strokeWidth="2" points={baseline} />
        <polyline fill="none" stroke="#9a3412" strokeWidth="2.5" points={generated} />
        {first !== undefined && last !== undefined ? (
          <>
            <text x={pad.left} y={height - 8} fontSize="11" fill="#5c564c">
              {first.date}
            </text>
            <text
              x={width - pad.right}
              y={height - 8}
              fontSize="11"
              fill="#5c564c"
              textAnchor="end"
            >
              {last.date}
            </text>
          </>
        ) : null}
        <text x={4} y={pad.top + 4} fontSize="11" fill="#5c564c">
          {`${maxKwh.toFixed(0)} kWh`}
        </text>
      </svg>
      <p className="legend">
        <span>
          <i className="legend__generated" />
          Generated
        </span>
        <span>
          <i className="legend__baseline" />
          Simulated clean baseline
        </span>
      </p>
    </div>
  );
}
