export const MCP_ENDPOINT = "/api/mcp";

export type McpHttpExchange = {
  request: {
    url: string;
    method: "POST";
    headers: Record<string, string>;
    body: unknown;
  };
  status: number;
  durationMs: number;
  rawText: string;
  payload: unknown;
};

export type McpValidation = "ok" | "tool_error" | "protocol_error" | "invalid";

const headers = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
} as const;

let nextId = 1;

export async function callMcp(
  method: string,
  params?: Record<string, unknown>,
): Promise<McpHttpExchange> {
  const id = nextId;
  nextId += 1;
  const body =
    params === undefined
      ? { jsonrpc: "2.0", id, method }
      : { jsonrpc: "2.0", id, method, params };

  const started = performance.now();
  const response = await fetch(MCP_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const rawText = await response.text();
  const durationMs = Math.round(performance.now() - started);

  return {
    request: {
      url: MCP_ENDPOINT,
      method: "POST",
      headers: { ...headers },
      body,
    },
    status: response.status,
    durationMs,
    rawText,
    payload: parseMcpHttpBody(rawText),
  };
}

export function parseMcpHttpBody(rawText: string): unknown {
  const trimmed = rawText.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(trimmed) as unknown;
  }

  const frames = [...trimmed.matchAll(/^data:\s?(.*)$/gm)].map(
    (match) => match[1] ?? "",
  );
  for (let index = frames.length - 1; index >= 0; index -= 1) {
    const frame = frames[index];
    if (frame !== undefined && frame.length > 0) {
      return JSON.parse(frame) as unknown;
    }
  }

  throw new Error("MCP response did not include a JSON payload.");
}

export function validateMcpPayload(payload: unknown): McpValidation {
  if (!isRecord(payload)) {
    return "invalid";
  }

  if (isRecord(payload.error)) {
    return "protocol_error";
  }

  const result = payload.result;
  if (!isRecord(result)) {
    return "invalid";
  }

  if (result.isError === true) {
    return "tool_error";
  }

  if (isRecord(result.structuredContent) && isRecord(result.structuredContent.error)) {
    return "tool_error";
  }

  if (result.structuredContent !== undefined) {
    return "ok";
  }

  if (
    Array.isArray(result.tools) ||
    Array.isArray(result.resources) ||
    Array.isArray(result.contents)
  ) {
    return "ok";
  }

  return "invalid";
}

export function readResult(payload: unknown): unknown {
  return isRecord(payload) ? payload.result : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
