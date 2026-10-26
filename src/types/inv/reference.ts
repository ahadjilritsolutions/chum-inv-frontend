/** Mirrors GET /api/reference. */

export interface Lookup {
  id: number;
  code: string;
  libelle: string;
  couleur?: string | null;
  ordre?: number;
  hors_service?: number;
}

export interface ServiceRef {
  id_service: number;
  lib_service: string;
  cod_service: string | null;
}

export interface TiersOption {
  id: number;
  libelle: string;
}

export interface ReferenceFeed {
  etats: Lookup[];
  statuts_article: Lookup[];
  presences: Lookup[];
  categories: Lookup[];
  types_localisation: Lookup[];
  types_document_reception: Lookup[];
  types_intervention: Lookup[];
  statuts_intervention: Lookup[];
  fournisseurs: TiersOption[];
  fabricants: TiersOption[];
  techniciens: TiersOption[];
  services: ServiceRef[];
}

export interface LocalisationOption {
  id_localisation: number;
  libelle: string;
  id_service: number;
  lib_service?: string | null;
}

/**
 * Le catalogue entier, a plat, AVEC les liens de parente.
 *
 * Les trois niveaux arrivent ensemble et chaque ligne porte ses parents : le
 * formulaire peut donc remonter (sous-famille -> famille -> categorie) autant
 * que descendre, et chercher dans les 704 sous-familles sans en avoir d abord
 * choisi la famille.
 */
export interface CatalogueComplet {
  categories: Array<{ id: number; libelle: string }>;
  familles: Array<{ id: number; libelle: string; id_categorie: number }>;
  sous_familles: Array<{
    id: number; libelle: string; id_famille: number; id_categorie: number;
  }>;
}
