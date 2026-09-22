import { apiGet } from "@/lib/api/http";

export interface Compte {
  libelle: string;
  n: number;
  /** Absent quand la session n'a pas `statistiques.valorisation`. */
  valeur?: number;
  couleur?: string | null;
  hors_service?: number;
}

export interface Statistiques {
  /** false = le serveur a RETIRÉ les montants, il ne les a pas masqués. */
  valorisation: boolean;
  totaux: {
    articles: number;
    valeur: number;
    valeur_moyenne: number;
    localisations: number;
    services: number;
  };
  par_statut: Compte[];
  par_etat: Compte[];
  par_presence: Compte[];
  par_categorie: Compte[];
  par_service: Compte[];
  par_localisation: Compte[];
  par_voie: Compte[];
  par_annee: Array<{ annee: number; n: number; valeur?: number }>;
  qualite: {
    sans_localisation: number;
    sans_date_inventaire: number;
    sans_categorie: number;
    sans_valeur: number;
    sans_numero_serie: number;
    presence_non_verifiee: number;
    sans_fournisseur: number;
  };
  mouvements: Array<{ mois: string; type: string; n: number }>;
  plus_chers: Array<{
    num_inventaire: string;
    designation: string;
    valeur: number;
    localisation: string;
  }>;
}

export const getStatistiques = (): Promise<Statistiques> => apiGet("/api/statistiques");
