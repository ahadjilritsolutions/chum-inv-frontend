import { apiDelete, apiGet, apiPatch, apiPost, apiPut, withQuery } from "@/lib/api/http";
import type {
  ArticleDetail,
  ArticleListResponse,
  ArticleQuery,
  ArticleStats,
  HistoriqueLigne,
} from "@/types/inv/article";

export const listArticles = (q: ArticleQuery): Promise<ArticleListResponse> =>
  apiGet<ArticleListResponse>(
    withQuery("/api/articles", q as Record<string, string | number | undefined>),
  );

export const getArticleStats = (): Promise<ArticleStats> =>
  apiGet<ArticleStats>("/api/articles/stats");

export const getArticle = (id: number): Promise<ArticleDetail> =>
  apiGet<ArticleDetail>(`/api/articles/${id}`);

export const getHistorique = (id: number): Promise<HistoriqueLigne[]> =>
  apiGet<HistoriqueLigne[]>(`/api/articles/${id}/historique`);

// ── Écriture ────────────────────────────────────────────────────────────────

export type ArticlePayload = Record<string, unknown>;

export const creerArticle = (
  body: ArticlePayload,
): Promise<{ id_article: number; num_inventaire: string }> =>
  apiPost("/api/articles", body);

export const creerGroupe = (
  body: ArticlePayload & { nombre: number },
): Promise<{ crees: Array<{ id_article: number; num_inventaire: string }> }> =>
  apiPost("/api/articles/groupe", body);

export const modifierArticle = (
  id: number,
  body: ArticlePayload,
): Promise<{ modifie: number }> => apiPut(`/api/articles/${id}`, body);

export const confirmerPresence = (
  id: number,
  id_presence: number,
): Promise<{ ok: true }> =>
  apiPatch(`/api/articles/${id}/presence`, { id_presence });

/**
 * Confirmer la présence À PARTIR DU NUMÉRO — ce que rend un scanner.
 *
 * Un seul aller-retour, et la résolution du numéro se fait dans la même
 * transaction que l'écriture : voir confirmerPresenceParNumero côté serveur.
 */
export const confirmerPresenceParNumero = (
  num_inventaire: string,
  id_presence?: number,
): Promise<{
  id_article: number;
  num_inventaire: string;
  designation: string;
  localisation: string | null;
  deja_confirme: boolean;
}> => apiPatch("/api/articles/presence", { num_inventaire, id_presence });

export const supprimerArticle = (id: number, motif: string): Promise<{ ok: true }> =>
  apiDelete(`/api/articles/${id}?motif=${encodeURIComponent(motif)}`);

export const restaurerArticle = (id: number): Promise<{ ok: true }> =>
  apiPost(`/api/articles/${id}/restaurer`, {});
