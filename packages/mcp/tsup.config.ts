import { chmodSync } from "node:fs";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: false,
  noExternal: ["@pv-ops/core"],
  async onSuccess() {
    chmodSync("dist/cli.js", 0o755);
  },
});

