// Client-side fetch helpers.
//
// Like the LIS frontend (and unlike the DEP, which proxies through its own Next
// BFF routes), this app talks DIRECTLY to chum-inv-backend.
// The backend origin comes from public/config.js at run time, else from
// NEXT_PUBLIC_API_URL (inlined at BUILD time) —
// `apiUrl("/api/auth/login")` → "http://localhost:4003/api/auth/login".
//
// Behind nginx the origin carries the API prefix too, e.g.
// "https://sih-test.chumustapha.local/inventaire-backend", which must agree
// with the backend's API_BASE_PATH or every call 404s.

import { apiBaseUrl } from "@/lib/runtime-config";

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = apiBaseUrl().replace(/\/+$/, "");
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}
