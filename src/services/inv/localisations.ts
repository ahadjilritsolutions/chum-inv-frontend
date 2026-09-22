import { apiDelete, apiGet, apiPost, apiPut, withQuery } from "@/lib/api/http";

export interface LocalisationRow {
  id_localisation: number;
  code: string | null;
  libelle: string;
  description: string | null;
  numero: string | null;
  etage: string | null;
  actif: number;
  id_service: number;
  id_type_localisation: number | null;
  type_localisation: string | null;
  nb_articles: number;
  /** Ce qui empêcherait la suppression — calculé par le serveur, pas deviné ici. */
  nb_mouvements: number;
  nb_documents: number;
}

export interface LocalisationPayload {
  libelle: string;
  code?: string | null;
  description?: string | null;
  numero?: string | null;
  etage?: string | null;
  id_service: number;
  id_type_localisation?: number | null;
  actif?: number;
}

export const listLocalisationsConfig = (q?: {
  q?: string; service?: number; actifs?: boolean;
}): Promise<{ localisations: LocalisationRow[] }> =>
  apiGet(
    withQuery("/api/localisations", {
      q: q?.q,
      service: q?.service,
      actifs: q?.actifs ? "1" : undefined,
    }),
  );

export const creerLocalisation = (
  body: LocalisationPayload,
): Promise<{ id_localisation: number }> => apiPost("/api/localisations", body);

export const modifierLocalisation = (
  id: number, body: LocalisationPayload,
): Promise<{ ok: true }> => apiPut(`/api/localisations/${id}`, body);

/** Refusée par le serveur si un article, un mouvement ou un document s'y rattache. */
export const supprimerLocalisation = (id: number): Promise<{ ok: true }> =>
  apiDelete(`/api/localisations/${id}`);
