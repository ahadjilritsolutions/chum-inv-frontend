import { useEffect, useState } from "react";

// Settings read in the browser at RUN time, not baked in at build time.
//
// On cPanel the frontend is a folder of static files: changing the backend's
// address must not need a rebuild. So `public/config.js` (an ordinary file,
// editable from the cPanel File Manager) sets `window.__INV_CONFIG__`, and it
// wins over the NEXT_PUBLIC_* values. In local dev that file leaves both fields
// empty and the env values apply as before.

interface RuntimeConfig {
  apiUrl?: string;
  portalUrl?: string;
}

declare global {
  interface Window {
    __INV_CONFIG__?: RuntimeConfig;
  }
}

function runtime(): RuntimeConfig {
  return (typeof window !== "undefined" && window.__INV_CONFIG__) || {};
}

/** Backend origin (plus its sub-path, if it is mounted under one). */
export function apiBaseUrl(): string {
  return runtime().apiUrl || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4003";
}

/** The SIH portal the "Aide et FAQ" link goes to. */
export function portalUrl(): string {
  return runtime().portalUrl || process.env.NEXT_PUBLIC_PORTAL_URL || "https://192.168.254.10";
}

/**
 * `portalUrl()` for a rendered link. The static pages are pre-rendered at build
 * time, where config.js does not exist, so the link starts on the build value
 * and switches to the runtime one once mounted — no hydration mismatch.
 */
export function usePortalUrl(): string {
  const [url, setUrl] = useState(
    () => process.env.NEXT_PUBLIC_PORTAL_URL || "https://192.168.254.10",
  );
  useEffect(() => setUrl(portalUrl()), []);
  return url;
}
