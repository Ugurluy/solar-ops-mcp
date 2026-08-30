"use client";

import type { CleaningFactor } from "@pv-ops/core";

type FactorBarsProps = {
  factors: CleaningFactor[];
};

export function FactorBars({ factors }: FactorBarsProps) {
  const maxContribution = Math.max(
    ...factors.map((factor) => Math.abs(factor.contribution)),
    1,
  );

  return (
    <div>
      {factors.map((factor) => {
        const widthPct = Math.min(
          100,
          (Math.abs(factor.contribution) / maxContribution) * 100,
        );
        return (
          <div className="factor" key={factor.signal}>
            <div className="factor__head">
              <strong>{factor.signal.replaceAll("_", " ")}</strong>
              <span>
                {factor.contribution.toFixed(1)} / {factor.observed.toFixed(1)}{" "}
                {factor.unit}
              </span>
            </div>
            <div className="factor__track" aria-hidden="true">
              <div
                className="factor__fill"
                style={{ width: `${String(widthPct)}%` }}
              />
            </div>
            <p className="factor__note">{factor.explanation}</p>
          </div>
        );
      })}
    </div>
  );
}
