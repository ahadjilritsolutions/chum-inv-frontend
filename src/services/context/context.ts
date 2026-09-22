import { apiGet, apiPost } from "@/lib/api/http";
import type { ContextOptions, SwitchContextResponse } from "@/types/auth/auth";

/**
 * The choices available to the CURRENT session.
 *
 * For a System user: every role and every service. For everyone else: the
 * services they are assigned to, and no roles. The client shows the switcher
 * only when there is more than one thing to switch to — but the server
 * re-authorises the choice when the token is re-issued, so hiding the button
 * is UX and never the control.
 */
export const getContextOptions = (): Promise<ContextOptions> =>
  apiGet<ContextOptions>("/api/auth/contexte");

/**
 * Change service, or (System only) the role being acted as.
 *
 * Re-issues the JWT on the SAME `user_session` row — not a new session. A
 * second session row would either displace the user's own (logging them out of
 * the tab they are sitting in) or leave two live rows and defeat
 * single-session.
 */
export const switchContext = (body: {
  id_service?: number;
  /** null = stop acting as anyone and be System again. */
  id_role?: number | null;
}): Promise<SwitchContextResponse> =>
  apiPost<SwitchContextResponse>("/api/auth/contexte", body);
