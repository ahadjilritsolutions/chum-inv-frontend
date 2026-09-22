import { apiGet, apiPost, apiPut, withQuery } from "@/lib/api/http";

export interface CompteRow {
  id_user: number;
  login: string;
  nom_user: string | null;
  prenom_user: string | null;
  mail_user: string | null;
  /** 'A' actif, 'D' désactivé — état du compte dans l'annuaire PARTAGÉ. */
  compte: string | null;
  lib_service: string | null;
  role_santeplus: number | null;
  id_role: number | null;
  lib_role: string | null;
  portee: string | null;
}

export interface LigneReprise {
  id_log: number;
  id_legacy: string;
  message: string;
  date_action: string;
  nom: string | null;
  mail: string | null;
  /** Le dossier de l'ancienne plateforme, pour pré-remplir la création. */
  legacy: {
    nom_user: string;
    prenom_user: string;
    mail_user: string | null;
    tel_user: string | null;
    cat_acc: number;
    param: number;
    code_role_suggere: string | null;
    /** L'ancien compte avait le menu Paramètres — montré, jamais appliqué. */
    avait_parametres: boolean;
  } | null;
}

export interface NouveauCompte {
  login: string;
  nom_user: string;
  prenom_user: string;
  mail_user?: string | null;
  tel_user?: string | null;
  post_user?: string | null;
  id_service: number;
  id_role: number;
  /** Clôt la ligne de reprise correspondante, s'il y en a une. */
  id_legacy?: string;
}

export const listComptes = (q?: {
  q?: string; role?: number; limit?: number;
}): Promise<{ comptes: CompteRow[]; total: number; recherche: boolean }> =>
  apiGet(withQuery("/api/comptes", { q: q?.q, role: q?.role, limit: q?.limit }));

export const listReprise = (): Promise<{ lignes: LigneReprise[] }> =>
  apiGet("/api/comptes/reprise");

export const listRolesAssignables = (): Promise<{
  roles: Array<{ id_role: number; code: string; lib_role: string; portee: string; nb: number }>;
}> => apiGet("/api/comptes/roles");

/**
 * Créer un compte dans l'annuaire, et lui donner son rôle dans la foulée.
 *
 * Renvoie le mot de passe initial UNE fois — il n'est jamais relu ensuite, la
 * base ne garde qu'un hachage.
 */
export const creerCompte = (
  body: NouveauCompte,
): Promise<{ id_user: number; login: string; mot_de_passe: string }> =>
  apiPost("/api/comptes", body);

export interface LigneRapport {
  id_legacy: string;
  nom: string;
  action: "rattache" | "cree" | "echec";
  login?: string;
  mot_de_passe?: string;
  role?: string;
  service?: string;
  motif?: string;
}

export interface RapportMigration {
  simulation: boolean;
  rattaches: number;
  crees: number;
  echecs: number;
  lignes: LigneRapport[];
}

/**
 * Reprendre EN LOT les comptes de l'ancienne plateforme.
 *
 * `simulation: true` calcule tout sans rien écrire — c'est ainsi qu'on
 * regarde avant d'écrire dans l'annuaire partagé. `id_service_defaut` sert
 * aux comptes dont le service legacy n'a pas d'équivalent santeplus ; sans
 * lui, ces lignes sont signalées plutôt que rangées au hasard.
 */
export const migrerComptesLegacy = (body: {
  simulation?: boolean;
  id_service_defaut?: number;
  ids_legacy?: string[];
}): Promise<RapportMigration> => apiPost("/api/comptes/reprise/migrer", body);

/** Clore une ligne de reprise sans créer de compte (personne partie, homonyme tranché). */
export const cloreReprise = (
  id_legacy: string, motif?: string,
): Promise<{ ok: true }> =>
  apiPost(`/api/comptes/reprise/${id_legacy}/clore`, { motif });

/** `null` retire le rôle — c'est ainsi qu'on ferme l'accès à l'inventaire. */
export const attribuerRole = (
  id_user: number, id_role: number | null,
): Promise<{ ok: true }> => apiPut(`/api/comptes/${id_user}/role`, { id_role });
