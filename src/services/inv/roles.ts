import { apiGet, apiPost, apiPut } from "@/lib/api/http";

export interface RoleRow {
  id_role: number;
  code: string;
  lib_role: string;
  portee: "tous_services" | "propres_services";
  actif: number;
  santeplus_role_id: number | null;
  nb_acces: number;
  nb_utilisateurs: number;
}

export interface AccesCatalogue {
  modules: Array<{
    code: string;
    libelle: string;
    acces: Array<{ code: string; libelle: string; type: string }>;
  }>;
}

export const listRoles = (): Promise<{ roles: RoleRow[] }> =>
  apiGet("/api/roles");

export const creerRole = (body: {
  code: string;
  lib_role: string;
  portee: string;
  santeplus_role_id?: number | null;
}): Promise<{ id_role: number }> => apiPost("/api/roles", body);

export const modifierRole = (
  id: number,
  body: {
    lib_role: string;
    portee: string;
    santeplus_role_id?: number | null;
    actif?: number;
  },
): Promise<{ ok: true }> => apiPut(`/api/roles/${id}`, body);

/** Le catalogue vient du CODE du serveur, jamais de la base — même pour tous. */
export const getCatalogueAcces = (): Promise<AccesCatalogue> =>
  apiGet("/api/roles/acces/catalogue");

export const getRoleAcces = (id: number): Promise<{ codes: string[] }> =>
  apiGet(`/api/roles/${id}/acces`);

/**
 * Enregistre l'ENSEMBLE des accès du rôle, jamais un delta.
 *
 * Voir roles.service.ts côté serveur : un delta dépendrait de ce que ce client
 * croyait voir, et deux administrateurs travaillant en même temps sur le même
 * rôle s'écraseraient à moitié.
 */
export const setRoleAcces = (id: number, codes: string[]): Promise<{ codes: string[] }> =>
  apiPut(`/api/roles/${id}/acces`, { codes });

export const setRoleUtilisateur = (
  id_user: number,
  id_role: number | null,
): Promise<{ ok: true }> => apiPut(`/api/roles/utilisateur/${id_user}`, { id_role });
