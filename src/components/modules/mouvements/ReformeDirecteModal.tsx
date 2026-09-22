"use client";

import { useEffect, useState } from "react";
import { PackageX } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Banner, Field, FormActions, TextArea } from "@/components/ui/Form";
import { reformerDirectement } from "@/services/inv/mouvements";
import type { ArticleRow } from "@/types/inv/article";

/**
 * Réformer un bien SANS passer par une demande.
 *
 * Le legacy offrait « P-A-Reforme » et « Reformer » dans le même menu sans
 * jamais dire ce qui les séparait. Ce qui les sépare, c'est QUI agit :
 *
 *   • un service PROPOSE un bien à la réforme, et attend une décision ;
 *   • le bureau d'inventaire DÉCIDE — et n'a pas à s'adresser à lui-même une
 *     demande qu'il instruira ensuite.
 *
 * D'où un écran distinct de la proposition, et non une case à cocher dessus :
 * les conséquences ne sont pas les mêmes. Une proposition se refuse ; ceci sort
 * le bien du parc immédiatement et établit le PV.
 *
 * Le motif est OBLIGATOIRE. Sans demande en amont, il n'existe aucun autre
 * endroit où sera écrite la raison de la sortie — et un bien qui disparaît du
 * parc sans explication est exactement ce que le registre doit empêcher.
 */
export default function ReformeDirecteModal({
  article, onClose, onDone,
}: {
  article: ArticleRow | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [motif, setMotif] = useState("");
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (article) { setMotif(""); setErreur(null); setBusy(false); }
  }, [article]);

  if (!article) return null;
  const art = article;

  async function valider() {
    setBusy(true); setErreur(null);
    try {
      const r = await reformerDirectement({
        articles: [art.id_article],
        motif: motif.trim(),
      });
      onDone(
        r.id_document
          ? `${art.num_inventaire} réformé — PV établi.`
          : `${art.num_inventaire} réformé.`,
      );
      onClose();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Réforme impossible.");
      setBusy(false);
    }
  }

  return (
    <Modal
      open onClose={onClose}
      title="Réformer directement"
      icon={<PackageX size={18} />}
      width={560}
      footer={
        <FormActions
          onCancel={onClose}
          onSubmit={() => void valider()}
          submitLabel="Réformer"
          submitting={busy}
          disabled={!motif.trim()}
        />
      }
    >
      <div className="space-y-4 p-5">
        {erreur && <Banner type="error">{erreur}</Banner>}

        <Banner type="error">
          Sans demande préalable : le bien sort du parc dès la validation et un
          PV de réforme est établi.
        </Banner>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px]">
          <span className="font-mono text-[12px] text-slate-500">{art.num_inventaire}</span>
          <p className="font-medium text-slate-800">{art.designation}</p>
          <p className="text-[12px] text-slate-500">
            {art.localisation ?? "sans localisation"}
            {art.etat ? ` — état : ${art.etat}` : ""}
          </p>
        </div>

        <Field
          label="Motif de la réforme"
          required
          hint="Figurera sur le PV — c'est la seule trace de la raison de la sortie"
        >
          <TextArea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex. matériel hors d'usage, irréparable après expertise"
          />
        </Field>
      </div>
    </Modal>
  );
}
