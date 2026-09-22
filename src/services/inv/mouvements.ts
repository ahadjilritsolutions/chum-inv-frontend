import { apiGet, apiPost, withQuery } from "@/lib/api/http";
import type {
  DemandesResponse, MouvementListResponse, MouvementQuery,
} from "@/types/inv/mouvement";

export const listMouvements = (q: MouvementQuery): Promise<MouvementListResponse> =>
  apiGet(withQuery("/api/mouvements", q as Record<string, string | number | undefined>));

export const transferer = (body: {
  articles: number[];
  id_localisation_destination: number;
  motif?: string;
  avec_document?: boolean;
}): Promise<{ transferes: number; id_document: number | null }> =>
  apiPost("/api/mouvements/transfert", body);

export const listDemandesReforme = (q: {
  q?: string; service?: number; page?: number; limit?: number;
}): Promise<DemandesResponse> =>
  apiGet(withQuery("/api/mouvements/reforme/demandes", q));

export const proposerReforme = (id_article: number, motif: string): Promise<{ ok: true }> =>
  apiPost("/api/mouvements/reforme/proposer", { id_article, motif });

/**
 * Réformer SANS demande préalable — le « Reformer » du menu legacy.
 *
 * Même acte final que traiterReforme(« accepter ») : même PV, même mouvement,
 * même statut d'arrivée. Ce qui diffère est le point de départ — un bien encore
 * en service au lieu d'une demande déposée — et le droit exigé.
 *
 * Le motif est obligatoire : sans demande en amont, le PV est le seul endroit
 * où la raison de la sortie sera écrite.
 */
export const reformerDirectement = (body: {
  articles: number[];
  motif: string;
}): Promise<{ traites: number; id_document: number | null }> =>
  apiPost("/api/mouvements/reforme/directe", body);

/** Accepter crée (ou complète) un PV ; refuser exige un motif. */
export const traiterReforme = (body: {
  articles: number[];
  decision: "accepter" | "refuser";
  motif?: string;
}): Promise<{ traites: number; id_document: number | null }> =>
  apiPost("/api/mouvements/reforme/traiter", body);
