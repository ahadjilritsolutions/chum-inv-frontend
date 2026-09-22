"use client";

import type { ReactNode } from "react";
import { useAccess } from "@/lib/auth/AccessProvider";
import type { AccessCode } from "@/lib/access";

interface CanProps {
  /** Every code must be held. */
  access?: AccessCode | AccessCode[];
  /** At least one of these must be held. Combined with `access` by AND. */
  anyOf?: AccessCode[];
  /** Rendered instead when the session lacks the access. Usually nothing. */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Renders its children only when the session holds the access.
 *
 * For a simple show/hide. Where a component already takes an optional handler
 * prop — the `demandes` pattern, where passing the handler at all is what
 * enables the button — keep doing that instead: it gates the behaviour and not
 * merely the pixels, so a stale render cannot leave a live onClick behind.
 *
 * Hiding is a courtesy. The endpoint behind whatever this wraps re-checks the
 * access on the server, against the database, on every call.
 */
export default function Can({ access, anyOf, fallback = null, children }: CanProps) {
  const { can, canAny } = useAccess();

  const required = access === undefined ? [] : Array.isArray(access) ? access : [access];
  const ok =
    (required.length === 0 || can(...required)) &&
    (anyOf === undefined || anyOf.length === 0 || canAny(...anyOf));

  return <>{ok ? children : fallback}</>;
}
