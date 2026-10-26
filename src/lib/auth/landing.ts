// ─────────────────────────────────────────────────────────────────────────────
// WHERE A SESSION LANDS — the first page it may actually open.
//
// One resolver, three callers: sign-in, the "retour" buttons, and the redirect
// useRequireAccess performs when someone reaches a page they may not use.
// Never a fixed /dashboard: a role without `dashboard.voir` would be sent
// somewhere it is refused, and redirecting into another refusal is worse than
// not redirecting at all.
//
// ORDER = "most likely to be this person's job", NOT the sidebar's order.
// The sidebar is ordered for scanning; a landing page is a guess at what
// someone opened the app to do. They differ on purpose:
//
//   • Articles comes straight after the dashboard — it is the register, and it
//     is the only module with real data today
//   • Interventions before Mouvements: a DMM technician opens the app to see
//     what is waiting, and réforme is a periodic exercise rather than a daily
//     one
//   • Rapports sits late because much of it is still a stub, and landing on a
//     stub reads as a broken application
//   • Configurations and Administration are last, which costs nothing: the
//     order only decides between pages a session CAN reach, so an
//     administrator whose only access is admin.voir still lands there
//
// To change the priority, reorder LANDING_ORDER. Nothing else needs touching.
// ─────────────────────────────────────────────────────────────────────────────
import { ACCESS, type AccessCode } from "@/lib/access";

/**
 * Always reachable: /mon-compte is never access-gated, because it is where a
 * user reads their own profile and changes their own password. It is the last
 * resort precisely because it cannot be taken away — a session with no role at
 * all needs somewhere that explains itself rather than a redirect loop.
 */
export const LAST_RESORT_PATH = "/mon-compte";

export const LANDING_ORDER: ReadonlyArray<{
  path: string;
  access: AccessCode;
}> = [
  { path: "/dashboard", access: ACCESS.DASHBOARD_VOIR },
  { path: "/articles", access: ACCESS.ARTICLES_VOIR },
  { path: "/reformes", access: ACCESS.REFORME_VOIR },
  { path: "/transferts", access: ACCESS.MOUVEMENTS_VOIR },
  // Dernière, et cela ne coûte rien : l'ordre ne départage que des pages
  // ATTEIGNABLES, donc un compte dont le seul droit est la configuration y
  // atterrit quand même.
  { path: "/statistiques", access: ACCESS.STATISTIQUES_VOIR },
  { path: "/impression", access: ACCESS.IMPRESSION_VOIR },
  { path: "/configuration", access: ACCESS.CONFIG_STRUCTURE_VOIR },
];

/**
 * The first page in LANDING_ORDER this session holds the access for.
 *
 * `has` is deliberately a predicate rather than a list, so the same function
 * serves the AccessProvider (`can`) and sign-in, which only has the raw array
 * from the login response and no provider mounted yet.
 *
 * Callers must not invoke this while accesses are still resolving: an empty
 * set looks identical to "no rights" and would send someone to /mon-compte for
 * a moment before their real landing page. useRequireAccess waits on
 * `loading` for exactly that reason.
 */
export function landingPath(has: (code: AccessCode) => boolean): string {
  return LANDING_ORDER.find((e) => has(e.access))?.path ?? LAST_RESORT_PATH;
}

/** landingPath from the raw access list a login response carries. */
export function landingPathFor(acces: readonly string[]): string {
  const held = new Set(acces);
  return landingPath((code) => held.has(code));
}
