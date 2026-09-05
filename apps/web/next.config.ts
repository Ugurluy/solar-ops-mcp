import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pv-ops/core", "@yagizugurlu/pv-ops-mcp"],
  agentRules: false,
};

export default nextConfig;
