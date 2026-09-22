// Client-side fetch helpers.
//
// Like the LIS frontend (and unlike the DEP, which proxies through its own Next
// BFF routes), this app talks DIRECTLY to chum-inv-backend.
// NEXT_PUBLIC_API_URL is the backend origin, inlined at BUILD time —
// `apiUrl("/api/auth/login")` → "http://localhost:4003/api/auth/login".
//
// Behind nginx the origin carries the API prefix too, e.g.
// "https://sih-test.chumustapha.local/inventaire-backend", which must agree
// with the backend's API_BASE_PATH or every call 404s.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4003";

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = API_URL.replace(/\/+$/, "");
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}
