// Where this app's backend and its own static assets live. The ONE file of
// lib/brand that differs between the SIH frontends — everything else is a
// verbatim copy.

import { apiUrl } from "@/lib/api/client";
import { getBearerToken } from "@/lib/auth/auth-client";
import { withBasePath } from "@/lib/basePath";

/** Absolute URL of a branding endpoint, or of the logo path the payload
 *  hands back (which is relative to the API, not to the page). */
export function brandingApiUrl(path: string): string {
  return apiUrl(path);
}

/** Resolves a bundled /public asset against the app's basePath. */
export const brandAssetPath = withBasePath;

/** Bearer header for the one authenticated call (saving the identity).
 *  Empty on the public reads, which is what makes them work pre-login. */
export function brandingAuthHeaders(): Record<string, string> {
  const token = getBearerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
