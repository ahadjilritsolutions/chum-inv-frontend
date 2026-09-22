"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Inbox, Recycle, X } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import ViewTabs, { type ViewTab } from "@/components/ui/ViewTabs";
import ListToolbar from "@/components/ui/ListToolbar";
import DataTable, { Td } from "@/components/ui/DataTable";
import IconAction from "@/components/ui/IconAction";
import Modal from "@/components/ui/Modal";
import { Banner, Field, FormActions, Select, TextArea } from "@/components/ui/Form";
import AccessPending from "@/components/ui/AccessPending";
import { useRequireAccess } from "@/lib/auth/useRequireAccess";
import { useAccess } from "@/lib/auth/AccessProvider";
import { ACCESS } from "@/lib/access";
import { listDemandesReforme, traiterReforme } from "@/services/inv/mouvements";
import { listArticles } from "@/services/inv/articles";
import { getReference } from "@/services/inv/reference";
import { chipStyle, statutArticleChip } from "@/lib/inv/theme";
import { formatDate } from "@/components/modules/articles/ArticleDetailModal";
import type { DemandeReforme } from "@/types/inv/mouvement";
import type { ArticleRow } from "@/types/inv/article";
import type { ReferenceFeed } from "@/types/inv/reference";

const TAILLE = 25;

type Vue = "demandes" | "reformes";

/**
 * Réformes — deux métiers, deux onglets.
 *
 *   • DEMANDES  — les articles qu'un service a proposés. Une FILE DE TRAVAIL :
 *     elle doit se vider. On y accepte (un PV est établi) ou l'on refuse (motif
 *     obligatoire, l'article repart en service).
 *   • RÉFORMÉS  — les articles sortis, avec leur PV. Une ARCHIVE : elle ne fait
 *     que grossir.
 *
 * Les deux ne se ressemblent que si l'on regarde la table. Pour qui s'en sert,
 * l'une est une corbeille d'arrivée et l'autre un registre — d'où deux onglets
 * et non un filtre.
 *
 * Le refus est ce que le legacy ne savait pas faire : `id_etat = 9` ne pouvait
 * qu'aboutir à 10, ou rester en suspens indéfiniment.
 */
export default function ReformesPage() {
  const { allowed, loading: gating } = useRequireAccess(ACCESS.REFORME_VOIR);
  const { can } = useAccess();

  const [vue, setVue] = useState<Vue>("demandes");
  const [demandes, setDemandes] = useState<DemandeReforme[]>([]);
  const [reformes, setReformes] = useState<ArticleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [recherche, setRecherche] = useState("");
  const [service, setService] = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [ref, setRef] = useState<ReferenceFeed | null>(null);

  const [decision, setDecision] = useState<{
    articles: DemandeReforme[];
    sens: "accepter" | "refuser";
  } | null>(null);

  useEffect(() => {
    void getReference().then(setRef).catch(() => setRef(null));
  }, []);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      if (vue === "demandes") {
        const d = await listDemandesReforme({
          q: recherche || undefined,
          service: service ? Number(service) : undefined,
          page,
          limit: TAILLE,
        });
        setDemandes(d.demandes);
        setTotal(d.total);
        setPages(d.pages);
      } else {
        const d = await listArticles({
          q: recherche || undefined,
          service: service ? Number(service) : undefined,
          statut: "reforme",
          supprimes: "tous",
          page,
          limit: TAILLE,
        });
        setReformes(d.articles);
        setTotal(d.total);
        setPages(d.pages);
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setChargement(false);
    }
  }, [vue, recherche, service, page]);

  useEffect(() => { void charger(); }, [charger]);

  const onglets: ReadonlyArray<ViewTab<Vue>> = [
    { id: "demandes", label: "Demandes de réforme", icon: Inbox },
    { id: "reformes", label: "Articles réformés", icon: Recycle },
  ];

  if (gating || !allowed) return <AccessPending />;

  const peutInstruire = can(ACCESS.REFORME_PV_VALIDER);

  return (
    <div className="space-y-4">
      <PageHero
        title="Réformes"
        icon={Recycle}
      />

      <ViewTabs
        tabs={onglets}
        active={vue}
        onChange={(v) => { setVue(v); setPage(1); setInfo(null); }}
      />

      {erreur && <Banner type="error">{erreur}</Banner>}
      {info && <Banner type="ok">{info}</Banner>}

      <ListToolbar
        recherche={recherche}
        onRecherche={(v) => { setRecherche(v); setPage(1); }}
        placeholder="N° d'inventaire ou désignation…"
        total={total}
        filters={
          <Select
            value={service}
            onChange={(e) => { setService(e.target.value); setPage(1); }}
            className="w-auto min-w-[160px]"
          >
            <option value="">Tous les services</option>
            {(ref?.services ?? []).map((s) => (
              <option key={s.id_service} value={s.id_service}>{s.lib_service}</option>
            ))}
          </Select>
        }
      />

      {vue === "demandes" ? (
        <DataTable
          colonnes={[
            { titre: "Demandé le" },
            { titre: "N° inventaire" },
            { titre: "Désignation" },
            { titre: "Localisation" },
            { titre: "État" },
            { titre: "Motif invoqué" },
            { titre: "Décision", className: "text-right" },
          ]}
          lignes={demandes}
          cle={(d) => d.id_article}
          chargement={chargement}
          messageVide="Aucune demande en attente. La file est vide."
          largeurMin={1060}
          page={page}
          pages={pages}
          onPage={setPage}
          rendu={(d) => (
            <>
              <Td className="whitespace-nowrap text-slate-600">
                {d.date_demande ? formatDate(d.date_demande) : "—"}
              </Td>
              <Td className="font-mono text-[12.5px] font-medium text-slate-700">
                {d.num_inventaire}
              </Td>
              <Td className="font-medium text-slate-800">{d.designation}</Td>
              <Td className="text-slate-600">{d.localisation ?? "—"}</Td>
              <Td>
                {d.etat ? (
                  <span
                    className="whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold"
                    style={chipStyle({
                      bg: `${d.etat_couleur ?? "#94a3b8"}22`,
                      fg: d.etat_couleur ?? "#475569",
                    })}
                  >
                    {d.etat}
                  </span>
                ) : "—"}
              </Td>
              <Td className="max-w-[260px] text-[12.5px] text-slate-600">
                {d.motif ?? <span className="italic text-slate-400">non précisé</span>}
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-1.5">
                  {peutInstruire ? (
                    <>
                      <IconAction
                        title="Accepter la réforme"
                        tone="edit"
                        onClick={() => setDecision({ articles: [d], sens: "accepter" })}
                      >
                        <Check size={14} />
                      </IconAction>
                      <IconAction
                        title="Refuser la demande"
                        tone="danger"
                        onClick={() => setDecision({ articles: [d], sens: "refuser" })}
                      >
                        <X size={14} />
                      </IconAction>
                    </>
                  ) : (
                    <span className="text-[11.5px] italic text-slate-400">
                      en attente d&apos;instruction
                    </span>
                  )}
                </div>
              </Td>
            </>
          )}
        />
      ) : (
        <DataTable
          colonnes={[
            { titre: "N° inventaire" },
            { titre: "Désignation" },
            { titre: "Dernière localisation" },
            { titre: "Catégorie" },
            { titre: "État à la réforme" },
            { titre: "Statut" },
          ]}
          lignes={reformes}
          cle={(a) => a.id_article}
          chargement={chargement}
          messageVide="Aucun article réformé."
          largeurMin={980}
          page={page}
          pages={pages}
          onPage={setPage}
          rendu={(a) => {
            const st = statutArticleChip(a.statut_code);
            return (
              <>
                <Td className="font-mono text-[12.5px] font-medium text-slate-700">
                  {a.num_inventaire}
                </Td>
                <Td className="font-medium text-slate-800">{a.designation}</Td>
                <Td className="text-slate-600">{a.localisation ?? "—"}</Td>
                <Td className="text-slate-500">{a.categorie ?? "—"}</Td>
                <Td className="text-slate-500">{a.etat ?? "—"}</Td>
                <Td>
                  <span
                    className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                    style={chipStyle(st)}
                  >
                    {st.label}
                  </span>
                </Td>
              </>
            );
          }}
        />
      )}

      <DecisionModal
        decision={decision}
        onClose={() => setDecision(null)}
        onDone={(m) => { setInfo(m); void charger(); }}
      />
    </div>
  );
}

/** Accepter ou refuser, avec le motif que le demandeur lira. */
function DecisionModal({
  decision, onClose, onDone,
}: {
  decision: { articles: DemandeReforme[]; sens: "accepter" | "refuser" } | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [motif, setMotif] = useState("");
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (decision) { setMotif(""); setErreur(null); setBusy(false); }
  }, [decision]);

  if (!decision) return null;
  const d = decision;
  const refus = d.sens === "refuser";

  async function valider() {
    setBusy(true); setErreur(null);
    try {
      const r = await traiterReforme({
        articles: d.articles.map((a) => a.id_article),
        decision: d.sens,
        motif: motif.trim() || undefined,
      });
      onDone(
        refus
          ? `${r.traites} demande(s) refusée(s) — l'article repart en service.`
          : `${r.traites} article(s) réformé(s)${r.id_document ? " — PV établi." : "."}`,
      );
      onClose();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Traitement impossible.");
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={refus ? "Refuser la demande" : "Accepter la réforme"}
      icon={refus ? <X size={18} /> : <Check size={18} />}
      width={560}
      footer={
        <FormActions
          onCancel={onClose}
          onSubmit={() => void valider()}
          submitLabel={refus ? "Refuser" : "Réformer"}
          submitting={busy}
          // Le motif n'est obligatoire qu'au refus : refuser sans dire pourquoi
          // renvoie le service à son point de départ sans rien lui apprendre.
          disabled={refus && !motif.trim()}
        />
      }
    >
      <div className="space-y-4 p-5">
        {erreur && <Banner type="error">{erreur}</Banner>}
        <Banner type="ok">
          {refus
            ? "L'article repassera en « en service » et la demande sera close."
            : "Un PV de réforme sera établi et l'article en sortira définitivement."}
        </Banner>

        <ul className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          {d.articles.map((a) => (
            <li key={a.id_article} className="text-[13px]">
              <span className="font-mono text-[12px] text-slate-500">{a.num_inventaire}</span>{" "}
              <span className="font-medium text-slate-800">{a.designation}</span>
              {a.motif && (
                <p className="text-[12px] italic text-slate-500">« {a.motif} »</p>
              )}
            </li>
          ))}
        </ul>

        <Field
          label={refus ? "Motif du refus" : "Observation du PV"}
          required={refus}
          hint={refus ? "Le service verra cette réponse" : "Figurera sur le PV de réforme"}
        >
          <TextArea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder={refus ? "Ex. réparable, à remettre en service" : "Ex. PV mensuel de réforme"}
          />
        </Field>
      </div>
    </Modal>
  );
}
