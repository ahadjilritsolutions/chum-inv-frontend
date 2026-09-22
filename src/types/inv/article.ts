/** Mirrors chum-inv-backend/src/modules/articles. */

export interface ArticleRow {
  id_article: number;
  num_inventaire: string;
  designation: string;
  categorie: string | null;
  famille: string | null;
  localisation: string | null;
  id_service: number | null;
  etat_code: string | null;
  etat: string | null;
  etat_couleur: string | null;
  hors_service: number | null;
  statut_code: string;
  statut: string;
  statut_couleur: string | null;
  presence_code: string | null;
  presence: string | null;
  marque: string | null;
  num_serie: string | null;
  valeur: string;
  date_inventaire: string | null;
  supprime: number;
  /**
   * Par quelle VOIE le numéro a été attribué — le `mobilier.id_reg` du legacy.
   *
   * 0 PHYSIQUE : le compteur a numéroté ce que la tournée a trouvé, et
   *   `num_registre` est un renvoi LIBRE vers l'ancien cahier papier.
   * 1 REGISTRE : le numéro a été TRANSCRIT du registre officiel, et
   *   `num_registre` le répète.
   */
  est_registre: number;
  num_registre: string | null;
}

export interface StatutCompteur {
  code: string;
  libelle: string;
  couleur: string | null;
  ordre: number;
  n: string;
}

export interface ArticleListResponse {
  total: number;
  page: number;
  limit: number;
  pages: number;
  articles: ArticleRow[];
  compteurs: StatutCompteur[];
  portee: { tous: boolean; services: number[] };
}

/**
 * The detail row — every column plus the resolved labels.
 *
 * The endpoint selects `a.*`, so the raw foreign keys come back alongside the
 * joined labels. Both are needed and they are not interchangeable: the labels
 * are what a human reads, the ids are what the edit form posts back.
 */
export interface ArticleDetail extends ArticleRow {
  id_categorie: number | null;
  id_famille: number | null;
  id_sous_famille: number | null;
  id_localisation: number | null;
  id_etat: number | null;
  id_statut: number;
  id_presence: number | null;
  id_fournisseur: number | null;
  id_fabricant: number | null;
  id_type_doc_reception: number | null;
  num_registre: string | null;
  est_registre: number;
  sous_famille: string | null;
  localisation_code: string | null;
  modele: string | null;
  pays_origine: string | null;
  fournisseur_texte_legacy: string | null;
  fabricant_texte_legacy: string | null;
  date_mise_service: string | null;
  annee_inventaire: string | null;
  num_doc_reception: string | null;
  num_facture: string | null;
  date_facture: string | null;
  type_observation: string | null;
  observation: string | null;
  date_creation: string;
  date_modification: string | null;
  date_suppression: string | null;
  motif_suppression: string | null;
  id_article_legacy: number | null;
  source_legacy: string | null;
  presence_couleur: string | null;
  date_derniere_presence: string | null;

  // ── Ce que porte la FICHE IMPRIMÉE et qu'aucune liste n'affiche ──────────
  // Le legacy imprimait les coordonnées des tiers parce qu'une fiche sert à
  // APPELER quelqu'un : le vendeur pour une garantie, le fabricant pour une
  // pièce. Un nom sans téléphone oblige à rouvrir l'application.
  localisation_description: string | null;
  localisation_etage: string | null;
  localisation_numero: string | null;
  fournisseur: string | null;
  fournisseur_adresse: string | null;
  fournisseur_nom: string | null;
  fournisseur_prenom: string | null;
  fournisseur_telephone: string | null;
  fournisseur_email: string | null;
  fabricant: string | null;
  fabricant_adresse: string | null;
  fabricant_nom: string | null;
  fabricant_prenom: string | null;
  fabricant_telephone: string | null;
  fabricant_email: string | null;
  fabricant_pays: string | null;
}

export interface ArticleStats {
  total: number;
  hors_service: number;
  a_reformer: number;
  presence_non_verifiee: number;
  valeur_totale: string;
  localisations: number;
  par_statut: StatutCompteur[];
  par_categorie: Array<{ libelle: string | null; n: string }>;
}

export interface HistoriqueLigne {
  id_historique: number;
  champ: string;
  ancienne_valeur: string | null;
  nouvelle_valeur: string | null;
  date_modification: string;
  id_user: number;
}

export interface ArticleQuery {
  q?: string;
  statut?: string;
  etat?: string;
  presence?: string;
  categorie?: number;
  famille?: number;
  localisation?: number;
  service?: number;
  /** 'oui' = seulement le registre, 'non' = seulement le physique. */
  registre?: "oui" | "non";
  supprimes?: "sans" | "seuls" | "tous";
  page?: number;
  limit?: number;
  tri?: string;
  sens?: "asc" | "desc";
}
