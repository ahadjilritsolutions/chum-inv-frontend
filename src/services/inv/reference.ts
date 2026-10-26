import { apiGet, withQuery } from "@/lib/api/http";
import type {
  CatalogueComplet,
  LocalisationOption,
  Lookup,
  ReferenceFeed,
} from "@/types/inv/reference";

/**
 * Every dropdown vocabulary in one call.
 *
 * Fetched once per screen rather than per select: these are a few hundred rows
 * that change about twice a year, and six parallel requests to populate one
 * filter bar is the kind of thing that makes a page feel slow for no reason.
 */
export const getReference = (): Promise<ReferenceFeed> =>
  apiGet<ReferenceFeed>("/api/reference");

/** Cascading: families of one category, sub-families of one family. */
export const getFamilles = (categorie?: number): Promise<Lookup[]> =>
  apiGet<Lookup[]>(withQuery("/api/reference/familles", { categorie }));

export const getSousFamilles = (famille?: number): Promise<Lookup[]> =>
  apiGet<Lookup[]>(withQuery("/api/reference/sous-familles", { famille }));

/** Already narrowed to the session's service scope by the API. */
export const getLocalisations = (service?: number): Promise<LocalisationOption[]> =>
  apiGet<LocalisationOption[]>(withQuery("/api/reference/localisations", { service }));

/**
 * Le catalogue entier en UN appel, parents compris.
 *
 * A preferer a getFamilles/getSousFamilles des que le formulaire doit remonter
 * la hierarchie : 809 lignes au CHU Mustapha, contre un aller-retour par
 * niveau et l obligation de descendre dans l ordre.
 */
export const getCatalogue = (): Promise<CatalogueComplet> =>
  apiGet<CatalogueComplet>("/api/reference/catalogue");
