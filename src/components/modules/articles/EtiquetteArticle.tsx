"use client";

import { useEffect, useState } from "react";
import { qrAvecLogo } from "@/lib/inv/qr-logo";
import {
  echelle, FORMAT_PAR_DEFAUT, type FormatEtiquette,
} from "@/lib/inv/formats-etiquette";

/**
 * L'ÉTIQUETTE D'UN BIEN — DEUX ÉLÉMENTS, RIEN D'AUTRE.
 *
 *   ┌──────────────────────────────────────────┐
 *   │ BUREAU EN BOIS 1.4 M            ┌──────┐ │
 *   │ Ser : …                         │ QR ▣ │ │
 *   │ Art : 0105-000090               │      │ │
 *   │ Mark : A 2 TIROIRS              └──────┘ │
 *   │ NS : #                                   │
 *   │ DIRECTION-DES-MOYENS-MATERIELS           │
 *   └──────────────────────────────────────────┘
 *              90 mm × 40 mm, en paysage
 *
 * ── LA DISPOSITION SUIT LE ROULEAU ──────────────────────────────────────────
 * Le support de la Godex G300 avance dans le sens de la longueur : 90 mm de
 * large, 40 mm de haut. Le texte se lit donc À PLAT, de gauche à droite, et le
 * QR occupe la droite.
 *
 * Il a existé une variante PORTRAIT (40 × 90, texte tourné à 90°), dessinée
 * d'après un exemplaire décollé d'un téléphone. Elle est conservée plus bas
 * parce qu'elle est juste — mais pour un autre consommable. C'est l'impression
 * réelle qui a tranché : sur ce rouleau-ci, un gabarit portrait sort tourné et
 * coupé.
 *
 * ── L'ÉCUSSON EST DANS LE CODE, PAS À CÔTÉ ──────────────────────────────────
 * Il occupait une bande à lui, entre le texte et le QR. Il est désormais
 * composité au centre du QR (voir `lib/inv/qr-logo.ts`, qui passe la correction
 * d'erreur à « H » pour que le code reste lisible malgré le masque), et le code
 * a récupéré la place.
 *
 * ── LES LIBELLÉS COURTS SONT GARDÉS TELS QUELS ──────────────────────────────
 * `Ser`, `Art`, `Mark`, `NS` — les agents les lisent depuis des années. Les
 * remplacer par « Modèle / N° d'inventaire / Marque / N° de série » rendrait
 * l'étiquette plus claire pour qui la découvre et moins lisible pour ceux qui
 * s'en servent — et le parc restera longtemps mixte, moitié anciennes
 * étiquettes, moitié nouvelles.
 *
 * `NS : #` quand le numéro de série manque : c'est ce que fait l'étiquette
 * d'origine, et une valeur vide se lirait comme un défaut d'impression.
 */

export interface DonneesEtiquette {
  num_inventaire: string;
  designation: string;
  localisation?: string | null;
  service?: string | null;
  marque?: string | null;
  modele?: string | null;
  num_serie?: string | null;
}

export default function EtiquetteArticle({
  article, format = FORMAT_PAR_DEFAUT, qr,
}: {
  article: DonneesEtiquette;
  format?: FormatEtiquette;
  qr?: string | null;
}) {
  const k = echelle(format);
  const pt = (base: number) => `${(base * k).toFixed(2)}pt`;

  const service = article.service || article.localisation || "";

  const champs = (
    <>
      {article.modele && <div>Ser : {article.modele}</div>}
      <div className="etiq-art">Art : {article.num_inventaire}</div>
      {article.marque && <div>Mark : {article.marque}</div>}
      <div>NS : {article.num_serie || "#"}</div>
    </>
  );

  const visuel = (cote: number) =>
    qr ? (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={qr}
        alt={`QR ${article.num_inventaire}`}
        style={{ width: `${cote}mm`, height: `${cote}mm` }}
      />
    ) : (
      <span className="etiq-qr-vide" style={{ width: `${cote}mm`, height: `${cote}mm` }} />
    );

  // ── PAYSAGE — le gabarit du rouleau ───────────────────────────────────────
  if (format.orientation === "paysage") {
    // Le QR prend presque toute la hauteur : c'est lui qu'on vise à bout de
    // bras. Le texte occupe ce qui reste en largeur, à plat — sur 90 mm, une
    // désignation comme « TELEPHONE-ANALOGIQUE » tient sur une ligne.
    const cote = format.hauteur * 0.86;

    return (
      <div
        className="etiq etiq-paysage"
        style={{
          width: `${format.largeur}mm`,
          height: `${format.hauteur}mm`,
          padding: `${(1.8 * k).toFixed(2)}mm`,
        }}
      >
        <div className="etiq-texte">
          <div className="etiq-lib" style={{ fontSize: pt(9) }}>
            {article.designation}
          </div>
          <div className="etiq-champs" style={{ fontSize: pt(6.5) }}>
            {champs}
          </div>
          {service && (
            <div className="etiq-service" style={{ fontSize: pt(6.5) }}>
              {service}
            </div>
          )}
        </div>

        <div className="etiq-visuels">{visuel(cote)}</div>
      </div>
    );
  }

  // ── PORTRAIT — pour un rouleau haut et étroit ─────────────────────────────
  const hTexte = format.hauteur * 0.46;
  const cote = Math.min(format.largeur * 0.96, format.hauteur * 0.52);

  return (
    <div
      className="etiq etiq-portrait"
      style={{ width: `${format.largeur}mm`, height: `${format.hauteur}mm` }}
    >
      {/* Le bloc tourné. Sa LARGEUR propre est la HAUTEUR de son emplacement :
          après rotation, c'est elle qu'on voit verticalement. Sans cette
          inversion, le texte serait coupé au quart. */}
      <div className="etiq-p-texte" style={{ height: `${hTexte}mm` }}>
        <div className="etiq-p-rot" style={{ width: `${hTexte}mm` }}>
          <div className="etiq-lib" style={{ fontSize: pt(8.5) }}>
            {article.designation}
          </div>
          <div className="etiq-champs" style={{ fontSize: pt(6) }}>
            {champs}
          </div>
          {service && (
            <div className="etiq-service" style={{ fontSize: pt(6.5) }}>
              {service}
            </div>
          )}
        </div>
      </div>

      {visuel(cote)}
    </div>
  );
}

/**
 * Prépare TOUS les QR d'un lot avant d'afficher quoi que ce soit.
 *
 * La génération est asynchrone — et l'est doublement depuis que l'écusson y est
 * composité : il faut le QR, puis l'image du logo, puis le dessin sur canvas.
 * Rendus au fil de l'eau, les codes apparaîtraient un à un, et un
 * `window.print()` lancé pendant ce temps sortirait des étiquettes vides,
 * c'est-à-dire du consommable perdu. On attend donc que l'ensemble soit prêt, et
 * le bouton d'impression se fie à `pret`.
 */
export function useEtiquettes(numeros: string[]): {
  pret: boolean;
  qrs: Record<string, string>;
} {
  const [pret, setPret] = useState(false);
  const [qrs, setQrs] = useState<Record<string, string>>({});

  // La CLÉ du lot : sans elle, un tableau recréé à chaque rendu relancerait la
  // génération en boucle et l'écran ne serait jamais « prêt ».
  const cle = numeros.join("|");

  useEffect(() => {
    let annule = false;
    setPret(false);
    if (numeros.length === 0) { setQrs({}); setPret(true); return; }

    void Promise.all(
      numeros.map((n) =>
        qrAvecLogo(n)
          .then((url) => [n, url] as const)
          .catch(() => [n, ""] as const),
      ),
    ).then((paires) => {
      if (annule) return;
      setQrs(Object.fromEntries(paires));
      setPret(true);
    });

    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  return { pret, qrs };
}
