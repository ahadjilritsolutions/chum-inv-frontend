// ─────────────────────────────────────────────────────────────────────────────
// Session persistence.
//
// localStorage, so the session is shared across tabs of the same browser. The
// token is a 24h JWT, but it is NOT the authority: chum-inv-backend checks a
// `santeplus.user_session` row on every request, so a token whose session was
// displaced by a login elsewhere stops working immediately — here, in the DEP
// and in the LIS alike.
//
// Keys are prefixed `inv_` so this app and the LIS (`lis_*`) can be open in
// the same browser without trampling each other's session.
// ─────────────────────────────────────────────────────────────────────────────
import type { AuthUser, InvRoleScoped } from "@/types/auth/auth";

const LS_USER = "inv_user";
const LS_TOKEN = "inv_token";

export function saveAuthSession(data: { user: AuthUser; token: string }): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_USER, JSON.stringify(data.user));
  localStorage.setItem(LS_TOKEN, data.token);
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LS_USER);
  localStorage.removeItem(LS_TOKEN);
}

export function getBearerToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LS_TOKEN);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LS_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    // A corrupt blob is not worth crashing a render over; the next login
    // rewrites it wholesale.
    return null;
  }
}

/**
 * Replaces the stored access list in place.
 *
 * Called after an /api/access/moi refresh and after a context switch, so the
 * next full page load starts from the current list rather than the one minted
 * at login. Written back into `inv_user` rather than a separate key: one
 * source for the session means the two can never disagree about who this is.
 */
export function storeAccesses(
  acces: string[],
  role_inv: InvRoleScoped | null,
): void {
  if (typeof window === "undefined") return;
  const user = getStoredUser();
  if (!user) return;
  localStorage.setItem(LS_USER, JSON.stringify({ ...user, acces, role_inv }));
}

/**
 * Applies EVERYTHING a context switch changed, in one write.
 *
 * It used to be two partial helpers — one for the service, one for the access
 * list — and neither persisted `role` / `real_role`. Switching back to System
 * therefore restored the full 84 accesses while leaving the stored role at the
 * one just abandoned, so the UI announced "Aucun rôle" for a session that in
 * fact held everything. Anything the response carries is written here, so the
 * stored session can never again be a mix of two contexts.
 */
export function storeContext(res: {
  id_service: number;
  lib_service: string | null;
  role: number;
  real_role: number;
  role_inv: InvRoleScoped | null;
  acces: string[];
}): void {
  if (typeof window === "undefined") return;
  const user = getStoredUser();
  if (!user) return;
  localStorage.setItem(
    LS_USER,
    JSON.stringify({
      ...user,
      id_service: res.id_service,
      lib_service: res.lib_service,
      // A narrowed session covers exactly the service just chosen, so the
      // multi-service list is dropped — keeping it would leave the displayed
      // scope wider than the choice the user just made.
      service_ids: null,
      role: res.role,
      real_role: res.real_role,
      // Derived, never taken on trust: the one thing the navbar and the
      // dashboard both read to tell "System, all access" from "no role".
      est_systeme: res.role === 100,
      role_inv: res.role_inv,
      acces: res.acces,
    }),
  );
}

// ── Service scope, for LABELLING only ───────────────────────────────────────
// Everything the UI shows is already narrowed by the API from the JWT. These
// helpers exist to name the perimeter in the top bar. Never filter data with
// them client-side.

/** True when the session spans several services rather than standing in one. */
export function isMultiServiceSession(user: AuthUser | null): boolean {
  return !!user?.service_ids && user.service_ids.length > 1;
}

/**
 * What to display as the session's working perimeter.
 *
 * A `tous_services` role is not the same as a multi-service assignment: the
 * inventory office genuinely covers the hospital, whereas a technician
 * assigned to three wards covers three. Saying "Tous les services" for both
 * would tell the technician they see more than they do.
 *
 * The single-service case says "Ce service seulement" rather than naming it.
 * The navbar already shows the service name immediately to the left, and
 * repeating it there read as a duplicate rather than as a perimeter — the
 * useful information is the CONTRAST with "Tous les services", not the name.
 */
export function scopeLabel(user: AuthUser | null): string {
  if (!user) return "";
  if (user.role_inv?.portee === "tous_services" || user.est_systeme) {
    return "Tous les services";
  }
  const n = user.service_ids?.length ?? 0;
  if (n > 1) return `${n} services`;
  return "Ce service seulement";
}
