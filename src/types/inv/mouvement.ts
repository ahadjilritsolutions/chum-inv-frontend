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

/** L'en-tête d'une fiche de transfert, tel que l'imprime FicheTransfertPrint. */
export interface FicheTransfertDoc {
  id_document: number;
  numero: string;
  date_document: string | null;
  motif: string | null;
  observation: string | null;
  loc_source: string | null;
  loc_destination: string | null;
  service_source: string | null;
  service_destination: string | null;
  type_code: string | null;
  type_libelle: string | null;
}

/** Une ligne de la fiche — un bien déplacé. */
export interface FicheTransfertLigne {
  id_article: number;
  num_inventaire: string;
  designation: string;
  marque: string | null;
  modele: string | null;
  num_serie: string | null;
  etat: string | null;
}

export interface FicheTransfertResponse {
  document: FicheTransfertDoc;
  lignes: FicheTransfertLigne[];
}
