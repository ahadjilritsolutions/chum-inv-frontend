"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccess } from "./AccessProvider";
import type { AccessCode } from "@/lib/access";
import { landingPath } from "./landing";

/**
 * Page-level guard: keeps a route out of sight for a session that may not use
 * it, the way useRequireSession keeps it out of sight for a session that does
 * not exist.
 *
 * Returns `{ allowed, loading }` so the page can render a neutral shell while
 * resolving instead of flashing content it is about to navigate away from.
 *
 * A courtesy, not a control — every endpoint behind the page re-checks the
 * access against the database. Someone who types the URL sees an empty screen
 * and 403s, not data.
 *
 * Redirects to their landing page rather than /login: the user IS signed in,
 * they simply have no business here, and bouncing them to a login form would
 * read as "your session broke".
 */
/**
 * Plusieurs codes = AU MOINS UN suffit, et non tous.
 *
 * Une page à onglets s'ouvre dès qu'un de ses onglets est permis : exiger la
 * totalité fermerait la Configuration à qui règle le catalogue mais pas les
 * rôles. Chaque onglet se garde ensuite lui-même, et chaque endpoint derrière
 * lui se re-vérifie en base — c'est là qu'est le vrai contrôle.
 */
export function useRequireAccess(...codes: AccessCode[]): {
  allowed: boolean;
  loading: boolean;
} {
  const router = useRouter();
  const { can, loading, user } = useAccess();
  const allowed = codes.some((c) => can(c));

  useEffect(() => {
    // Waiting on `loading` is what stops a spurious bounce: an unresolved
    // access set is empty, and empty is indistinguishable from "no rights".
    if (loading || !user) return;
    if (allowed) return;
    // The first page this session can actually open — see lib/auth/landing.
    // Never a fixed /dashboard: a role without dashboard.voir would be sent
    // somewhere it is refused, and redirecting into another refusal is worse
    // than not redirecting at all.
    router.replace(landingPath(can));
  }, [loading, user, allowed, can, router]);

  return { allowed, loading };
}
