// ─────────────────────────────────────────────────────────────────────────────
// Authenticated fetch against chum-inv-backend.
//
// This app talks to the API directly (no Next BFF — see lib/api/client),
// so the bearer token is attached here, in one place. An expired or revoked
// token is a session-level event, not a page-level one: it clears the stored
// session and sends the user back to /login rather than surfacing as a random
// error inside whatever component happened to be fetching.
// ─────────────────────────────────────────────────────────────────────────────
import { apiUrl } from "./client";
import { clearAuthSession, getBearerToken } from "@/lib/auth/auth-client";
import { withBasePath } from "@/lib/basePath";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    /**
     * The parsed error body, when the endpoint attached one. Some failures are
     * actionable rather than fatal — a duplicate patient comes back with the
     * record that already holds the identity — and the caller needs it.
     */
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiErrorBody {
  message?: string;
  code?: string;
}

/**
 * Sends the user back to the login page after wiping the dead session.
 *
 * `reason` reaches /login so it can say WHY — "someone else signed in with your
 * account" is a very different message from "your session expired", and
 * without it a displaced user reads a working system as a broken one.
 */
function endSession(reason: "expired" | "superseded" = "expired"): never {
  clearAuthSession();
  if (typeof window !== "undefined") {
    // Not a <Link>/router navigation, so Next does not add basePath for us.
    window.location.href = withBasePath(`/login?reason=${reason}`);
  }
  throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const token = getBearerToken();
  if (!token) endSession();

  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      // FormData must set its OWN Content-Type: the browser appends the
      // multipart boundary, and naming the type here would strip it and make
      // every upload unparseable server-side.
      ...(init.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  if (res.status === 401 || res.status === 403) {
    // 403 is also how the API reports a scope violation (a unité that was
    // deactivated mid-session), which is equally unrecoverable from the page.
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    if (body?.code === "SESSION_TERMINATED") endSession("superseded");
    if (!body?.code || body.code === "TOKEN_INVALID") endSession();
    throw new ApiError(res.status, body.message ?? "Accès refusé.", body.code, body);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      res.status,
      body?.message ?? `Erreur ${res.status}`,
      body?.code,
      body,
    );
  }

  // 204 has no body; every other success in this API returns JSON.
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** Appends the defined entries of `params` as a query string. */
export function withQuery(
  path: string,
  params: Record<string, string | number | null | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export const apiGet = <T>(path: string): Promise<T> =>
  request<T>(path, { method: "GET" });

export const apiPost = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });

export const apiPatch = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(path, { method: "PATCH", body: JSON.stringify(body) });

export const apiPut = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(path, { method: "PUT", body: JSON.stringify(body) });

export const apiDelete = <T>(path: string): Promise<T> =>
  request<T>(path, { method: "DELETE" });

/** Multipart POST — the Content-Type header is left to the browser so it can
 *  add the multipart boundary itself. */
export const apiPostForm = <T>(path: string, form: FormData): Promise<T> =>
  request<T>(path, { method: "POST", body: form });
