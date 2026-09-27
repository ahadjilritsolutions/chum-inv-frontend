"use client";

import { FileText, QrCode } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useAccess } from "@/lib/auth/AccessProvider";
import { ACCESS } from "@/lib/access";
import type { ArticleRow } from "@/types/inv/article";

export type TypeImpression = "fiche" | "etiquette";

/**
 * QUOI IMPRIMER — le petit choix qui précède l'impression d'un article.
 *
 * Il y a deux documents et ils n'ont rien à voir :
 *
 *   • LA FICHE — une A4 de bureau, à classer. Elle porte tout ce qu'on sait du
 *     bien, y compris les coordonnées du fournisseur pour faire jouer une
 *     garantie.
 *   • L'ÉTIQUETTE — un grand QR à coller sur le meuble, l'écusson en son
 *     centre. Elle ne porte que le numéro et la désignation, parce qu'elle se
 *     lit à un mètre.
 *
 * Un seul bouton d'impression ne pouvait pas servir les deux, et deux icônes de
 * plus sur une ligne qui en compte déjà huit l'auraient rendue illisible. D'où
 * ce choix, posé une fois, au moment où l'on sait ce qu'on veut.
 *
 * ── UN CLIC, PAS TROIS ──────────────────────────────────────────────────────
 * Il y a eu un second écran pour la taille, puis une liste déroulante. Les deux
 * ont disparu avec les autres formats : il n'existe qu'un support, 40 × 90 mm.
 * Choisir le document EST la décision, et elle lance l'impression.
 *
 * ── PAS D'APERÇU PLEIN ÉCRAN ────────────────────────────────────────────────
 * La version précédente ouvrait le document en grand avant d'imprimer. C'était
 * une étape pour rien : on n'y modifiait rien, on cliquait « Imprimer », et
 * l'aperçu du navigateur montrait de toute façon la même chose juste après.
 * Le document part donc directement à l'impression, comme dans le magasin.
 */
export default function ChoixImpressionModal({
  article, onClose, onChoisir,
}: {
  article: ArticleRow | null;
  onClose: () => void;
  onChoisir: (type: TypeImpression) => void;
}) {
  const { can } = useAccess();
  if (!article) return null;

  const options: Array<{
    type: TypeImpression; titre: string; detail: string;
    icone: React.ReactNode; autorise: boolean;
  }> = [
    {
      type: "fiche",
      titre: "Fiche d'article",
      detail: "A4 à classer — identification, fournisseur, fabricant, localisation, historique",
      icone: <FileText size={20} />,
      autorise: can(ACCESS.ARTICLES_FICHE),
    },
    {
      type: "etiquette",
      titre: "Étiquette QR",
      detail: "40 × 90 mm à coller sur le bien — grand QR à l'écusson du CHU, numéro et désignation",
      icone: <QrCode size={20} />,
      autorise: can(ACCESS.ARTICLES_ETIQUETTE),
    },
  ];

  const offertes = options.filter((o) => o.autorise);

  return (
    <Modal open onClose={onClose} title="Imprimer" width={520}>
      <div className="space-y-3 p-5">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px]">
          <span className="font-mono text-[12px] text-slate-500">
            {article.num_inventaire}
          </span>
          <p className="font-medium text-slate-800">{article.designation}</p>
        </div>

        {offertes.length === 0 && (
          <p className="py-4 text-center text-[12.5px] italic text-slate-400">
            Vous n&apos;avez le droit d&apos;imprimer aucun de ces documents.
          </p>
        )}

        {offertes.map((o) => (
          <button
            key={o.type}
            type="button"
            onClick={() => { onChoisir(o.type); onClose(); }}
            className="flex w-full items-start gap-3 rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-left transition-colors hover:border-violet-400 hover:bg-violet-50"
          >
            <span className="mt-0.5 shrink-0 text-violet-600">{o.icone}</span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold text-slate-800">
                {o.titre}
              </span>
              <span className="block text-[11.5px] leading-snug text-slate-500">
                {o.detail}
              </span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
