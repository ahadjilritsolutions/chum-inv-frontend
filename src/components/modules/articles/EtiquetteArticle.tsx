"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { chargerLogo } from "@/lib/inv/logo";
import {
  echelle, FORMAT_PAR_DEFAUT, type FormatEtiquette,
} from "@/lib/inv/formats-etiquette";

/**
 * L'ÉTIQUETTE D'UN BIEN — reprise du gabarit de l'étiqueteuse.
 *
 * ── LA DISPOSITION PORTRAIT, CELLE DU PARC ──────────────────────────────────
 * Haute et étroite (40 × 90 mm), lue de bas en haut :
 *
 *        ┌────────────────┐
 *        │  TELEPHONE-…   │   ← le bloc de texte, TOURNÉ À 90°
 *        │  Ser : ALCATEL │
 *        │  Art : 0105-…  │
 *        │  Mark : ALCATEL│
 *        │  NS : #        │
 *        │  DEP-CONTABILITE
 *        │    ( H.U.M )   │   ← l'écusson, à plat
 *        │  ┌──────────┐  │
 *        │  │    QR    │  │   ← grand, en bas
 *        │  └──────────┘  │
 *        └────────────────┘
 *
 * LE TEXTE EST TOURNÉ parce qu'une désignation comme
 * « TELEPHONE-ANALOGIQUE » ne tient pas en travers de 40 mm : elle se couperait
 * en trois lignes. Dans le sens de la longueur, elle tient sur une seule.
 *
 * LE QR EST GRAND parce que c'est lui qu'on scanne à bout de bras pendant une
 * tournée, sans se pencher sur l'armoire.
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
 *
 * ── UNE ÉTIQUETTE, UNE PAGE ─────────────────────────────────────────────────
 * Le format de PAGE est celui de l'étiquette (voir PlancheEtiquettes, qui
 * injecte `@page { size }`). Une étiqueteuse avance d'une étiquette à la fois ;
 * lui envoyer une A4 lui ferait dérouler 30 cm de ruban pour une vignette.
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
  article, format = FORMAT_PAR_DEFAUT, logo, qr,
}: {
  article: DonneesEtiquette;
  format?: FormatEtiquette;
  logo?: string | null;
  qr?: string | null;
}) {
  const k = echelle(format);
  const pt = (base: number) => `${(base * k).toFixed(2)}pt`;

  const champs = (
    <>
      {article.modele && <div>Ser : {article.modele}</div>}
      <div className="etiq-art">Art : {article.num_inventaire}</div>
      {article.marque && <div>Mark : {article.marque}</div>}
      <div>NS : {article.num_serie || "#"}</div>
    </>
  );
  const service = article.service || article.localisation || "";

  // ── PORTRAIT — le gabarit du parc ─────────────────────────────────────────
  if (format.orientation === "portrait") {
    // Répartition de la hauteur. Le QR prend la plus grosse part : c'est lui
    // qu'on vise. Le texte tourné vient ensuite, l'écusson ferme la marche.
    const hTexte = format.hauteur * 0.4;
    const hLogo = format.hauteur * 0.15;
    const cote = Math.min(format.largeur * 0.88, format.hauteur * 0.4);

    return (
      <div
        className="etiq etiq-portrait"
        style={{ width: `${format.largeur}mm`, height: `${format.hauteur}mm` }}
      >
        {/* Le bloc tourné. Sa LARGEUR propre est la HAUTEUR de son
            emplacement : après rotation, c'est elle qu'on voit verticalement.
            Sans cette inversion, le texte serait coupé au quart. */}
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

        {logo && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={logo} alt="" className="etiq-logo" style={{ height: `${hLogo}mm` }} />
        )}

        {qr ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={qr}
            alt={`QR ${article.num_inventaire}`}
            style={{ width: `${cote}mm`, height: `${cote}mm` }}
          />
        ) : (
          <span className="etiq-qr-vide" style={{ width: `${cote}mm`, height: `${cote}mm` }} />
        )}
      </div>
    );
  }

  // ── PAYSAGE — la même information à plat ──────────────────────────────────
  const cote = format.hauteur * 0.62;
  const compact = format.hauteur < 30;

  return (
    <div
      className="etiq etiq-paysage"
      style={{
        width: `${format.largeur}mm`,
        height: `${format.hauteur}mm`,
        padding: `${(2 * k).toFixed(2)}mm`,
      }}
    >
      <div className="etiq-texte">
        <div className="etiq-lib" style={{ fontSize: pt(9) }}>
          {article.designation}
        </div>
        <div className="etiq-champs" style={{ fontSize: pt(6.5) }}>
          {compact ? <div className="etiq-art">Art : {article.num_inventaire}</div> : champs}
        </div>
        {service && (
          <div className="etiq-service" style={{ fontSize: pt(7) }}>{service}</div>
        )}
      </div>

      <div className="etiq-visuels">
        {qr ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={qr}
            alt={`QR ${article.num_inventaire}`}
            style={{ width: `${cote}mm`, height: `${cote}mm` }}
          />
        ) : (
          <span className="etiq-qr-vide" style={{ width: `${cote}mm`, height: `${cote}mm` }} />
        )}
        {!compact && logo && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={logo} alt="" className="etiq-logo" style={{ height: `${9 * k}mm` }} />
        )}
      </div>
    </div>
  );
}

/**
 * Prépare l'écusson et TOUS les QR d'un lot avant d'afficher quoi que ce soit.
 *
 * `QRCode.toDataURL` est asynchrone. Générés au fil du rendu, les codes
 * apparaîtraient un à un — et un `window.print()` lancé pendant ce temps
 * sortirait des étiquettes vides, c'est-à-dire du consommable perdu. On attend
 * donc que l'ensemble soit prêt, et le bouton d'impression se fie à `pret`.
 */
export function useEtiquettes(numeros: string[]): {
  pret: boolean;
  logo: string | null;
  qrs: Record<string, string>;
} {
  const [pret, setPret] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [qrs, setQrs] = useState<Record<string, string>>({});

  // La CLÉ du lot : sans elle, un tableau recréé à chaque rendu relancerait la
  // génération en boucle et l'écran ne serait jamais « prêt ».
  const cle = numeros.join("|");

  useEffect(() => {
    let annule = false;
    setPret(false);
    if (numeros.length === 0) { setQrs({}); setPret(true); return; }

    void Promise.all([
      chargerLogo(),
      Promise.all(
        numeros.map((n) =>
          QRCode.toDataURL(n, {
            // « L » comme le legacy : un niveau de correction plus élevé
            // densifie le motif, donc rétrécit les modules à surface égale —
            // une étiquette abîmée se relit moins bien, pas mieux.
            errorCorrectionLevel: "L",
            margin: 0,
            width: 400,
          })
            .then((url) => [n, url] as const)
            .catch(() => [n, ""] as const),
        ),
      ),
    ]).then(([l, paires]) => {
      if (annule) return;
      setLogo(l);
      setQrs(Object.fromEntries(paires));
      setPret(true);
    });

    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  return { pret, logo, qrs };
}
