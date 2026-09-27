"use client";

import EtiquetteArticle, {
  useEtiquettes, type DonneesEtiquette,
} from "@/components/modules/articles/EtiquetteArticle";
import { FORMAT_PAR_DEFAUT, type FormatEtiquette } from "@/lib/inv/formats-etiquette";

/**
 * LES ÉTIQUETTES À IMPRIMER — UNE PAR PAGE.
 *
 * Le SEUL rendu de l'étiquette dans l'application : la page Articles imprime
 * par ici elle aussi, avec un lot d'un seul article. Il y a eu un temps deux
 * implémentations — l'une posait l'étiquette dans `.etiq-page` avec son
 * `@page`, l'autre la rendait nue — et les deux écrans ne sortaient pas la
 * même forme. Deux rendus du même autocollant finissent toujours par diverger.
 *
 * ── LE FORMAT DE PAGE EST CELUI DE L'ÉTIQUETTE ──────────────────────────────
 * `@page { size: 40mm 90mm; margin: 0 }`. C'est ce qui fait qu'une étiqueteuse
 * avance d'exactement une étiquette : elle imprime des PAGES, et si la page
 * fait A4 elle déroule une A4 de ruban pour une vignette de 9 cm.
 *
 * La règle est écrite ici, dans le composant, et non dans globals.css : une
 * feuille de style statique ne saurait pas la porter si un second support
 * apparaissait.
 */
export default function PlancheEtiquettes({
  etiquettes, format = FORMAT_PAR_DEFAUT, onPret,
}: {
  etiquettes: DonneesEtiquette[];
  format?: FormatEtiquette;
  onPret?: (pret: boolean) => void;
}) {
  const { pret, qrs } = useEtiquettes(etiquettes.map((e) => e.num_inventaire));

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
              qr={qrs[e.num_inventaire]}
            />
          </div>
        ))}
      </div>
    </>
  );
}
