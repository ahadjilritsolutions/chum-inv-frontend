/**
 * LES FORMATS D'ÉTIQUETTE.
 *
 * ── DEUX DISPOSITIONS, PAS SEULEMENT DEUX TAILLES ───────────────────────────
 *
 * PORTRAIT — l'étiquette réellement posée sur le parc : haute et étroite, le
 *   texte tourné à 90°, l'écusson au milieu, un grand QR en bas. C'est ce que
 *   montre le gabarit de l'étiqueteuse (40 × 90 mm) et ce qu'on lit sur un
 *   exemplaire décollé d'un téléphone. Le texte est tourné parce qu'une
 *   désignation comme « TELEPHONE-ANALOGIQUE » ne tient pas en travers de
 *   40 mm : dans le sens de la longueur, elle tient sur une ligne.
 *
 * PAYSAGE — la même information à plat, pour qui imprime sur des planches
 *   larges plutôt que sur du ruban.
 *
 * La disposition suit le FORMAT et n'est pas une option séparée : un texte
 * tourné sur une étiquette large serait illisible, et un texte à plat sur
 * 40 mm de large tiendrait sur trois lignes coupées.
 *
 * ── POURQUOI ON DEMANDE LA TAILLE ───────────────────────────────────────────
 * Une étiquette sort sur un support ACHETÉ — rouleau d'étiqueteuse, planche
 * prédécoupée. Le service qui imprime sait ce qu'il a en stock ; l'application
 * ne peut pas le deviner, et imposer une taille garantit qu'au prochain
 * changement de stock plus rien ne tombe sur les découpes.
 */

export type OrientationEtiquette = "portrait" | "paysage";

export interface FormatEtiquette {
  cle: string;
  libelle: string;
  /** En millimètres — jamais en pixels : le support est physique. */
  largeur: number;
  hauteur: number;
  orientation: OrientationEtiquette;
  detail?: string;
}

export const FORMATS_ETIQUETTE: readonly FormatEtiquette[] = [
  {
    cle: "40x90",
    libelle: "40 × 90 mm",
    largeur: 40,
    hauteur: 90,
    orientation: "portrait",
    detail: "Le format des étiquettes posées sur le parc — texte tourné, grand QR",
  },
  {
    cle: "30x70",
    libelle: "30 × 70 mm",
    largeur: 30,
    hauteur: 70,
    orientation: "portrait",
    detail: "Même disposition, pour le petit matériel",
  },
  {
    cle: "80x35",
    libelle: "80 × 35 mm",
    largeur: 80,
    hauteur: 35,
    orientation: "paysage",
    detail: "À plat — texte à gauche, QR à droite",
  },
  {
    cle: "100x50",
    libelle: "100 × 50 mm",
    largeur: 100,
    hauteur: 50,
    orientation: "paysage",
    detail: "À plat, plus lisible à distance",
  },
];

export const FORMAT_PAR_DEFAUT = FORMATS_ETIQUETTE[0];

export const formatParCle = (cle: string): FormatEtiquette =>
  FORMATS_ETIQUETTE.find((f) => f.cle === cle) ?? FORMAT_PAR_DEFAUT;

/**
 * L'échelle typographique d'un format.
 *
 * Les corps sont dessinés pour le format de référence de chaque disposition,
 * puis multipliés. C'est la dimension qui PORTE LE TEXTE qui commande : la
 * hauteur en paysage, la largeur en portrait — puisque le texte y est tourné et
 * que c'est donc la largeur de l'étiquette qui limite le nombre de lignes.
 */
export const echelle = (f: FormatEtiquette): number =>
  f.orientation === "portrait" ? f.largeur / 40 : f.hauteur / 35;
