import type { NextConfig } from "next";

// Path the app is served under behind nginx (/inventaire on the test VM).
// Empty in local dev. Next INLINES this into the client bundle at build time,
// so changing it needs a rebuild, never a restart.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

// CPANEL_EXPORT=1 builds the app as plain static files (out/) for a cPanel
// account: no Node process for the frontend, just files Apache serves.
//   - trailingSlash: every page becomes <route>/index.html, which Apache
//     serves for /route/ with no rewrite rules.
//   - images.unoptimized: there is no server to resize images.
// Otherwise: the standalone Node server used behind nginx.
const cpanel = process.env.CPANEL_EXPORT === "1";

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  ...(cpanel
    ? { output: "export", trailingSlash: true, images: { unoptimized: true } }
    : { output: "standalone" }),
};

export default nextConfig;
