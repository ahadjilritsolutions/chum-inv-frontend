/** Mirrors chum-inv-backend/src/modules/mouvements. */

export interface MouvementRow {
  id_mouvement: number;
  type: string;
  date_mouvement: string;
  commentaire: string | null;
  id_user: number;
  id_article: number;
  num_inventaire: string;
  designation: string;
  categorie: string | null;
  famille: string | null;
  sous_famille: string | null;
  loc_avant: string | null;
  service_avant: number | null;
  loc_apres: string | null;
  service_apres: number | null;
  id_document: number | null;
  num_document: string | null;
}

export interface MouvementListResponse {
  total: number;
  page: number;
  limit: number;
  pages: number;
  mouvements: MouvementRow[];
}

export interface MouvementQuery {
  type?: string;
  article?: number;
  service?: number;
  localisation?: number;
  categorie?: number;
  famille?: number;
  sous_famille?: number;
  du?: string;
  au?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface DemandeReforme {
  id_article: number;
  num_inventaire: string;
  designation: string;
  valeur: string;
  localisation: string | null;
  id_service: number | null;
  categorie: string | null;
  etat: string | null;
  etat_couleur: string | null;
  motif: string | null;
  date_demande: string | null;
}

export interface DemandesResponse {
  total: number;
  page: number;
  limit: number;
  pages: number;
  demandes: DemandeReforme[];
}
