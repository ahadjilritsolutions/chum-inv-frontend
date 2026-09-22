// Login types — mirror the chum-inv-backend responses.
//
// The login is a multi-step flow driven by ONE endpoint. The backend replies
// with a discriminated `status` and the client re-posts to the same path with
// the answer added, so there is no server-side wizard state to keep in sync:
//   • "profile-selection" → a System user picks a role AND a service
//   • "service-selection" → an ordinary user assigned to several picks one
//   • "authenticated"     → done, here is the token + user

export interface ServiceChoice {
  id_service: number;
  lib_service: string;
  cod_service: string | null;
}

export interface RoleChoice {
  id_role: number;
  code: string;
  lib_role: string;
  santeplus_role_id: number | null;
  /** Whether the role sees every service, or only those it is assigned. */
  portee: "tous_services" | "propres_services";
}

/** The inv_role a session's accesses come from. */
export interface InvRoleRef {
  id_role: number;
  code: string;
  lib_role: string;
}

/**
 * The same, plus the role's scope.
 *
 * The login response and /api/access/moi both carry `portee`, because the top
 * bar has to distinguish "this role covers the hospital" from "this account is
 * assigned to three wards" — they look the same in a service list and mean
 * very different things. /api/me does NOT carry it (a profile page has no
 * perimeter to label), which is why the two types are separate.
 */
export interface InvRoleScoped extends InvRoleRef {
  portee: "tous_services" | "propres_services";
}

export interface AuthUser {
  id_user: number;
  nom: string;
  prenom: string;
  /** The EFFECTIVE santeplus role — what the shared platforms read. */
  role: number;
  /**
   * The santeplus role actually held. Differs from `role` only while a System
   * user acts as someone else. The context switcher gates on THIS, so an
   * acting administrator keeps the control that lets them switch back.
   */
  real_role: number;
  /** True while the EFFECTIVE role is System. */
  est_systeme: boolean;
  id_service: number;
  lib_service: string | null;
  /** Every service the session covers, when it covers more than one. */
  service_ids: number[] | null;
  /**
   * The inv_role backing the accesses, or null.
   *
   * null means two different things, which `acces` separates: a System session
   * (every access, no role row) and an account nobody has given a role yet
   * (no access at all — and it must be TOLD why, see NoRoleBanner).
   */
  role_inv: InvRoleScoped | null;
  /**
   * Every access code the session holds.
   *
   * Rendering ONLY. The backend re-reads these from the database on every
   * request, so this copy going stale hides or shows a control at worst — it
   * can never grant anything.
   */
  acces: string[];
}

export interface LoginRequest {
  /** The `utilisateur.login` value. Named `mail` for parity with the DEP. */
  mail: string;
  pass: string;
  id_service?: number;
  /**
   * SYSTEM ONLY — the inv_role to act as. THREE states:
   *   undefined -> picker not answered yet
   *   number    -> act as that role (faithful simulation, admin.* NOT granted)
   *   null      -> act as System itself (every access code)
   * Administration and the migration live only in the null case.
   */
  id_role?: number | null;
}

export interface ProfileSelectionResponse {
  status: "profile-selection";
  roles: RoleChoice[];
  default_role: number | null;
  services: ServiceChoice[];
}

export interface ServiceSelectionResponse {
  status: "service-selection";
  services: ServiceChoice[];
}

export interface LoginSuccessResponse {
  status: "authenticated";
  token: string;
  user: AuthUser;
  /** The session this login displaced, when any. */
  superseded_session_id: number | null;
}

export type LoginResponse =
  | ProfileSelectionResponse
  | ServiceSelectionResponse
  | LoginSuccessResponse;

export interface LoginErrorResponse {
  message: string;
  code?: string;
}

export const isProfileSelection = (
  r: LoginResponse,
): r is ProfileSelectionResponse => r.status === "profile-selection";

export const isServiceSelection = (
  r: LoginResponse,
): r is ServiceSelectionResponse => r.status === "service-selection";

export const isAuthenticated = (
  r: LoginResponse,
): r is LoginSuccessResponse => r.status === "authenticated";

// ── Mon compte ──────────────────────────────────────────────────────────────

export interface MyProfile {
  id_user: number;
  login: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  poste: string | null;
  role: number;
  grade: { id_grade: number; lib_grade: string } | null;
  service: { id_service: number; lib_service: string } | null;
  services: { id_service: number; lib_service: string }[];
  role_inv: InvRoleRef | null;
  face_enrolee: boolean;
}

// ── Access + scope, from GET /api/access/moi ────────────────────────────────

export interface ModuleScope {
  /** True when no service predicate applies at all. */
  tous: boolean;
  /** The exhaustive list otherwise. May legitimately be empty. */
  services: number[];
}

export interface MyAccess {
  acces: string[];
  est_systeme: boolean;
  role: InvRoleScoped | null;
  portee: {
    articles: ModuleScope;
    interventions: ModuleScope;
  };
}

// ── Context switching ──────────────────────────────────────────────────────

export interface ContextOptions {
  est_systeme: boolean;
  id_service: number;
  id_role: number | null;
  services: ServiceChoice[];
  /** Empty for a non-System session. */
  roles: RoleChoice[];
}

export interface SwitchContextResponse {
  token: string;
  id_service: number;
  lib_service: string | null;
  role: number;
  real_role: number;
  role_inv: InvRoleScoped | null;
  acces: string[];
}
