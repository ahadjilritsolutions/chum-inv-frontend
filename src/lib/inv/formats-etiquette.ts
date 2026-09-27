/**
 * LE FORMAT DE L'ÉTIQUETTE — UN SEUL, 90 × 40 mm, EN PAYSAGE.
 *
 * ── C'EST LE ROULEAU QUI COMMANDE, PAS LE DESSIN ────────────────────────────
 * L'étiquette a d'abord été dessinée en PORTRAIT (40 large × 90 haut), sur la
 * lecture d'un exemplaire décollé d'un téléphone. La première impression réelle
 * sur la Godex G300 a tranché autrement : le support avance dans le sens de la
 * longueur, 90 mm de large sur 40 mm de haut, et un gabarit portrait envoyé sur
 * ce rouleau sort tourné et coupé.
 *
 * Une étiqueteuse thermique ne « met pas en page » : elle déroule une longueur
 * de ruban et imprime dessus. La géométrie du document DOIT donc être celle du
 * consommable, au millimètre — c'est la seule dimension de tout ce module qui
 * ne se discute pas, parce qu'elle est physique.
 *
 * ── POURQUOI LA TAILLE N'EST PLUS DEMANDÉE ──────────────────────────────────
 * Elle l'a été un temps, sur l'idée qu'un service puisse acheter un autre
 * support. Dans les faits il n'y en a qu'un, et poser la question à chaque
 * impression revenait à faire choisir entre une bonne réponse et trois
 * mauvaises — dont une qui sort des étiquettes inutilisables sur le rouleau en
 * stock.
 *
 * La CONSTANTE reste : la géométrie du composant s'exprime en parts de
 * `largeur`/`hauteur`, et le jour où un second support existera vraiment il
 * suffira d'ajouter une entrée — pas de redécouper l'étiquette.
 */

export type OrientationEtiquette = "portrait" | "paysage";

export interface FormatEtiquette {
  cle: string;
  libelle: string;
  /** En millimètres — jamais en pixels : le support est physique. */
  largeur: number;
  hauteur: number;
  orientation: OrientationEtiquette;
}

export const FORMAT_ETIQUETTE: FormatEtiquette = {
  cle: "90x40",
  libelle: "90 × 40 mm",
  largeur: 90,
  hauteur: 40,
  orientation: "paysage",
};

/** Conservé sous son ancien nom : c'est le format, et il est par défaut. */
export const FORMAT_PAR_DEFAUT = FORMAT_ETIQUETTE;

/**
 * L'échelle typographique d'un format.
 *
 * Les corps sont dessinés pour le format de référence de chaque disposition,
 * puis multipliés. C'est la dimension qui PORTE LE TEXTE qui commande : la
 * hauteur en paysage, la largeur en portrait — puisque le texte y est tourné et
 * que c'est donc la largeur de l'étiquette qui limite le nombre de lignes.
 */
export const echelle = (f: FormatEtiquette): number =>
  f.orientation === "portrait" ? f.largeur / 40 : f.hauteur / 40;
