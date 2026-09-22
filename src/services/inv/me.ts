import { apiGet, apiPut } from "@/lib/api/http";
import type { MyAccess, MyProfile } from "@/types/auth/auth";

/**
 * What the current session may do, and over which services.
 *
 * Read fresh rather than trusted from the stored login blob: revoking an
 * access has to bite on the next page load, not at the user's next sign-in.
 */
export const getMyAccess = (): Promise<MyAccess> =>
  apiGet<MyAccess>("/api/access/moi");

/** The signed-in user's own profile. */
export const getMe = (): Promise<MyProfile> => apiGet<MyProfile>("/api/me");

/**
 * Update the two fields a user owns.
 *
 * NOT their name, role, grade or service — those are decisions someone else
 * makes about them. The legacy `upprofil.php` lets a user rewrite their own
 * `nom_user`/`prenom_user`, which quietly breaks the hospital directory.
 */
export const updateMe = (body: {
  email?: string;
  telephone?: string;
}): Promise<MyProfile> => apiPut<MyProfile>("/api/me", body);

export const changeMyPassword = (body: {
  mot_de_passe_actuel: string;
  nouveau_mot_de_passe: string;
}): Promise<{ message: string }> =>
  apiPut<{ message: string }>("/api/me/password", body);
