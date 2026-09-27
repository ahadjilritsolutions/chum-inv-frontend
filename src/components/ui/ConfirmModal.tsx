"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "@/components/ui/Modal";

/**
 * LA CONFIRMATION D'UN GESTE IRRÉVERSIBLE — dans la fenêtre de l'application.
 *
 * Elle remplace `window.confirm` / `window.prompt`, qui posaient trois
 * problèmes qu'aucun réglage ne corrige :
 *
 *   ① ELLE NE RESSEMBLE À RIEN DU RESTE. La boîte du navigateur porte l'URL de
 *     la page, une typographie système et deux boutons gris. Sur l'écran d'un
 *     hôpital, elle se lit comme une alerte de sécurité, pas comme une question
 *     de l'application.
 *   ② ELLE NE DIT PAS CE QU'ELLE VA FAIRE. `prompt` affiche une ligne de texte
 *     et un champ vide : impossible d'y mettre en évidence le numéro du bien,
 *     ni d'expliquer que la suppression est réversible par un administrateur.
 *   ③ ELLE ACCEPTE LA CHAÎNE VIDE. `prompt` renvoie "" quand on valide sans
 *     rien écrire, et le motif obligatoire ne l'était donc pas.
 *
 * ── LE MOTIF, QUAND IL EST EXIGÉ ────────────────────────────────────────────
 * `motif: "obligatoire"` désactive le bouton tant que rien n'est écrit. Une
 * suppression sans motif est une ligne d'historique qui ne dit pas pourquoi —
 * exactement ce qu'on reproche au legacy.
 */
export default function ConfirmModal({
  open,
  titre,
  message,
  detail,
  motif = "aucun",
  labelMotif = "Motif",
  confirmer = "Confirmer",
  ton = "danger",
  occupe = false,
  onConfirmer,
  onFermer,
}: {
  open: boolean;
  titre: string;
  /** La question, en une phrase. */
  message: React.ReactNode;
  /** Ce sur quoi elle porte — numéro, désignation. Mis en évidence. */
  detail?: React.ReactNode;
  motif?: "aucun" | "facultatif" | "obligatoire";
  labelMotif?: string;
  confirmer?: string;
  ton?: "danger" | "normal";
  occupe?: boolean;
  onConfirmer: (motif: string) => void;
  onFermer: () => void;
}) {
  const [texte, setTexte] = useState("");

  // Rouvrir sur le motif tapé la fois précédente ferait signer un geste avec
  // la raison d'un autre.
  useEffect(() => { if (open) setTexte(""); }, [open]);

  if (!open) return null;

  const manque = motif === "obligatoire" && texte.trim() === "";

  return (
    <Modal
      open
      onClose={onFermer}
      title={titre}
      width={480}
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <button
            type="button"
            onClick={onFermer}
            className="rounded-lg px-3.5 py-2 text-[12.5px] font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={manque || occupe}
            onClick={() => onConfirmer(texte.trim())}
            className={
              "rounded-lg px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors disabled:opacity-50 " +
              (ton === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-cyan-600 hover:bg-cyan-700")
            }
          >
            {confirmer}
          </button>
        </div>
      }
    >
      <div className="space-y-3 p-5">
        <div className="flex gap-3">
          <span
            className={
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full " +
              (ton === "danger" ? "bg-red-50 text-red-600" : "bg-cyan-50 text-cyan-600")
            }
          >
            <AlertTriangle size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] leading-snug text-slate-700">{message}</p>
            {detail && (
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12.5px]">
                {detail}
              </div>
            )}
          </div>
        </div>

        {motif !== "aucun" && (
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-slate-600">
              {labelMotif}
              {motif === "obligatoire" && <span className="text-red-500"> *</span>}
            </span>
            <input
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              autoFocus
              placeholder={motif === "obligatoire" ? "Obligatoire" : "Facultatif"}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
            />
          </label>
        )}
      </div>
    </Modal>
  );
}
