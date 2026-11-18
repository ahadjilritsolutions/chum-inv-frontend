"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeftRight, ArrowRight, Ban, Printer, Undo2 } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import ListToolbar from "@/components/ui/ListToolbar";
import DataTable, { Td } from "@/components/ui/DataTable";
import IconAction from "@/components/ui/IconAction";
import ConfirmModal from "@/components/ui/ConfirmModal";
import FicheTransfertPrint from "@/components/modules/mouvements/FicheTransfertPrint";
import { Banner, Select } from "@/components/ui/Form";
import AccessPending from "@/components/ui/AccessPending";
import { useRequireAccess } from "@/lib/auth/useRequireAccess";
import { useAccess } from "@/lib/auth/AccessProvider";
import { ACCESS } from "@/lib/access";
import {
  annulerFiche, desannulerFiche, listMouvements,
} from "@/services/inv/mouvements";
import { getFamilles, getReference, getSousFamilles } from "@/services/inv/reference";
import { formatDate } from "@/components/modules/articles/ArticleDetailModal";
import type { MouvementRow } from "@/types/inv/mouvement";
import type { Lookup, ReferenceFeed } from "@/types/inv/reference";

const TAILLE = 25;

/**
 * Transferts — l'historique des mouvements.
 *
 * Ce que l'ancienne plateforme ne pouvait pas montrer : `ltmobilier.php`
 * listait les ARTICLES dont l'état valait quelque chose, jamais les mouvements.
 * « Qu'est-ce qui a bougé ce mois-ci, et d'où vers où » n'avait pas de réponse.
 *
 * Une ligne = un déplacement, avec ses DEUX bouts. C'est la colonne qui compte :
 * un transfert dont on ne voit qu'une extrémité ne dit rien.
 */
export default function TransfertsPage() {
  const { allowed, loading: gating } = useRequireAccess(ACCESS.MOUVEMENTS_VOIR);
  const { can } = useAccess();
  const peutImprimer = can(ACCESS.TRANSFERT_FICHE_IMPRIMER);
  // Annuler DÉFAIT le déplacement : c'est le pouvoir de décider du sort d'une
  // fiche, le même que la valider — pas celui de l'agent qui la rédige.
  const peutAnnuler = can(ACCESS.TRANSFERT_FICHE_VALIDER);

  const [lignes, setLignes] = useState<MouvementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [recherche, setRecherche] = useState("");
  const [service, setService] = useState("");
  const [categorie, setCategorie] = useState("");
  const [famille, setFamille] = useState("");
  const [sousFamille, setSousFamille] = useState("");
  const [du, setDu] = useState("");
  const [au, setAu] = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ref, setRef] = useState<ReferenceFeed | null>(null);
  const [familles, setFamilles] = useState<Lookup[]>([]);
  const [sousFamilles, setSousFamilles] = useState<Lookup[]>([]);
  /** La fiche demandee a l'impression, et son signal « peinte ». */
  const [fiche, setFiche] = useState<number | null>(null);
  const [fichePrete, setFichePrete] = useState(false);
  /** La fiche dont on vient de demander l'annulation (ou sa réactivation). */
  const [aBasculer, setABasculer] = useState<MouvementRow | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    void getReference().then(setRef).catch(() => setRef(null));
  }, []);

  // Le catalogue est hiérarchique : choisir une catégorie restreint les
  // familles, choisir une famille restreint les sous-familles. Remonter d'un
  // niveau efface ce qui n'a plus de sens en dessous.
  useEffect(() => {
    if (!categorie) { setFamilles([]); setFamille(""); return; }
    void getFamilles(Number(categorie)).then(setFamilles).catch(() => setFamilles([]));
  }, [categorie]);

  useEffect(() => {
    if (!famille) { setSousFamilles([]); setSousFamille(""); return; }
    void getSousFamilles(Number(famille)).then(setSousFamilles).catch(() => setSousFamilles([]));
  }, [famille]);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const d = await listMouvements({
        q: recherche || undefined,
        // L'ecran s'appelle Transferts : le type est FIXE. Le selecteur qui
        // permettait d'y lire des reformes et des creations proposait de
        // quitter la page sans la quitter — quatre de ses cinq valeurs
        // affichaient autre chose que ce que le titre annoncait.
        type: "transfert",
        service: service ? Number(service) : undefined,
        categorie: categorie ? Number(categorie) : undefined,
        famille: famille ? Number(famille) : undefined,
        sous_famille: sousFamille ? Number(sousFamille) : undefined,
        du: du || undefined,
        au: au || undefined,
        page,
        limit: TAILLE,
      });
      setLignes(d.mouvements);
      setTotal(d.total);
      setPages(d.pages);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setChargement(false);
    }
  }, [recherche, service, categorie, famille, sousFamille, du, au, page]);

  useEffect(() => { void charger(); }, [charger]);

  const filtrer = (fn: () => void) => { fn(); setPage(1); };

  /**
   * Annuler, ou refaire. Le serveur REFUSE si un bien a bougé depuis la
   * fiche — son message nomme alors les articles concernés, et c'est lui
   * qu'on affiche : « 3 articles ont bougé depuis cette fiche » est une
   * réponse, « échec de l'opération » n'en est pas une.
   */
  async function basculer(m: MouvementRow, motif: string) {
    if (!m.id_document) return;
    setOccupe(true); setErreur(null); setInfo(null);
    try {
      const annulee = m.doc_statut === "annule";
      const r = annulee
        ? await desannulerFiche(m.id_document)
        : await annulerFiche(m.id_document, motif);
      setInfo(
        annulee
          ? `Fiche ${m.num_document ?? ""} réactivée — ${r.articles} article(s) renvoyé(s) à destination.`
          : `Fiche ${m.num_document ?? ""} annulée — ${r.articles} article(s) ramené(s) à leur local d'origine.`,
      );
      setABasculer(null);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Opération impossible.");
      setABasculer(null);
    } finally {
      setOccupe(false);
    }
  }

  /**
   * On n'imprime QU'APRES que la fiche a ete peinte.
   *
   * Dans le meme tick, window.print() sortirait une feuille blanche. Les 80 ms
   * laissent au navigateur le temps de poser l'ecusson et le QR de l'en-tete
   * avant d'ouvrir sa propre fenetre d'apercu. Meme montage que la page
   * Articles.
   */
  useEffect(() => {
    if (fiche === null || !fichePrete) return;
    const t = setTimeout(() => {
      window.print();
      setFiche(null);
      setFichePrete(false);
    }, 80);
    return () => clearTimeout(t);
  }, [fiche, fichePrete]);

  if (gating || !allowed) return <AccessPending />;

  return (
    <div className="space-y-4">
      <PageHero
        title="Transferts"
        icon={ArrowLeftRight}
      />

      {erreur && <Banner type="error">{erreur}</Banner>}
      {info && <Banner type="ok">{info}</Banner>}

      <ListToolbar
        recherche={recherche}
        onRecherche={(v) => filtrer(() => setRecherche(v))}
        placeholder="N° d'inventaire ou désignation…"
        total={total}
        filters={
          <>
            <Select
              value={service}
              onChange={(e) => filtrer(() => setService(e.target.value))}
              className="w-auto min-w-[150px]"
            >
              <option value="">Tous les services</option>
              {(ref?.services ?? []).map((s) => (
                <option key={s.id_service} value={s.id_service}>{s.lib_service}</option>
              ))}
            </Select>
            <Select
              value={categorie}
              onChange={(e) => filtrer(() => setCategorie(e.target.value))}
              className="w-auto min-w-[150px]"
            >
              <option value="">Toutes catégories</option>
              {(ref?.categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.libelle}</option>
              ))}
            </Select>
            <Select
              value={famille}
              onChange={(e) => filtrer(() => setFamille(e.target.value))}
              disabled={familles.length === 0}
              className="w-auto min-w-[150px]"
            >
              <option value="">Toutes familles</option>
              {familles.map((f) => (
                <option key={f.id} value={f.id}>{f.libelle}</option>
              ))}
            </Select>
            <Select
              value={sousFamille}
              onChange={(e) => filtrer(() => setSousFamille(e.target.value))}
              disabled={sousFamilles.length === 0}
              className="w-auto min-w-[160px]"
            >
              <option value="">Toutes sous-familles</option>
              {sousFamilles.map((f) => (
                <option key={f.id} value={f.id}>{f.libelle}</option>
              ))}
            </Select>
            {/* Deux champs de date cote a cote ne disent pas lequel est le
                debut. Le navigateur affiche « jj/mm/aaaa » dans les deux, et
                l'attribut title ne se lit qu'au survol — donc jamais sur une
                tablette. Les mots sont ecrits. */}
            {/* Les deux dates forment UN filtre, d'où le conteneur commun. Il
                revient à la ligne sur un téléphone : « De [jj/mm/aaaa] jusqu'à
                [jj/mm/aaaa] » demande 400 px, et sur 300 px il poussait toute
                la page en défilement horizontal. */}
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-[12.5px] font-medium text-slate-500">De</span>
              <input
                type="date"
                value={du}
                onChange={(e) => filtrer(() => setDu(e.target.value))}
                aria-label="Date de début"
                className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 text-[13px] text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 sm:flex-none"
              />
              <span className="text-[12.5px] font-medium text-slate-500">jusqu&apos;à</span>
              <input
                type="date"
                value={au}
                onChange={(e) => filtrer(() => setAu(e.target.value))}
                aria-label="Date de fin"
                className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 text-[13px] text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 sm:flex-none"
              />
            </span>
          </>
        }
      />

      <DataTable
        colonnes={[
          // La fiche OUVRE la ligne : c'est le numéro porté par le papier
          // classé, et donc l'entrée dans la liste quand on arrive avec une
          // fiche à la main — le cas le plus fréquent.
          { titre: "Fiche" },
          { titre: "Date" },
          { titre: "N° inventaire" },
          { titre: "Désignation" },
          { titre: "De → Vers" },
          { titre: "Motif" },
        ]}
        lignes={lignes}
        cle={(m) => m.id_mouvement}
        chargement={chargement}
        messageVide="Aucun mouvement ne correspond à ces critères."
        largeurMin={1000}
        page={page}
        pages={pages}
        onPage={setPage}
        rendu={(m) => {
          return (
            <>
              <Td>
                {/* Le numero ET le bouton : le numero est ce qui figure sur le
                    papier classe, le bouton est ce qui en ressort un autre
                    exemplaire. Un transfert peut avoir ete fait sans fiche
                    (avec_document est facultatif) — on le dit plutot que de
                    proposer d'imprimer un document qui n'existe pas. */}
                {m.id_document ? (
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <span
                      className={
                        "font-mono text-[12px] " +
                        (m.doc_statut === "annule"
                          ? "text-slate-400 line-through"
                          : "text-slate-500")
                      }
                    >
                      {m.num_document ?? "—"}
                    </span>

                    {/* Une fiche annulée le DIT. Barrer le numéro ne suffit
                        pas : sur une ligne de tableau, une rature se lit comme
                        un défaut d'affichage. */}
                    {m.doc_statut === "annule" && (
                      <span className="rounded bg-red-50 px-1.5 py-px text-[10px] font-bold text-red-700">
                        ANNULÉE
                      </span>
                    )}

                    {peutImprimer && (
                      <IconAction
                        title={"Imprimer la fiche " + (m.num_document ?? "")}
                        tone="print"
                        onClick={() => {
                          setFichePrete(false);
                          setFiche(m.id_document);
                        }}
                      >
                        <Printer size={14} />
                      </IconAction>
                    )}

                    {peutAnnuler && (
                      <IconAction
                        title={
                          m.doc_statut === "annule"
                            ? "Réactiver la fiche — les biens repartent à destination"
                            : "Annuler la fiche — les biens reviennent à leur local d'origine"
                        }
                        tone={m.doc_statut === "annule" ? "edit" : "danger"}
                        disabled={occupe}
                        onClick={() => setABasculer(m)}
                      >
                        {m.doc_statut === "annule" ? <Undo2 size={14} /> : <Ban size={14} />}
                      </IconAction>
                    )}
                  </span>
                ) : (
                  <span className="text-[12px] italic text-slate-400">sans fiche</span>
                )}
              </Td>
              <Td className="whitespace-nowrap text-slate-600">
                {formatDate(m.date_mouvement)}
              </Td>
              <Td className="font-mono text-[12.5px] font-medium text-slate-700">
                {m.num_inventaire}
              </Td>
              <Td className="font-medium text-slate-800">{m.designation}</Td>
              <Td>
                {/* Les deux bouts, toujours — c'est la colonne qui justifie
                    l'écran. Un mouvement sans origine ni destination (une
                    réforme, une création) le dit plutôt que d'afficher du vide
                    trompeur. */}
                {m.loc_avant || m.loc_apres ? (
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-[12.5px]">
                    <span className="text-slate-600">{m.loc_avant ?? "—"}</span>
                    <ArrowRight size={13} className="shrink-0 text-slate-400" />
                    <span className="font-medium text-slate-800">{m.loc_apres ?? "—"}</span>
                  </span>
                ) : (
                  <span className="text-[12px] italic text-slate-400">
                    sans déplacement
                  </span>
                )}
              </Td>
              <Td className="max-w-[220px] truncate text-[12.5px] text-slate-500">
                {m.commentaire ?? "—"}
              </Td>
            </>
          );
        }}
      />

      <ConfirmModal
        open={aBasculer !== null}
        titre={
          aBasculer?.doc_statut === "annule"
            ? "Réactiver la fiche"
            : "Annuler la fiche de transfert"
        }
        ton={aBasculer?.doc_statut === "annule" ? "normal" : "danger"}
        confirmer={aBasculer?.doc_statut === "annule" ? "Réactiver" : "Annuler la fiche"}
        occupe={occupe}
        motif={aBasculer?.doc_statut === "annule" ? "aucun" : "facultatif"}
        labelMotif="Pourquoi cette annulation ?"
        message={
          aBasculer?.doc_statut === "annule" ? (
            <>
              Les biens de cette fiche <b>repartent à leur destination</b>, et un
              mouvement est écrit au journal. L&apos;annulation précédente reste
              visible : rien n&apos;est effacé.
            </>
          ) : (
            <>
              Les biens de cette fiche <b>reviennent à leur local d&apos;origine</b>.
              Le mouvement initial reste au journal et un mouvement inverse est
              écrit à côté — on lit donc toute l&apos;histoire. Un bien qui a
              bougé depuis ne sera pas déplacé : l&apos;opération est alors
              refusée en le nommant.
            </>
          )
        }
        detail={
          aBasculer && (
            <>
              <span className="font-mono text-[12px] text-slate-500">
                {aBasculer.num_document}
              </span>
              <p className="font-medium text-slate-800">
                {aBasculer.num_inventaire} — {aBasculer.designation}
              </p>
            </>
          )
        }
        onFermer={() => setABasculer(null)}
        onConfirmer={(motif) => { if (aBasculer) void basculer(aBasculer, motif); }}
      />

      {/* Gare hors champ plutot qu'en display:none — un element masque n'a pas
          de mise en page, et l'imprimer fait sauter la premiere page.
          globals.css fait de ce conteneur la seule chose visible sur la
          feuille. */}
      <div
        id="print-ticket"
        aria-hidden
        className="pointer-events-none absolute -left-[10000px] top-0 w-[210mm]"
      >
        {fiche !== null && (
          <FicheTransfertPrint id={fiche} onPret={setFichePrete} />
        )}
      </div>
    </div>
  );
}
