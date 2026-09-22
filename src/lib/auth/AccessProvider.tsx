"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS CONTEXT — what the signed-in session may do, for the UI to render by.
//
// One answer per render tree, mounted in AppShell, so every page and every
// button reads the same list instead of each re-parsing localStorage.
//
// THIS IS UX, NOT SECURITY. Every gated call is re-checked server-side against
// the database on each request (modules/access/access.service). If this list
// goes stale the user sees a button that then returns 403 — annoying, never
// dangerous. Never reason the other way round: do not skip a backend gate
// because the button is hidden.
//
// Refreshed from GET /api/access/moi on mount, so a tab left open overnight
// picks up a role change without a re-login.
// ─────────────────────────────────────────────────────────────────────────────
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getStoredUser, storeAccesses } from "./auth-client";
import { getMyAccess } from "@/services/inv/me";
import type { AccessCode } from "@/lib/access";
import type { AuthUser, InvRoleScoped, MyAccess } from "@/types/auth/auth";

interface AccessState {
  /** True until the first resolution completes — gate on it or the UI flashes. */
  loading: boolean;
  user: AuthUser | null;
  /** The inv_role backing the accesses, or null (System / none assigned). */
  role: InvRoleScoped | null;
  /** True when the session holds every code given. */
  can: (...codes: AccessCode[]) => boolean;
  /** True when the session holds at least one of the codes given. */
  canAny: (...codes: AccessCode[]) => boolean;
  /**
   * True when the account has no inv_role at all — every screen will be empty
   * and the user deserves to be told that rather than left guessing.
   */
  hasNoRole: boolean;
  /**
   * The service perimeter, per module, as the server resolved it.
   *
   * Kept here because the UI has to SAY which services a screen covers, and
   * that is not derivable from the code list: `articles.voir_tous_services`
   * being held is necessary but not sufficient — the role's `portee` has to
   * agree too, and only the server knows both.
   */
  portee: MyAccess["portee"] | null;
  /** Re-reads the accesses from the server. */
  refresh: () => Promise<void>;
}

const AccessCtx = createContext<AccessState | null>(null);

export default function AccessProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [codes, setCodes] = useState<Set<string>>(new Set());
  const [role, setRole] = useState<InvRoleScoped | null>(null);
  const [portee, setPortee] = useState<MyAccess["portee"] | null>(null);
  const [loading, setLoading] = useState(true);

  const applyStored = useCallback(() => {
    const stored = getStoredUser();
    setUser(stored);
    setCodes(new Set(stored?.acces ?? []));
    setRole(stored?.role_inv ?? null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const me = await getMyAccess();
      setCodes(new Set(me.acces ?? []));
      setRole(me.role ?? null);
      setPortee(me.portee ?? null);
      // Written back so the next full page load starts from the fresh list
      // rather than the one minted at login.
      storeAccesses(me.acces ?? [], me.role ?? null);
    } catch {
      // Offline, or the session just died — the interceptor in lib/api/http
      // handles a 401 by redirecting, so there is nothing useful to do here
      // beyond keeping whatever was stored.
    }
  }, []);

  useEffect(() => {
    applyStored();
    setLoading(false);
    void refresh();
  }, [applyStored, refresh]);

  const value = useMemo<AccessState>(() => {
    const can = (...required: AccessCode[]) =>
      required.every((c) => codes.has(c));
    return {
      loading,
      user,
      role,
      portee,
      can,
      canAny: (...required: AccessCode[]) => required.some((c) => codes.has(c)),
      // A System session holds every code, so an empty set really does mean
      // "nothing assigned" rather than "not resolved yet" once loading is done.
      hasNoRole: !loading && user !== null && codes.size === 0,
      refresh,
    };
  }, [codes, loading, user, role, portee, refresh]);

  return <AccessCtx.Provider value={value}>{children}</AccessCtx.Provider>;
}

/**
 * What this session may do.
 *
 * Outside the provider (a print sheet rendered standalone, a test) it degrades
 * to "can do nothing" rather than throwing: a missing provider must not take
 * the page down, and denying is the safe direction to fail in.
 */
export function useAccess(): AccessState {
  const ctx = useContext(AccessCtx);
  if (ctx) return ctx;
  return {
    loading: false,
    user: null,
    role: null,
    portee: null,
    can: () => false,
    canAny: () => false,
    hasNoRole: false,
    refresh: async () => {},
  };
}
