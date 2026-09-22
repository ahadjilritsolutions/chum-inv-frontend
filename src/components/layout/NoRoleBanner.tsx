"use client";

import { ShieldAlert } from "lucide-react";
import { useAccess } from "@/lib/auth/AccessProvider";

/**
 * Tells an account with no inv_role WHY everything is empty.
 *
 * Without this the state is silently indistinguishable from a broken
 * application: the sidebar has no entries, every page redirects, and the user
 * is left on their own account page with nothing to explain it.
 *
 * It is a normal intermediate state and it will be a COMMON one here — the
 * accounts migration deliberately refuses to invent santeplus identities, so
 * every legacy user it cannot match lands on a worklist rather than in the
 * app. Those people need a readable answer, not a support call.
 *
 * Renders nothing for everyone else — including System, which holds every
 * access and can never reach this state.
 */
export default function NoRoleBanner() {
  const { hasNoRole } = useAccess();
  if (!hasNoRole) return null;

  return (
    <div className="mb-3 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
      <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-600" />
      <div className="min-w-0 text-[12.5px] leading-relaxed text-amber-900">
        <strong className="block text-[13px]">
          Aucun rôle ne vous est attribué
        </strong>
        Votre compte est actif mais ne dispose d&apos;aucun accès : c&apos;est
        pourquoi aucune section n&apos;apparaît. Demandez à un administrateur de
        vous attribuer un rôle depuis{" "}
        <span className="font-medium">Configurations ▸ Comptes</span>. Vous
        pouvez en attendant consulter et modifier vos informations personnelles.
      </div>
    </div>
  );
}
