import type { NextConfig } from "next";

// Path the app is served under behind nginx (/inventaire on the test VM).
// Empty in local dev. Next INLINES this into the client bundle at build time,
// so changing it needs a rebuild, never a restart.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  output: "standalone",
};

export default nextConfig;
