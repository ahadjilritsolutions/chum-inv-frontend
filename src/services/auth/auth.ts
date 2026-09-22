import type {
  LoginRequest,
  LoginResponse,
  LoginErrorResponse,
} from "@/types/auth/auth";
import { apiUrl } from "@/lib/api/client";
import { apiPost } from "@/lib/api/http";

/**
 * Drives the whole login flow.
 *
 * The SAME call is re-issued as the user answers each question: first bare
 * credentials, then with `id_service` (and, for a System user, `id_role`).
 * Deliberately not routed through apiPost — there is no bearer token yet, and
 * an unauthenticated 403 here means "wrong password", not "session expired",
 * so it must not trip the redirect interceptor.
 */
export async function login(values: LoginRequest): Promise<LoginResponse> {
  const r = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });

  const data = (await r.json()) as LoginResponse | LoginErrorResponse;

  if (!r.ok) {
    throw new Error(
      (data as LoginErrorResponse).message || "Échec de la connexion",
    );
  }

  return data as LoginResponse;
}

/**
 * Ends the session on the server.
 *
 * Not optional housekeeping: the token stays cryptographically valid for 24h
 * otherwise, which would leave the user showing as connected in Personnel and
 * their messagerie socket accepted — on the DEP's and the LIS's screens as
 * much as on ours. Clearing localStorage alone only hides the token from this
 * browser.
 *
 * Never throws: the user is leaving either way, and a failed logout must not
 * strand them on a page they have already abandoned.
 */
export async function logout(): Promise<void> {
  try {
    await apiPost<{ message: string }>("/api/auth/logout", {});
  } catch {
    // Best effort — the session also dies on its own expiry.
  }
}
