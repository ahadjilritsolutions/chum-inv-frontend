"use client";

import type { ReactNode } from "react";

/**
 * LES PRIMITIVES DE GRAPHIQUE — en HTML, sans librairie.
 *
 * ── POURQUOI PAS DE LIBRAIRIE ───────────────────────────────────────────────
 * Ce dont cette page a besoin — des barres de rang et une série mensuelle — se
 * dessine en div et en SVG. Ajouter 200 ko de dépendance pour cela coûterait
 * plus cher que le code ci-dessous, et rendrait le chargement de la page
 * tributaire d'un CDN sur un réseau hospitalier interne.
 *
 * ── LES RÈGLES QUI SONT SUIVIES ICI, ET POURQUOI ────────────────────────────
 *
 * ① UNE SEULE TEINTE POUR LA MAGNITUDE. Un classement de catégories n'est PAS
 *    huit séries : c'est UNE mesure sur huit lignes. Les peindre de huit
 *    couleurs ferait croire à huit choses différentes et rendrait le graphique
 *    illisible en vision daltonienne. Une teinte unique, la longueur porte
 *    l'information. Teinte validée (bleu #2a78d6, contraste ≥ 3:1 sur blanc).
 *
 * ② L'IDENTITÉ N'EST JAMAIS PORTÉE PAR LA COULEUR SEULE. Chaque barre est
 *    étiquetée en toutes lettres à sa gauche. Le point coloré des états et
 *    statuts n'est qu'un rappel des pastilles utilisées partout ailleurs dans
 *    l'application — il double le texte, il ne le remplace pas.
 *
 * ③ LE TEXTE GARDE SES COULEURS DE TEXTE. Les valeurs et libellés restent en
 *    encre slate ; seule la barre porte la teinte de série. Un chiffre écrit
 *    dans la couleur de sa barre devient illisible dès que la barre est claire.
 *
 * ④ PAS DE CAMEMBERT. Comparer des angles est plus difficile que comparer des
 *    longueurs, et au-delà de trois parts un camembert ne se lit plus. Les
 *    répartitions sont donc des barres, comme les classements.
 *
 * ⑤ DEUX ÉCHELLES SUR UN MÊME GRAPHIQUE : JAMAIS. Les effectifs et les
 *    montants ne partagent pas d'axe ; quand les deux sont utiles, ce sont deux
 *    blocs.
 *
 * La grille et les axes sont volontairement effacés (hairline slate-200) : ce
 * sont des repères, pas des données.
 */

/** La teinte de magnitude — validée sur surface blanche. */
export const SERIE = "#2a78d6";
/** La seconde teinte, pour le SEUL graphique qui porte deux séries. */
export const SERIE_2 = "#eb6834";

export function Carte({
  titre, sous_titre, children, action,
}: {
  titre: string;
  sous_titre?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-semibold text-slate-800">{titre}</h3>
          {sous_titre && <p className="text-[11.5px] text-slate-400">{sous_titre}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** Le chiffre qu'on vient chercher — pas un graphique, juste un nombre lisible. */
export function Tuile({
  libelle, valeur, detail, ton = "neutre", icone,
}: {
  libelle: string;
  valeur: string;
  detail?: string;
  /** `alerte` colore le chiffre : c'est du travail en attente, pas un total. */
  ton?: "neutre" | "alerte" | "bien";
  icone?: ReactNode;
}) {
  const encre =
    ton === "alerte" ? "text-[#d03b3b]" : ton === "bien" ? "text-[#0ca30c]" : "text-slate-800";
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-slate-500">
        {icone}
        {libelle}
      </div>
      <p className={`mt-1 text-[22px] font-bold leading-tight tabular-nums ${encre}`}>
        {valeur}
      </p>
      {detail && <p className="text-[11px] text-slate-400">{detail}</p>}
    </div>
  );
}

export interface LigneBarre {
  libelle: string;
  n: number;
  valeur?: number;
  couleur?: string | null;
}

/**
 * Un classement en barres horizontales.
 *
 * Horizontales et non verticales : les libellés sont des mots (« MATERIEL-
 * INFORMATIQUE »), et des mots sous un axe vertical finissent inclinés à 45° ou
 * tronqués. À l'horizontale ils se lisent normalement.
 */
export function Barres({
  lignes, montants = false, max,
}: {
  lignes: LigneBarre[];
  /** Afficher la colonne de valeur — seulement si la session y a droit. */
  montants?: boolean;
  max?: number;
}) {
  if (lignes.length === 0) {
    return <p className="py-6 text-center text-[12.5px] italic text-slate-400">Aucune donnée.</p>;
  }
  // L'échelle part TOUJOURS de zéro. Une barre tronquée exagère les écarts.
  const plafond = max ?? Math.max(...lignes.map((l) => l.n), 1);

  return (
    <ul className="space-y-1.5">
      {lignes.map((l) => {
        const pct = plafond > 0 ? (l.n / plafond) * 100 : 0;
        return (
          <li key={l.libelle} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  {l.couleur && (
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: l.couleur }}
                    />
                  )}
                  <span className="truncate text-[12px] text-slate-600">{l.libelle}</span>
                </span>
                <span className="shrink-0 text-[12px] font-semibold tabular-nums text-slate-800">
                  {l.n.toLocaleString("fr-DZ")}
                </span>
              </div>
              {/* Piste effacée + barre à bout arrondi, ancrée à zéro. */}
              <div
                className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100"
                role="img"
                aria-label={`${l.libelle} : ${l.n}`}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${Math.max(pct, l.n > 0 ? 2 : 0)}%`, background: SERIE }}
                  title={`${l.libelle} — ${l.n.toLocaleString("fr-DZ")}`}
                />
              </div>
            </div>
            {montants && l.valeur !== undefined && (
              <span className="whitespace-nowrap text-[11.5px] tabular-nums text-slate-500">
                {Math.round(l.valeur).toLocaleString("fr-DZ")} DA
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Les mouvements des douze derniers mois — DEUX séries, donc une légende.
 *
 * Barres groupées plutôt qu'empilées : on compare transferts et réformes entre
 * eux mois par mois, et un empilement ne permet de lire précisément que le
 * segment du bas. Un écart de 2 px sépare les deux barres d'un même mois, pour
 * qu'elles ne se lisent pas comme une seule.
 */
export function SerieMensuelle({
  mois,
}: {
  mois: Array<{ mois: string; transfert: number; reforme: number }>;
}) {
  if (mois.length === 0) {
    return (
      <p className="py-6 text-center text-[12.5px] italic text-slate-400">
        Aucun mouvement sur les douze derniers mois.
      </p>
    );
  }
  const plafond = Math.max(...mois.flatMap((m) => [m.transfert, m.reforme]), 1);
  const H = 120;

  const libelleMois = (m: string) => {
    const [a, mm] = m.split("-");
    return `${mm}/${a.slice(2)}`;
  };

  return (
    <div>
      {/* La légende est obligatoire dès deux séries : la couleur ne peut pas
          être le seul porteur de l'identité. */}
      <div className="mb-3 flex flex-wrap items-center gap-4">
        {[
          { l: "Transferts", c: SERIE },
          { l: "Réformes", c: SERIE_2 },
        ].map((s) => (
          <span key={s.l} className="flex items-center gap-1.5 text-[11.5px] text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.c }} />
            {s.l}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-[520px] items-end gap-2" style={{ height: H }}>
          {mois.map((m) => (
            <div key={m.mois} className="flex flex-1 flex-col items-center justify-end gap-1">
              <div className="flex h-full w-full items-end justify-center gap-[2px]">
                {[
                  { v: m.transfert, c: SERIE, nom: "transferts" },
                  { v: m.reforme, c: SERIE_2, nom: "réformes" },
                ].map((b) => (
                  <div
                    key={b.nom}
                    title={`${libelleMois(m.mois)} — ${b.v} ${b.nom}`}
                    className="w-full max-w-[14px] rounded-t transition-[height] duration-300"
                    style={{
                      height: `${b.v > 0 ? Math.max((b.v / plafond) * (H - 18), 3) : 0}px`,
                      background: b.c,
                    }}
                  />
                ))}
              </div>
              <span className="whitespace-nowrap text-[10px] tabular-nums text-slate-400">
                {libelleMois(m.mois)}
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* Ligne de base : un repère, volontairement effacé. */}
      <div className="mt-1 h-px w-full bg-slate-200" />
    </div>
  );
}
