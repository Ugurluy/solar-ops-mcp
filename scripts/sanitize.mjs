#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SKIP_PREFIXES = ["scripts/sanitize.mjs"];

const LITERALS = [
  "Sunchronize",
  "sunchronize.com",
  "com.ssapp.sunchronize",
  "solar-schedule-75f2b",
  "info@sunchronize.com",
];

const SECRET_PATTERNS = [
  { id: "google-api-key", pattern: /AIza[0-9A-Za-z_-]{20,}/ },
  { id: "aws-access-key", pattern: /AKIA[0-9A-Z]{16}/ },
  { id: "github-pat", pattern: /gh[pousr]_[A-Za-z0-9]{20,}/ },
  { id: "github-fine-grained", pattern: /github_pat_[A-Za-z0-9_]{20,}/ },
  { id: "paddle-api-key", pattern: /pdl_(?:live|sdbx)_[A-Za-z0-9_]+/ },
  { id: "stripe-live-key", pattern: /sk_live_[A-Za-z0-9]+/ },
  { id: "private-key", pattern: /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/ },
];

const argv = process.argv.slice(2);
const scanHistory = argv.includes("--history");
const extraPaths = argv.filter((arg) => arg !== "--history");
const tracked = gitOutput(["ls-files", "-z", "--cached", "--others", "--exclude-standard"])
  .split("\0")
  .filter((path) => path.length > 0 && !shouldSkip(path));
const targets = extraPaths.length > 0 ? extraPaths.filter((path) => !shouldSkip(path)) : tracked;
const hits = [];

for (const filePath of targets) {
  let text;
  try {
    text = readFileSync(filePath, "utf8");
  } catch {
    continue;
  }

  if (text.includes("\u0000")) {
    continue;
  }

  for (const literal of LITERALS) {
    if (text.toLowerCase().includes(literal.toLowerCase())) {
      hits.push(`${filePath}: denylist identifier "${literal}"`);
    }
  }

  for (const { id, pattern } of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      hits.push(`${filePath}: secret pattern ${id}`);
    }
  }
}

if (scanHistory) {
  for (const literal of LITERALS) {
    const history = gitOutput(
      ["log", "--all", "-S", literal, "--pretty=format:%H", "--", ".", ":!scripts/sanitize.mjs"],
      true,
    );
    if (history.trim().length > 0) {
      hits.push(`git history: denylist identifier "${literal}"`);
    }
  }
}

if (hits.length > 0) {
  console.error("Sanitization gate failed:\n" + hits.join("\n"));
  process.exit(1);
}

console.log(
  `Sanitization gate passed (${String(targets.length)} files, ${String(LITERALS.length)} identifiers).`,
);

function shouldSkip(filePath) {
  return SKIP_PREFIXES.some(
    (prefix) => filePath === prefix || filePath.endsWith(`/${prefix}`),
  );
}

function gitOutput(args, allowFail = false) {
  try {
    return execFileSync("git", args, { encoding: "utf8" });
  } catch (error) {
    if (allowFail) {
      return "";
    }
    throw error;
  }
}
