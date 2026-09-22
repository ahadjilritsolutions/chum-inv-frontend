import { apiDelete, apiGet, apiPost, apiPut, withQuery } from "@/lib/api/http";

/** Les trois niveaux, un seul jeu d'appels — voir catalogue.service côté serveur. */
export type Niveau = "categorie" | "famille" | "sous_famille";

export interface LigneCatalogue {
  id: number;
  code: string | null;
  libelle: string;
  actif: number;
  id_parent: number | null;
  parent: string | null;
  nb_articles: number;
  nb_enfants: number;
}

export const listNiveau = (
  niveau: Niveau,
  q?: { parent?: number; q?: string; actifs?: boolean },
): Promise<{ lignes: LigneCatalogue[] }> =>
  apiGet(
    withQuery(`/api/catalogue/${niveau}`, {
      parent: q?.parent,
      q: q?.q,
      actifs: q?.actifs ? "1" : undefined,
    }),
  );

export const creerNiveau = (
  niveau: Niveau,
  body: { libelle: string; code?: string | null; id_parent?: number; ordre?: number; actif?: number },
): Promise<{ id: number }> => apiPost(`/api/catalogue/${niveau}`, body);

export const modifierNiveau = (
  niveau: Niveau,
  id: number,
  body: { libelle: string; code?: string | null; id_parent?: number; ordre?: number; actif?: number },
): Promise<{ ok: true }> => apiPut(`/api/catalogue/${niveau}/${id}`, body);

export const supprimerNiveau = (niveau: Niveau, id: number): Promise<{ ok: true }> =>
  apiDelete(`/api/catalogue/${niveau}/${id}`);
