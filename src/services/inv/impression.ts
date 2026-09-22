import { apiGet, withQuery } from "@/lib/api/http";

export interface LigneImpression {
  id_article: number;
  num_inventaire: string;
  num_registre: string | null;
  est_registre: number;
  designation: string;
  categorie: string | null;
  famille: string | null;
  marque: string | null;
  modele: string | null;
  num_serie: string | null;
  etat: string | null;
  statut: string | null;
  presence: string | null;
  valeur: string;
  date_inventaire: string | null;
  id_localisation: number | null;
  localisation: string | null;
  id_service: number | null;
}

export interface GroupeImpression {
  id_localisation: number | null;
  localisation: string;
  lignes: LigneImpression[];
  total_valeur: number;
}

export interface FiltresImpression {
  service?: number;
  localisation?: number;
  categorie?: number;
  statut?: string;
  /** 'localisation' ventile par local ; 'aucun' rend une seule liste. */
  groupe?: "localisation" | "aucun";
  inclure_sortis?: boolean;
}

const params = (f: FiltresImpression) => ({
  service: f.service,
  localisation: f.localisation,
  categorie: f.categorie,
  statut: f.statut,
  groupe: f.groupe,
  inclure_sortis: f.inclure_sortis ? "1" : undefined,
});

export const getInventaire = (
  f: FiltresImpression,
): Promise<{ total: number; total_valeur: number; groupes: GroupeImpression[] }> =>
  apiGet(withQuery("/api/impression/inventaire", params(f)));

export const getEtiquettes = (
  f: FiltresImpression,
): Promise<{
  total: number;
  etiquettes: Array<{
    id_article: number;
    num_inventaire: string;
    designation: string;
    localisation: string | null;
    service: string | null;
    marque: string | null;
    modele: string | null;
    num_serie: string | null;
  }>;
}> => apiGet(withQuery("/api/impression/etiquettes", params(f)));
