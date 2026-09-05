#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const mcpDir = join(root, "packages/mcp");
const allowed = [
  "package/package.json",
  "package/README.md",
  "package/LICENSE",
];

execFileSync("npm", ["run", "build", "--workspace", "@pv-ops/core"], {
  cwd: root,
  stdio: "inherit",
});
execFileSync(
  "npm",
  ["run", "build", "--workspace", "@yagizugurlu/pv-ops-mcp"],
  { cwd: root, stdio: "inherit" },
);

const staging = mkdtempSync(join(tmpdir(), "pv-ops-pack-"));

try {
  execFileSync("npm", ["pack", "--pack-destination", staging], {
    cwd: mcpDir,
    stdio: "inherit",
  });
  const tarball = readdirSync(staging).find((name) => name.endsWith(".tgz"));
  if (tarball === undefined) {
    throw new Error("npm pack did not produce a tarball.");
  }

  const listing = execFileSync("tar", ["tzf", join(staging, tarball)], {
    encoding: "utf8",
  })
    .split("\n")
    .filter((line) => line.length > 0);

  const unexpected = listing.filter((entry) => {
    if (allowed.includes(entry)) {
      return false;
    }
    return !entry.startsWith("package/dist/");
  });

  if (unexpected.length > 0) {
    console.error("Unexpected packaged files:\n" + unexpected.join("\n"));
    process.exit(1);
  }

  const extractDir = join(staging, "extract");
  mkdirSync(extractDir);
  execFileSync("tar", ["xzf", join(staging, tarball), "-C", extractDir]);
  execFileSync("npm", ["install", "--omit=dev", "--ignore-scripts"], {
    cwd: join(extractDir, "package"),
    stdio: "inherit",
  });
  execFileSync("node", ["--check", "dist/cli.js"], {
    cwd: join(extractDir, "package"),
    stdio: "inherit",
  });
  execFileSync(
    "node",
    [
      "--input-type=module",
      "-e",
      "import { registerPvOpsTools, SERVER_INFO } from './dist/index.js'; if (typeof registerPvOpsTools !== 'function' || SERVER_INFO.name !== 'pv-ops-mcp') { process.exit(1); }",
    ],
    { cwd: join(extractDir, "package"), stdio: "inherit" },
  );

  console.log(`Pack inspect passed (${tarball}, ${String(listing.length)} files).`);
} finally {
  rmSync(staging, { recursive: true, force: true });
}
