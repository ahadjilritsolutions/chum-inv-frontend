// ─────────────────────────────────────────────────────────────────────────────
// ROLE IDS — identity only. Authorisation lives in lib/access.ts.
//
// There are deliberately no capability predicates here. What a session may do
// is a set of access codes resolved from `inv_role_access` on every request,
// not a fact about an integer — gating on a role id would put policy back in
// the build, which is exactly what the access model exists to prevent.
//
// What legitimately remains is SYSTEM, because "is this really the
// administrator" is a question about who someone IS rather than what they may
// do. It decides which context switcher to show, and it is why an
// administrator acting as someone else never loses their way back.
//
// These ids come from the shared `santeplus.role` table. The platform's own
// roles live in `inv_role` and are addressed by a different namespace
// entirely — an `inv_role.id_role` of 3 is `chef_service`, while a
// santeplus role of 3 is Gestionnaire-Admission. Never compare the two.
// ─────────────────────────────────────────────────────────────────────────────

export const ROLE = {
  /** `admin` in the shared table. Acts across every service, and AS any role. */
  SYSTEM: 100,
} as const;

/** True when the id is the System role. */
export function isSystem(role: number | null | undefined): boolean {
  return role === ROLE.SYSTEM;
}

/**
 * True when the account REALLY is System, whatever it is currently acting as.
 *
 * `real_role` is what survives an act-as; `role` is the acted-as one. Reading
 * the latter would strand an administrator the moment they picked a profile.
 */
export function isRealSystem(
  user: { role: number; real_role?: number } | null,
): boolean {
  if (!user) return false;
  return (user.real_role ?? user.role) === ROLE.SYSTEM;
}
