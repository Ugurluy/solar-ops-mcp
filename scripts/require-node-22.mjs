#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const major = Number(process.versions.node.split(".")[0]);
if (major < 22) {
  console.error(
    `Need Node 22+ (nvm use 22). This process is Node ${process.version} ${process.platform}-${process.arch}.`,
  );
  process.exit(1);
}

if (process.platform === "darwin" && process.arch === "x64") {
  let machine = "";
  try {
    machine = execFileSync("uname", ["-m"], { encoding: "utf8" }).trim();
  } catch {
    machine = "";
  }
  if (machine === "arm64") {
    console.error(
      "This Mac is Apple Silicon but Node is running as x64 (Rosetta). Rollup then looks for @rollup/rollup-darwin-x64. Run: nvm use 22",
    );
    process.exit(1);
  }
}
