import type { CleaningAssessment } from "@pv-ops/core";

import { formatDecision } from "../lib/format";

type DecisionBadgeProps = {
  decision: CleaningAssessment["decision"] | undefined;
};

export function DecisionBadge({ decision }: DecisionBadgeProps) {
  if (decision === undefined) {
    return <span className="badge badge--unknown">Weather unavailable</span>;
  }

  const tone =
    decision === "clean_soon"
      ? "clean"
      : decision === "wait_for_rain"
        ? "wait"
        : "monitor";

  return <span className={`badge badge--${tone}`}>{formatDecision(decision)}</span>;
}
