"use client";

import { useEffect, useState } from "react";
import { History, Loader2, Pencil } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Banner } from "@/components/ui/Form";
import { getArticle, getHistorique } from "@/services/inv/articles";
import { useAccess } from "@/lib/auth/AccessProvider";
import { ACCESS } from "@/lib/access";
import type { ArticleDetail, HistoriqueLigne } from "@/types/inv/article";

/** jj/mm/aaaa depuis une date SQL. */
export function formatDate(d: string): string {
  const s = String(d).slice(0, 10);
  const [y, m, j] = s.split("-");
  return y && m && j ? `${j}/${m}/${y}` : s;
}

/**
 * La fiche d'un article.
 *
 * Un Modal et non un tiroir : le magasin a tranché ce point avant nous et les
 * deux applications doivent se ressembler. Les ACTIONS ne sont plus ici — elles
 * vivent sur la ligne du registre, là où l'on décide. Cette fiche ne fait que
 * montrer, y compris les deux axes que le legacy confondait : `etat` est la
 * condition physique, `statut` le cycle de vie.
 */
export default function ArticleDetailModal({
  id, onClose, onModifier,
}: {
  id: number | null;
  onClose: () => void;
  onModifier?: (id: number) => void;
}) {
  const { can } = useAccess();
  const [a, setA] = useState<ArticleDetail | null>(null);
  const [hist, setHist] = useState<HistoriqueLigne[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (id === null) { setA(null); setHist(null); setErreur(null); return; }
    let annule = false;
    setLoading(true); setErreur(null); setA(null); setHist(null);
    getArticle(id)
      .then((d) => { if (!annule) setA(d); })
      .catch((e: unknown) =>
        !annule && setErreur(e instanceof Error ? e.message : "Chargement impossible."))
      .finally(() => !annule && setLoading(false));
    if (can(ACCESS.ARTICLES_HISTORIQUE)) {
      getHistorique(id).then((h) => !annule && setHist(h)).catch(() => {});
    }
    return () => { annule = true; };
  }, [id, can]);

  if (id === null) return null;

  return (
    <Modal
      open
      onClose={onClose}
      closeLabel="Fermer"
      title={a?.designation ?? "Chargement…"}
      subtitle={a?.num_inventaire}
      width={720}
      footer={
        onModifier && a && !a.date_suppression && can(ACCESS.ARTICLES_MODIFIER) ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onModifier(a.id_article)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-cyan-700"
            >
              <Pencil size={15} /> Modifier
            </button>
          </div>
        ) : undefined
      }
    >
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading && (
            <p className="py-10 text-center text-slate-400">
              <Loader2 size={20} className="mx-auto animate-spin" />
            </p>
          )}
          {erreur && (
            <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-800">
              {erreur}
            </div>
          )}

          {a && (
            <>
              {a.date_suppression && (
                <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] text-red-800">
                  <strong>Article supprimé</strong> le {formatDate(a.date_suppression)}
                  {a.motif_suppression ? ` — ${a.motif_suppression}` : ""}
                </div>
              )}

              {/* The two axes the legacy stored in one column. */}
              <div className="mb-5 grid grid-cols-2 gap-3">
                <Axe
                  titre="État (condition)"
                  valeur={a.etat ?? "Non renseigné"}
                  couleur={a.etat_couleur}
                  note={a.hors_service ? "Hors service" : "En service"}
                />
                <Axe
                  titre="Statut (cycle de vie)"
                  valeur={a.statut}
                  couleur={a.statut_couleur}
                  note={a.presence ? `Présence : ${a.presence}` : undefined}
                />
              </div>

              <Section titre="Localisation">
                <Ligne l="Emplacement" v={a.localisation ?? "— aucune (bureau supprimé)"} />
                <Ligne l="Catégorie" v={a.categorie} />
                <Ligne l="Famille" v={a.famille} />
                <Ligne l="Sous-famille" v={a.sous_famille} />
              </Section>

              <Section titre="Identification">
                <Ligne l="N° d'inventaire" v={a.num_inventaire} mono />
                {a.est_registre === 1 && <Ligne l="N° de registre" v={a.num_registre} mono />}
                <Ligne l="Marque" v={a.marque} />
                <Ligne l="Modèle" v={a.modele} />
                <Ligne l="N° de série" v={a.num_serie} mono />
                <Ligne l="Valeur" v={Number(a.valeur) > 0 ? `${a.valeur} DA` : "non renseignée"} />
              </Section>

              <Section titre="Dates">
                <Ligne l="Dernier inventaire" v={a.date_inventaire ? formatDate(a.date_inventaire) : null} />
                <Ligne l="Mise en service" v={a.date_mise_service ? formatDate(a.date_mise_service) : null} />
                <Ligne l="Année d'inventaire" v={a.annee_inventaire} />
                <Ligne
                  l="Présence vérifiée"
                  v={a.date_derniere_presence ? formatDate(a.date_derniere_presence) : null}
                />
              </Section>

              {(a.num_facture || a.num_doc_reception || a.fournisseur_texte_legacy) && (
                <Section titre="Acquisition">
                  <Ligne l="Document de réception" v={a.num_doc_reception} />
                  <Ligne l="N° de facture" v={a.num_facture} />
                  <Ligne l="Date de facture" v={a.date_facture ? formatDate(a.date_facture) : null} />
                  <Ligne l="Fournisseur" v={a.fournisseur_texte_legacy} />
                  <Ligne l="Fabricant" v={a.fabricant_texte_legacy} />
                </Section>
              )}

              {a.observation && (
                <Section titre="Observation">
                  <p className="text-[13px] text-slate-700">
                    {a.type_observation && (
                      <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-slate-600">
                        {a.type_observation}
                      </span>
                    )}
                    {a.observation}
                  </p>
                </Section>
              )}

              <Section titre="Traçabilité">
                <Ligne l="Créé le" v={a.date_creation ? formatDate(a.date_creation) : null} />
                <Ligne l="Modifié le" v={a.date_modification ? formatDate(a.date_modification) : null} />
                {/* The legacy id is kept visible on purpose: during the
                    transition someone will have the old screen open beside
                    this one and needs to know they are looking at the same
                    item. */}
                <Ligne
                  l="Origine"
                  v={a.id_article_legacy ? `${a.source_legacy} #${a.id_article_legacy}` : "créé ici"}
                  mono
                />
              </Section>

              {hist !== null && (
                <Section titre="Historique">
                  {hist.length === 0 ? (
                    <p className="text-[12.5px] italic text-slate-400">
                      Aucune modification enregistrée depuis la reprise.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {hist.map((h) => (
                        <li key={h.id_historique} className="flex gap-2 text-[12.5px]">
                          <History size={13} className="mt-0.5 shrink-0 text-slate-400" />
                          <span className="text-slate-600">
                            <strong className="text-slate-800">{h.champ}</strong> :{" "}
                            {h.ancienne_valeur ?? "—"} → {h.nouvelle_valeur ?? "—"}
                            <span className="ml-1 text-slate-400">
                              ({formatDate(h.date_modification)})
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              )}
            </>
          )}
        </div>
    </Modal>
  );
}

function Axe({
  titre, valeur, couleur, note,
}: { titre: string; valeur: string; couleur: string | null; note?: string }) {
  const c = couleur ?? "#94a3b8";
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{titre}</p>
      <p className="mt-1 text-[13.5px] font-bold" style={{ color: c }}>{valeur}</p>
      {note && <p className="mt-0.5 text-[11px] text-slate-500">{note}</p>}
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 border-b border-slate-100 pb-1 text-[11.5px] font-semibold uppercase tracking-wide text-slate-400">
        {titre}
      </h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Ligne({ l, v, mono }: { l: string; v: string | null | undefined; mono?: boolean }) {
  return (
    <div className="flex gap-3 text-[13px]">
      <span className="w-[150px] shrink-0 text-slate-500">{l}</span>
      <span className={`min-w-0 flex-1 text-slate-800 ${mono ? "font-mono text-[12px]" : ""}`}>
        {v || <span className="text-slate-300">—</span>}
      </span>
    </div>
  );
}


/** One action in the drawer's toolbar. */
function Action({
  children, onClick, icon, busy, danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon: React.ReactNode;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={[
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors disabled:opacity-50",
        danger
          ? "border-red-300 text-red-700 hover:bg-red-50"
          : "border-slate-300 text-slate-700 hover:bg-white",
      ].join(" ")}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
