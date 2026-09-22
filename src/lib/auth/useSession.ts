"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/types/auth/auth";
import { getStoredUser } from "./auth-client";

export interface SessionState {
  user: AuthUser | null;
  /** True until the stored session has been read on the client. */
  loading: boolean;
}

/**
 * Reads the session persisted at login.
 *
 * localStorage is unavailable during SSR, so the first render always reports
 * `loading` — guard on it rather than on `user`, otherwise every protected page
 * flashes its "not signed in" branch before hydration.
 *
 * This is a convenience/UX guard only. It gates what the UI RENDERS, never what
 * the user may READ: every request is re-authorised server-side from the JWT.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ user: null, loading: true });

  useEffect(() => {
    setState({ user: getStoredUser(), loading: false });
  }, []);

  return state;
}

/** useSession, plus a redirect to /login when there is no stored session. */
export function useRequireSession(): SessionState {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (!session.loading && !session.user) router.replace("/login");
  }, [session.loading, session.user, router]);

  return session;
}
