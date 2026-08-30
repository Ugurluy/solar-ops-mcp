"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type SyntheticEvent } from "react";

import {
  callMcp,
  readResult,
  validateMcpPayload,
  type McpHttpExchange,
  type McpValidation,
} from "../lib/mcp-http";

const HISTORY_KEY = "pv-ops-mcp-explorer";
const TOOL_NAMES = [
  "list_demo_sites",
  "get_production_metrics",
  "get_weather_context",
  "get_cleaning_recommendation",
] as const;

const DEMO_SITE_IDS = [
  "demo-sunridge-az",
  "demo-cedar-or",
  "demo-harbor-ca",
  "demo-mesa-nv",
];

type ToolName = (typeof TOOL_NAMES)[number];

type HistoryEntry = {
  id: number;
  at: string;
  title: string;
  validation: McpValidation;
  exchange: McpHttpExchange;
};

type FormState = {
  tool: ToolName;
  siteId: string;
  startDate: string;
  endDate: string;
  forecastDays: string;
  productionDetail: "summary" | "normalization_trace";
  cleaningDetail: "summary" | "full";
};

const DEFAULT_FORM: FormState = {
  tool: "list_demo_sites",
  siteId: "demo-sunridge-az",
  startDate: "2026-08-20",
  endDate: "2026-08-26",
  forecastDays: "7",
  productionDetail: "summary",
  cleaningDetail: "summary",
};

export function ToolExplorer() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>(formFromSearch(searchParams));
  const [sites, setSites] = useState<string[]>(DEMO_SITE_IDS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);

  useEffect(() => {
    const stored = readHistory();
    setHistory(stored);
    setSelectedId(stored[0]?.id);

    void (async () => {
      try {
        const listed = await callMcp("tools/list", {});
        const result = readResult(listed.payload);
        if (isRecord(result) && Array.isArray(result.tools)) {
          const names = result.tools
            .map((tool) => (isRecord(tool) ? tool.name : undefined))
            .filter((name): name is string => typeof name === "string");
          if (names.length === 0) {
            setError("The MCP endpoint returned no tools.");
          }
        }

        const sitesCall = await callMcp("tools/call", {
          name: "list_demo_sites",
          arguments: {},
        });
        const siteIds = siteIdsFromPayload(sitesCall.payload);
        if (siteIds.length > 0) {
          setSites(siteIds);
          setForm((current) =>
            siteIds.includes(current.siteId)
              ? current
              : { ...current, siteId: siteIds[0] ?? current.siteId },
          );
        }
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not reach /api/mcp.",
        );
      }
    })();
  }, []);

  const selected = useMemo(
    () => history.find((entry) => entry.id === selectedId),
    [history, selectedId],
  );

  async function onSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const exchange = await callMcp("tools/call", {
        name: form.tool,
        arguments: argumentsFor(form),
      });
      pushHistory(form.tool, exchange, setHistory, setSelectedId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tool call failed.");
    } finally {
      setBusy(false);
    }
  }

  async function readMethodology() {
    setBusy(true);
    setError(undefined);
    try {
      const exchange = await callMcp("resources/read", {
        uri: "pvops://methodology",
      });
      pushHistory("pvops://methodology", exchange, setHistory, setSelectedId);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Resource read failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="split">
      <section className="panel">
        <h2>Call a tool</h2>
        <p className="muted">
          This is an MCP Tool Explorer session against same-origin{" "}
          <code>/api/mcp</code>. It is not a view of Cursor or Claude calls.
        </p>
        {error !== undefined ? <p className="error-box">{error}</p> : null}
        <form className="explorer-form" onSubmit={(event) => void onSubmit(event)}>
          <label>
            Tool
            <select
              value={form.tool}
              onChange={(event) => {
                const tool = event.target.value;
                if (isToolName(tool)) {
                  setForm({ ...form, tool });
                }
              }}
            >
              {TOOL_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {form.tool !== "list_demo_sites" ? (
            <label>
              Site
              <select
                value={form.siteId}
                onChange={(event) => {
                  setForm({ ...form, siteId: event.target.value });
                }}
              >
                {sites.map((siteId) => (
                  <option key={siteId} value={siteId}>
                    {siteId}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {form.tool === "get_production_metrics" ? (
            <>
              <label>
                Start date
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) => {
                    setForm({ ...form, startDate: event.target.value });
                  }}
                />
              </label>
              <label>
                End date
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(event) => {
                    setForm({ ...form, endDate: event.target.value });
                  }}
                />
              </label>
              <label>
                Detail
                <select
                  value={form.productionDetail}
                  onChange={(event) => {
                    const productionDetail = event.target.value;
                    if (
                      productionDetail === "summary" ||
                      productionDetail === "normalization_trace"
                    ) {
                      setForm({ ...form, productionDetail });
                    }
                  }}
                >
                  <option value="summary">summary</option>
                  <option value="normalization_trace">normalization_trace</option>
                </select>
              </label>
            </>
          ) : null}
          {form.tool === "get_weather_context" ? (
            <label>
              Forecast days
              <input
                type="number"
                min={1}
                max={7}
                value={form.forecastDays}
                onChange={(event) => {
                  setForm({ ...form, forecastDays: event.target.value });
                }}
              />
            </label>
          ) : null}
          {form.tool === "get_cleaning_recommendation" ? (
            <label>
              Detail
              <select
                value={form.cleaningDetail}
                onChange={(event) => {
                  const cleaningDetail = event.target.value;
                  if (cleaningDetail === "summary" || cleaningDetail === "full") {
                    setForm({ ...form, cleaningDetail });
                  }
                }}
              >
                <option value="summary">summary</option>
                <option value="full">full</option>
              </select>
            </label>
          ) : null}
          <button className="button" disabled={busy} type="submit">
            {busy ? "Calling…" : "Call tool"}
          </button>
          <button
            className="button button--ghost"
            disabled={busy}
            type="button"
            onClick={() => {
              void readMethodology();
            }}
          >
            Read methodology resource
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Session history</h2>
        {history.length > 0 ? (
          <button
            className="button button--ghost"
            type="button"
            onClick={() => {
              writeHistory([]);
              setHistory([]);
              setSelectedId(undefined);
            }}
          >
            Clear session
          </button>
        ) : null}
        <div className="history">
          {history.length === 0 ? (
            <p className="muted">No calls in this browser session yet.</p>
          ) : (
            history.map((entry) => (
              <article key={entry.id}>
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={() => {
                    setSelectedId(entry.id);
                  }}
                >
                  {entry.title} · {String(entry.exchange.durationMs)} ms ·{" "}
                  {entry.validation}
                </button>
                <p className="muted">{entry.at}</p>
              </article>
            ))
          )}
        </div>
      </section>

      {selected !== undefined ? (
        <section className="panel" style={{ gridColumn: "1 / -1" }}>
          <h2>
            {selected.title} · HTTP {String(selected.exchange.status)} ·{" "}
            {String(selected.exchange.durationMs)} ms · {selected.validation}
          </h2>
          <h3>Request</h3>
          <pre className="json">{stringify(selected.exchange.request)}</pre>
          <h3>Response</h3>
          <pre className="json">{stringify(selected.exchange.payload)}</pre>
        </section>
      ) : null}
    </div>
  );
}

function formFromSearch(searchParams: URLSearchParams): FormState {
  const tool = searchParams.get("tool");
  const siteId = searchParams.get("siteId");
  return {
    ...DEFAULT_FORM,
    tool: isToolName(tool) ? tool : DEFAULT_FORM.tool,
    siteId: siteId ?? DEFAULT_FORM.siteId,
  };
}

function argumentsFor(form: FormState): Record<string, unknown> {
  switch (form.tool) {
    case "list_demo_sites":
      return {};
    case "get_production_metrics":
      return {
        siteId: form.siteId,
        startDate: form.startDate,
        endDate: form.endDate,
        detail: form.productionDetail,
      };
    case "get_weather_context":
      return {
        siteId: form.siteId,
        forecastDays: Number(form.forecastDays),
      };
    case "get_cleaning_recommendation":
      return {
        siteId: form.siteId,
        detail: form.cleaningDetail,
      };
  }
}

function pushHistory(
  title: string,
  exchange: McpHttpExchange,
  setHistory: (updater: (current: HistoryEntry[]) => HistoryEntry[]) => void,
  setSelectedId: (id: number) => void,
) {
  const entry: HistoryEntry = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    at: new Date().toISOString(),
    title,
    validation: validateMcpPayload(exchange.payload),
    exchange,
  };
  setHistory((current) => {
    const next = [entry, ...current].slice(0, 20);
    writeHistory(next);
    return next;
  });
  setSelectedId(entry.id);
}

function siteIdsFromPayload(payload: unknown): string[] {
  const result = readResult(payload);
  if (!isRecord(result) || !isRecord(result.structuredContent)) {
    return [];
  }

  const sites = result.structuredContent.sites;
  if (!Array.isArray(sites)) {
    return [];
  }

  return sites
    .map((site) => (isRecord(site) ? site.siteId : undefined))
    .filter((siteId): siteId is string => typeof siteId === "string");
}

function readHistory(): HistoryEntry[] {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    if (raw === null) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isHistoryEntry);
  } catch {
    return [];
  }
}

function writeHistory(entries: HistoryEntry[]) {
  sessionStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function isToolName(value: string | null): value is ToolName {
  return (
    value !== null && (TOOL_NAMES as readonly string[]).includes(value)
  );
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.at === "string" &&
    typeof value.title === "string" &&
    isValidation(value.validation) &&
    isRecord(value.exchange)
  );
}

function isValidation(value: unknown): value is McpValidation {
  return (
    value === "ok" ||
    value === "tool_error" ||
    value === "protocol_error" ||
    value === "invalid"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
