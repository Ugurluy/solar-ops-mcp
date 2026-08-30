import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pv-ops/core", "@pv-ops/mcp"],
  agentRules: false,
};

export default nextConfig;
