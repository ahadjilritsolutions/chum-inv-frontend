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
