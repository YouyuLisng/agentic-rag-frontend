import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal, self-contained server bundle (.next/standalone)
  // with only the node_modules it actually traced as used -- the
  // Docker image copies just that output, not the full node_modules.
  output: "standalone",
};

export default nextConfig;
