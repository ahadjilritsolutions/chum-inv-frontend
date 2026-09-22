"use client";

import { useState } from "react";
import { ArrowLeft, FileText, QrCode } from "lucide-react";
import Modal from "@/components/ui/Modal";
import {
  FORMATS_ETIQUETTE, FORMAT_PAR_DEFAUT, type FormatEtiquette,
} from "@/lib/inv/formats-etiquette";
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
 *   • L'ÉTIQUETTE — un grand QR à plastifier et coller sur le meuble. Elle ne
 *     porte que le numéro et la désignation, parce qu'elle se lit à un mètre.
 *
 * Un seul bouton d'impression ne pouvait pas servir les deux, et deux icônes de
 * plus sur une ligne qui en compte déjà huit l'auraient rendue illisible. D'où
 * ce choix, posé une fois, au moment où l'on sait ce qu'on veut.
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
  onChoisir: (type: TypeImpression, format?: FormatEtiquette) => void;
}) {
  const { can } = useAccess();
  // Le choix de la taille n'apparaît QU'APRÈS avoir demandé une étiquette :
  // poser la question d'emblée ferait répondre à propos d'un document que
  // l'on n'a pas encore choisi d'imprimer.
  const [taille, setTaille] = useState(false);
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
      detail: "Grand QR à coller sur le bien — numéro et désignation, comme sur l'ancienne plateforme",
      icone: <QrCode size={20} />,
      autorise: can(ACCESS.ARTICLES_ETIQUETTE),
    },
  ];

  const offertes = options.filter((o) => o.autorise);

  if (taille) {
    return (
      <Modal open onClose={onClose} title="Taille de l'étiquette" width={520}>
        <div className="space-y-3 p-5">
          <p className="text-[12.5px] text-slate-500">
            Sur quel support imprimez-vous ? Une étiquette par page, à la taille
            exacte du rouleau ou de la planche.
          </p>

          {FORMATS_ETIQUETTE.map((f) => (
            <button
              key={f.cle}
              type="button"
              onClick={() => { onChoisir("etiquette", f); onClose(); }}
              className={
                "flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors " +
                (f.cle === FORMAT_PAR_DEFAUT.cle
                  ? "border-violet-400 bg-violet-50 hover:bg-violet-100"
                  : "border-slate-300 bg-white hover:border-violet-400 hover:bg-violet-50")
              }
            >
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-slate-800">
                  {f.libelle}
                  {f.cle === FORMAT_PAR_DEFAUT.cle && (
                    <span className="ml-2 rounded bg-violet-200 px-1.5 py-px text-[10px] font-bold text-violet-900">
                      celui du parc
                    </span>
                  )}
                </span>
                {f.detail && (
                  <span className="block text-[11.5px] text-slate-500">{f.detail}</span>
                )}
              </span>
              {/* Un aperçu à l'échelle : on choisit une forme, pas deux nombres. */}
              <span
                aria-hidden
                className="shrink-0 rounded-sm border border-slate-400 bg-white"
                style={{ width: f.largeur * 0.42, height: f.hauteur * 0.42 }}
              />
            </button>
          ))}

          <button
            type="button"
            onClick={() => setTaille(false)}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-cyan-700 hover:underline"
          >
            <ArrowLeft size={13} />
            Retour
          </button>
        </div>
      </Modal>
    );
  }

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
            onClick={() => {
              if (o.type === "etiquette") { setTaille(true); return; }
              onChoisir(o.type); onClose();
            }}
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
