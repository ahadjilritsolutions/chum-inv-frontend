"use client";

import EtiquetteArticle, {
  useEtiquettes, type DonneesEtiquette,
} from "@/components/modules/articles/EtiquetteArticle";
import { FORMAT_PAR_DEFAUT, type FormatEtiquette } from "@/lib/inv/formats-etiquette";

/**
 * LES ÉTIQUETTES À IMPRIMER — UNE PAR PAGE.
 *
 * ── LE FORMAT DE PAGE EST CELUI DE L'ÉTIQUETTE ──────────────────────────────
 * `@page { size: 80mm 35mm; margin: 0 }`, injecté selon le format choisi. C'est
 * ce qui fait qu'une étiqueteuse avance d'exactement une étiquette : elle
 * imprime des PAGES, et si la page fait A4 elle déroule une A4 de ruban pour
 * une vignette de 8 cm.
 *
 * La règle est écrite ici, dans le composant, et non dans globals.css : la
 * taille dépend de ce que l'utilisateur vient de choisir, et une feuille de
 * style statique ne sait pas la porter.
 *
 * ── ET NON UNE PLANCHE DE DIX ───────────────────────────────────────────────
 * La version précédente en posait dix sur une A4. C'était faux pour le matériel
 * du service : les étiquettes se posent une par une, sur du ruban, et ce qui a
 * été mesuré sur le parc fait 80 × 35 mm.
 */
export default function PlancheEtiquettes({
  etiquettes, format = FORMAT_PAR_DEFAUT, onPret,
}: {
  etiquettes: DonneesEtiquette[];
  format?: FormatEtiquette;
  onPret?: (pret: boolean) => void;
}) {
  const { pret, logo, qrs } = useEtiquettes(etiquettes.map((e) => e.num_inventaire));

  // Remonter l'état au parent sans le faire pendant le rendu.
  if (onPret) queueMicrotask(() => onPret(pret));

  return (
    <>
      {/* Le pilote d'impression lit ceci, pas le CSS de l'écran. */}
      <style>{`
        @page { size: ${format.largeur}mm ${format.hauteur}mm; margin: 0; }
      `}</style>

      <div className="etiq-suite">
        {etiquettes.map((e) => (
          <div className="etiq-page" key={e.num_inventaire}>
            <EtiquetteArticle
              article={e}
              format={format}
              logo={logo}
              qr={qrs[e.num_inventaire]}
            />
          </div>
        ))}
      </div>
    </>
  );
}
