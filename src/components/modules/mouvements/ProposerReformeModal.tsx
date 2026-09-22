"use client";

import { useEffect, useState } from "react";
import { Recycle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Field, TextArea, Banner, FormActions } from "@/components/ui/Form";
import { proposerReforme } from "@/services/inv/mouvements";
import type { ArticleRow } from "@/types/inv/article";

/**
 * Proposer un article à la réforme.
 *
 * C'est une DEMANDE, pas une décision : l'article passe en « proposé » et
 * rejoint la file d'attente du bureau d'inventaire, qui accepte ou refuse.
 * Le legacy confondait les deux — proposer écrivait directement l'état 9 et
 * rien ne pouvait plus l'en sortir.
 *
 * Le motif est obligatoire parce que c'est la seule chose que verra celui qui
 * instruit la demande.
 */
export default function ProposerReformeModal({
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
  // Captured so the async handler keeps the narrowing TS did above.
  const art = article;

  async function valider() {
    setBusy(true); setErreur(null);
    try {
      await proposerReforme(art.id_article, motif.trim());
      onDone("Demande de réforme enregistrée.");
      onClose();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Proposition impossible.");
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Proposer à la réforme" icon={<Recycle size={18} />} width={560}
      footer={
        <FormActions
          onCancel={onClose}
          onSubmit={() => void valider()}
          submitLabel="Envoyer la demande"
          submitting={busy}
          disabled={!motif.trim()}
        />
      }
    >
      <div className="space-y-4 p-5">
        {erreur && <Banner type="error">{erreur}</Banner>}
        <Banner type="ok">
          L&apos;article passera en « proposé à la réforme » et sera soumis au
          bureau d&apos;inventaire, qui acceptera ou refusera la demande.
        </Banner>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px]">
          <span className="font-mono text-[12px] text-slate-500">{art.num_inventaire}</span>
          <p className="font-medium text-slate-800">{art.designation}</p>
          <p className="text-[12px] text-slate-500">{art.localisation ?? "—"}</p>
        </div>

        <Field label="Motif de la proposition" required hint="C'est ce que lira l'instructeur">
          <TextArea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex. châssis cassé, réparation non rentable"
          />
        </Field>
      </div>
    </Modal>
  );
}
