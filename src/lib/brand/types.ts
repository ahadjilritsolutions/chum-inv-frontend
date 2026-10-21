// Mirror of the backend's modules/branding/branding.types.ts. Kept as a
// hand-written copy rather than a shared package because these three
// frontends have no build-time dependency on one another — if you change the
// payload, change it on both sides in the same commit.

import { PRODUIT } from "./product";

/** Which lines the printed document header draws, and how. */
export interface EnteteConfig {
  afficher_logo: boolean;
  /** "République Algérienne Démocratique et Populaire" — the first line of
   *  every Algerian public-hospital letterhead. Off for a private clinic. */
  afficher_republique: boolean;
  afficher_nom: boolean;
  /** Only ever drawn when `nom_ar` is actually filled in. */
  afficher_nom_ar: boolean;
  afficher_slogan: boolean;
  afficher_adresse: boolean;
  afficher_telephone: boolean;
  afficher_email: boolean;
  afficher_qr: boolean;
  alignement: "left" | "center";
  /** Prefixes the date line: "Alger le : 14/10/2026". Empty → "Le : …". */
  ville: string | null;
  /** Free lines appended under the contact block, one per "\n". */
  texte: string | null;
}

/**
 * Les trois teintes que l'établissement pilote.
 *
 * `null` = « garder celle du produit ». Ce n'est PAS la couleur L&R
 * recopiée : il faut pouvoir distinguer un choix d'une absence de choix,
 * sinon faire évoluer la palette produit ne rattraperait jamais les
 * installations déjà livrées.
 */
export interface Couleurs {
  primaire: string | null;
  secondaire: string | null;
  accent: string | null;
}

export interface BrandingIdentite {
  nom: string;
  nom_court: string;
  nom_ar: string | null;
  slogan: string | null;
  adresse: string | null;
  commune: string | null;
  wilaya: string | null;
  telephone: string | null;
  email: string | null;
  site_web: string | null;
}

export interface Branding extends BrandingIdentite {
  entete: EnteteConfig;
  /** Indépendant de `par_defaut` : on peut nommer l'établissement sans
   *  toucher à ses couleurs, et l'inverse. */
  couleurs: Couleurs;
  /** Backend-relative path to the uploaded logo, already cache-busted, or
   *  null when none was uploaded. Resolve it with `logoSrc()` — never put it
   *  in an `src` directly, it is relative to the API, not to the page. */
  logo_url: string | null;
  /** True while the installation is still showing the shipped product
   *  identity rather than a customer's. */
  par_defaut: boolean;
}

export interface BrandingUpdate extends Partial<BrandingIdentite> {
  entete?: Partial<EnteteConfig>;
  /** A `data:image/…;base64,…` URL replaces the logo, `null` removes it,
   *  absent leaves it alone. */
  logo?: string | null;
}

export const ENTETE_DEFAUT: EnteteConfig = {
  afficher_logo: true,
  afficher_republique: true,
  afficher_nom: true,
  afficher_nom_ar: true,
  afficher_slogan: false,
  afficher_adresse: false,
  afficher_telephone: false,
  afficher_email: false,
  afficher_qr: true,
  alignement: "center",
  ville: null,
  texte: null,
};

/** What every surface renders before the first fetch resolves, and what it
 *  keeps rendering if the backend is unreachable. Equal to what the backend
 *  itself answers for an unconfigured install, so the screen does not change
 *  under the user when the request lands. */
export const BRANDING_DEFAUT: Branding = {
  nom: PRODUIT.nom,
  nom_court: PRODUIT.nom_court,
  nom_ar: null,
  slogan: PRODUIT.slogan,
  adresse: null,
  commune: null,
  wilaya: null,
  telephone: null,
  email: null,
  site_web: null,
  entete: ENTETE_DEFAUT,
  couleurs: { primaire: null, secondaire: null, accent: null },
  logo_url: null,
  par_defaut: true,
};
