"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeftRight, BookMarked, Boxes, Eye, Layers, PackageX, Pencil, Printer,
  Recycle, ScanLine, Trash2,
} from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import ListToolbar from "@/components/ui/ListToolbar";
import DataTable, { Td } from "@/components/ui/DataTable";
import ConfirmModal from "@/components/ui/ConfirmModal";
import IconAction from "@/components/ui/IconAction";
import { Banner, Select } from "@/components/ui/Form";
import AccessPending from "@/components/ui/AccessPending";
import ArticleFormModal from "@/components/modules/articles/ArticleFormModal";
import ArticleDetailModal from "@/components/modules/articles/ArticleDetailModal";
import TransfertModal from "@/components/modules/mouvements/TransfertModal";
import ProposerReformeModal from "@/components/modules/mouvements/ProposerReformeModal";
import ReformeDirecteModal from "@/components/modules/mouvements/ReformeDirecteModal";
import ChoixImpressionModal, {
  type TypeImpression,
} from "@/components/modules/articles/ChoixImpressionModal";
import FicheArticlePrint from "@/components/modules/articles/FicheArticlePrint";
import PlancheEtiquettes from "@/components/modules/impression/PlancheEtiquettes";
import TourneePresenceModal from "@/components/modules/articles/TourneePresenceModal";
import { useRequireAccess } from "@/lib/auth/useRequireAccess";
import { useAccess } from "@/lib/auth/AccessProvider";
import { ACCESS } from "@/lib/access";
import { listArticles, supprimerArticle, confirmerPresence } from "@/services/inv/articles";
import { getFamilles, getReference, getSousFamilles } from "@/services/inv/reference";
import { statutArticleChip, chipStyle } from "@/lib/inv/theme";
import type { ArticleRow } from "@/types/inv/article";
import type { Lookup, ReferenceFeed } from "@/types/inv/reference";

const TAILLE = 25;

/**
 * Articles — le registre ET le poste de travail.
 *
 * UNE liste, toutes les actions. La première version découpait le registre en
 * une page par valeur de `statut`, ce qui n'était pas un métier mais un
 * `WHERE` : on ne vient pas ici « voir les articles réformés », on vient
 * trouver un bien et agir dessus.
 *
 * Les actions vivent donc sur la ligne, chacune derrière son propre droit :
 * consulter, modifier, transférer, proposer à la réforme, confirmer la
 * présence, supprimer. Le statut redevient ce qu'il est — un filtre.
 */
export default function ArticlesPage() {
  const { allowed, loading: gating } = useRequireAccess(ACCESS.ARTICLES_VOIR);
  const { can } = useAccess();

  const [lignes, setLignes] = useState<ArticleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [recherche, setRecherche] = useState("");
  const [statut, setStatut] = useState("");
  const [etat, setEtat] = useState("");
  const [categorie, setCategorie] = useState("");
  const [famille, setFamille] = useState("");
  const [sousFamille, setSousFamille] = useState("");
  const [service, setService] = useState("");
  const [registre, setRegistre] = useState("");
  const [supprimes, setSupprimes] = useState("sans");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [ref, setRef] = useState<ReferenceFeed | null>(null);
  const [familles, setFamilles] = useState<Lookup[]>([]);
  const [sousFamilles, setSousFamilles] = useState<Lookup[]>([]);
  const [occupe, setOccupe] = useState<number | null>(null);
  /** L'article dont on vient de demander la suppression. */
  const [aSupprimer, setASupprimer] = useState<ArticleRow | null>(null);

  const [form, setForm] = useState<"creer" | "modifier" | "groupe" | null>(null);
  const [cible, setCible] = useState<number | null>(null);
  const [detail, setDetail] = useState<number | null>(null);
  const [transfert, setTransfert] = useState<ArticleRow | null>(null);
  const [reforme, setReforme] = useState<ArticleRow | null>(null);
  const [reformeDirecte, setReformeDirecte] = useState<ArticleRow | null>(null);
  /** L'article dont on vient de cliquer « Imprimer » — ouvre le choix. */
  const [choixImpression, setChoixImpression] = useState<ArticleRow | null>(null);
  /**
   * Le document en attente d'impression.
   *
   * UN SEUL conteneur `#print-ticket`, garé hors champ, où l'on monte le
   * document choisi — le montage du magasin. Deux éléments ne peuvent pas
   * porter le même id, donc c'est la PAGE qui le possède, pas les modals.
   */
  const [aImprimer, setAImprimer] = useState<
    { type: TypeImpression; article: ArticleRow } | null
  >(null);
  const [impressionPrete, setImpressionPrete] = useState(false);
  const [tournee, setTournee] = useState(false);

  useEffect(() => {
    void getReference().then(setRef).catch(() => setRef(null));
  }, []);

  // Le catalogue est hierarchique : choisir une categorie restreint les
  // familles, choisir une famille restreint les sous-familles. Remonter d'un
  // niveau efface ce qui n'a plus de sens en dessous. Meme cascade que sur
  // l'ecran Transferts.
  useEffect(() => {
    if (!categorie) { setFamilles([]); setFamille(""); return; }
    void getFamilles(Number(categorie)).then(setFamilles).catch(() => setFamilles([]));
  }, [categorie]);

  useEffect(() => {
    if (!famille) { setSousFamilles([]); setSousFamille(""); return; }
    void getSousFamilles(Number(famille)).then(setSousFamilles).catch(() => setSousFamilles([]));
  }, [famille]);

  /**
   * On n'imprime QU'APRÈS que le document a été peint.
   *
   * Dans le même tick, window.print() sortirait le contenu précédent du
   * conteneur — ou une feuille blanche. `impressionPrete` est levé par le
   * document lui-même : la fiche quand ses données sont arrivées, l'étiquette
   * quand son QR est rendu. Les 80 ms laissent au navigateur le temps de poser
   * l'image avant d'ouvrir sa propre fenêtre d'aperçu.
   */
  useEffect(() => {
    if (!aImprimer || !impressionPrete) return;
    const t = setTimeout(() => {
      window.print();
      setAImprimer(null);
      setImpressionPrete(false);
    }, 80);
    return () => clearTimeout(t);
  }, [aImprimer, impressionPrete]);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const d = await listArticles({
        q: recherche || undefined,
        statut: statut || undefined,
        etat: etat || undefined,
        categorie: categorie ? Number(categorie) : undefined,
        famille: famille ? Number(famille) : undefined,
        sous_famille: sousFamille ? Number(sousFamille) : undefined,
        service: service ? Number(service) : undefined,
        registre: (registre || undefined) as "oui" | "non" | undefined,
        supprimes: supprimes as "sans" | "seuls" | "tous",
        page,
        limit: TAILLE,
      });
      setLignes(d.articles);
      setTotal(d.total);
      setPages(d.pages);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setChargement(false);
    }
  }, [recherche, statut, etat, categorie, famille, sousFamille, service, registre, supprimes, page]);

  useEffect(() => { void charger(); }, [charger]);

  // Tout changement de filtre ramène à la page 1 : rester sur la page 7 d'un
  // résultat qui n'en a plus que deux affiche un tableau vide.
  const filtrer = (fn: () => void) => { fn(); setPage(1); };

  async function agir(id: number, fn: () => Promise<unknown>, message: string) {
    setOccupe(id);
    setErreur(null);
    try {
      await fn();
      setInfo(message);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setOccupe(null);
    }
  }

  async function supprimer(a: ArticleRow, motif: string) {
    setASupprimer(null);
    await agir(a.id_article, () => supprimerArticle(a.id_article, motif), "Article supprimé.");
  }

  async function marquerPresent(a: ArticleRow) {
    const p = ref?.presences.find((x) => x.code === "present");
    if (!p) { setErreur("Statut de présence « présent » introuvable."); return; }
    await agir(a.id_article, () => confirmerPresence(a.id_article, p.id), "Présence confirmée.");
  }

  /** Le libelle d'un service — la ligne ne porte que son id. */
  const nomService = (id: number | null) =>
    id === null
      ? null
      : ref?.services.find((s) => s.id_service === id)?.lib_service ?? null;

  if (gating || !allowed) return <AccessPending />;

  return (
    <div className="space-y-4">
      <PageHero
        title="Articles"
        icon={Boxes}
      />

      {erreur && <Banner type="error">{erreur}</Banner>}
      {info && <Banner type="ok">{info}</Banner>}

      <ListToolbar
        recherche={recherche}
        onRecherche={(v) => filtrer(() => setRecherche(v))}
        placeholder="N° d'inventaire, désignation, n° de série, marque…"
        total={total}
        onAdd={can(ACCESS.ARTICLES_CREER) ? () => { setCible(null); setForm("creer"); } : undefined}
        addLabel="Nouvel article"
        actions={
          <>
            {/* SCANNER — camera allumee en continu, un scan = un pointage.
                `md:hidden` : on ne scanne pas un meuble depuis un poste fixe.
                Le bouton n'a de sens que le telephone a la main, dans le
                couloir, devant l'armoire.

                Il y en avait DEUX auparavant : celui-ci, et un « Scanner » qui
                ne faisait que donner le focus a la zone de recherche pour une
                douchette. Deux boutons portant la meme promesse pour deux
                gestes differents — le second est parti, la douchette tape de
                toute facon dans le champ des qu'on clique dedans. */}
            {can(ACCESS.ARTICLES_PRESENCE) && (
              <button
                type="button"
                onClick={() => setTournee(true)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg sm:flex-none sm:shrink-0 bg-emerald-600 px-3 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-emerald-700 md:hidden"
              >
                <ScanLine size={15} />
                Scanner
              </button>
            )}
            {can(ACCESS.ARTICLES_CREER_GROUPE) && (
              <button
                type="button"
                onClick={() => { setCible(null); setForm("groupe"); }}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg sm:flex-none sm:shrink-0 border border-cyan-600 bg-white px-3 py-2 text-[12.5px] font-semibold text-cyan-700 transition-colors hover:bg-cyan-50"
              >
                <Layers size={15} />
                Nouveau groupe
              </button>
            )}
          </>
        }
        filters={
          <>
            <Select
              value={statut}
              onChange={(e) => filtrer(() => setStatut(e.target.value))}
              className="w-auto min-w-[150px]"
            >
              <option value="">Tous les statuts</option>
              {(ref?.statuts_article ?? []).map((s) => (
                <option key={s.code} value={s.code}>{s.libelle}</option>
              ))}
            </Select>
            <Select
              value={etat}
              onChange={(e) => filtrer(() => setEtat(e.target.value))}
              className="w-auto min-w-[140px]"
            >
              <option value="">Tous les états</option>
              {(ref?.etats ?? []).map((s) => (
                <option key={s.code} value={s.code}>{s.libelle}</option>
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
            {/* La voie de numérotation est un filtre à part entière : une
                inspection du registre officiel ne regarde pas les biens que la
                tournée a numérotés d'elle-même, et inversement. */}
            <Select
              value={registre}
              onChange={(e) => filtrer(() => setRegistre(e.target.value))}
              className="w-auto min-w-[150px]"
            >
              <option value="">Toutes voies</option>
              <option value="oui">Registre</option>
              <option value="non">Physique</option>
            </Select>
            {can(ACCESS.ARTICLES_VOIR_SUPPRIMES) && (
              <Select
                value={supprimes}
                onChange={(e) => filtrer(() => setSupprimes(e.target.value))}
                className="w-auto min-w-[140px]"
              >
                <option value="sans">Actifs</option>
                <option value="seuls">Supprimés</option>
                <option value="tous">Tous</option>
              </Select>
            )}
          </>
        }
      />

      <DataTable
        colonnes={[
          { titre: "N° inventaire" },
          { titre: "Désignation" },
          { titre: "Localisation" },
          { titre: "Catégorie" },
          { titre: "Statut" },
          { titre: "Actions", className: "text-right" },
        ]}
        lignes={lignes}
        cle={(a) => a.id_article}
        chargement={chargement}
        messageVide="Aucun article ne correspond à ces critères."
        largeurMin={1040}
        page={page}
        pages={pages}
        onPage={setPage}
        rendu={(a) => {
          const st = statutArticleChip(a.statut_code);
          const enService = !a.supprime && a.statut_code !== "reforme";
          return (
            <>
              {/* Le numero, et SOUS lui la voie qui l'a attribue — P comme
                  physique (le compteur), R comme registre (transcrit du cahier
                  officiel). C'etait une colonne entiere pour une seule lettre
                  d'information, qui poussait la localisation hors de l'ecran.
                  La voie appartient au numero : elle dit quelle autorite est
                  derriere lui, elle ne vaut rien sans lui. */}
              <Td className="whitespace-nowrap">
                <span className="block font-mono text-[12.5px] font-medium text-slate-700">
                  {a.num_inventaire}
                </span>
                <span
                  title={
                    a.est_registre
                      ? (a.num_registre && a.num_registre !== a.num_inventaire
                          ? "Registre : " + a.num_registre
                          : "Numéro transcrit du registre officiel")
                      : (a.num_registre
                          ? "Renvoi au cahier papier : " + a.num_registre
                          : "Numéro attribué par le compteur")
                  }
                  className={
                    "mt-0.5 inline-flex items-center gap-1 rounded px-1.5 text-[10px] font-bold " +
                    (a.est_registre
                      ? "bg-violet-50 text-violet-700"
                      : "bg-slate-100 text-slate-500")
                  }
                >
                  {a.est_registre ? <BookMarked size={9} /> : null}
                  {a.est_registre ? "R" : "P"}
                </span>
              </Td>
              <Td className="font-medium text-slate-800">{a.designation}</Td>
              {/* Service AU-DESSUS, local en dessous — deux lignes, chacune
                  entiere. Sur une seule ligne, « DIRECTION-DES-MOYENS-MATERIELS
                  | BUR-CONTABILITE » depassait la colonne et se faisait couper
                  au milieu du service, qui est justement ce qu'on cherche. */}
              <Td>
                {a.localisation || a.id_service !== null ? (
                  <span className="block leading-tight">
                    <span className="block truncate text-[12.5px] font-medium text-slate-700">
                      {nomService(a.id_service) ?? "—"}
                    </span>
                    <span className="block truncate text-[11.5px] text-slate-500">
                      {a.localisation ?? "—"}
                    </span>
                  </span>
                ) : (
                  <span className="text-[12px] italic text-amber-600">sans localisation</span>
                )}
              </Td>
              <Td className="text-slate-500">{a.categorie ?? "—"}</Td>
              <Td>
                <span
                  className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                  style={chipStyle(st)}
                >
                  {st.label}
                </span>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-1.5">
                  {/* Un seul bouton pour deux documents : la fiche A4 et
                      l'étiquette QR. Le choix se pose dans une petite fenêtre
                      plutôt que d'ajouter une neuvième icône à la ligne. */}
                  {(can(ACCESS.ARTICLES_FICHE) || can(ACCESS.ARTICLES_ETIQUETTE)) && (
                    <IconAction
                      title="Imprimer"
                      tone="print"
                      onClick={() => setChoixImpression(a)}
                    >
                      <Printer size={14} />
                    </IconAction>
                  )}

                  <IconAction title="Détails" tone="view" onClick={() => setDetail(a.id_article)}>
                    <Eye size={14} />
                  </IconAction>

                  {can(ACCESS.ARTICLES_MODIFIER) && enService && (
                    <IconAction
                      title="Modifier"
                      tone="edit"
                      disabled={occupe !== null}
                      onClick={() => { setCible(a.id_article); setForm("modifier"); }}
                    >
                      <Pencil size={14} />
                    </IconAction>
                  )}

                  {/* Transférer ne dépend pas du droit sur la FICHE (qui est
                      facultative) mais du droit de déplacer. Lequel des deux —
                      interne ou externe — n'est connu qu'une fois la
                      destination choisie, donc l'icône s'affiche dès que l'un
                      des deux est détenu et c'est le serveur qui tranche. */}
                  {(can(ACCESS.TRANSFERT_INTERNE) || can(ACCESS.TRANSFERT_EXTERNE)) &&
                    enService && (
                    <IconAction
                      title="Transférer"
                      tone="move"
                      disabled={occupe !== null}
                      onClick={() => setTransfert(a)}
                    >
                      <ArrowLeftRight size={14} />
                    </IconAction>
                  )}

                  {can(ACCESS.REFORME_PROPOSER) &&
                    enService &&
                    a.statut_code !== "propose_reforme" && (
                    <IconAction
                      title="Proposer à la réforme"
                      tone="sleep"
                      disabled={occupe !== null}
                      onClick={() => setReforme(a)}
                    >
                      <Recycle size={14} />
                    </IconAction>
                  )}

                  {/* Réformer SANS demande — le « Reformer » qui coexistait
                      avec « P-A-Reforme » dans le menu legacy. Les deux sont
                      offerts côte à côte parce qu'ils ne s'adressent pas aux
                      mêmes personnes : un service PROPOSE, le bureau
                      d'inventaire DÉCIDE — et n'a pas à se proposer à
                      lui-même ce qu'il va accepter. */}
                  {can(ACCESS.REFORME_DIRECTE) && enService && (
                    <IconAction
                      title="Réformer directement"
                      tone="retire"
                      disabled={occupe !== null}
                      onClick={() => setReformeDirecte(a)}
                    >
                      <PackageX size={14} />
                    </IconAction>
                  )}

                  {can(ACCESS.ARTICLES_PRESENCE) && !a.supprime && (
                    <IconAction
                      title="Confirmer la présence"
                      tone="neutral"
                      disabled={occupe !== null}
                      onClick={() => void marquerPresent(a)}
                    >
                      <ScanLine size={14} />
                    </IconAction>
                  )}

                  {can(ACCESS.ARTICLES_SUPPRIMER) && !a.supprime && (
                    <IconAction
                      title="Supprimer"
                      tone="danger"
                      disabled={occupe !== null}
                      onClick={() => setASupprimer(a)}
                    >
                      <Trash2 size={14} />
                    </IconAction>
                  )}
                </div>
              </Td>
            </>
          );
        }}
      />

      <ArticleFormModal
        mode={form}
        id={cible}
        ref={ref}
        onClose={() => setForm(null)}
        onSaved={(m) => { setInfo(m); void charger(); }}
      />
      <ArticleDetailModal
        id={detail}
        onClose={() => setDetail(null)}
        onModifier={(id: number) => { setDetail(null); setCible(id); setForm("modifier"); }}
      />
      <TransfertModal
        article={transfert}
        onClose={() => setTransfert(null)}
        onDone={(m) => { setInfo(m); void charger(); }}
      />
      <ProposerReformeModal
        article={reforme}
        onClose={() => setReforme(null)}
        onDone={(m) => { setInfo(m); void charger(); }}
      />
      <ReformeDirecteModal
        article={reformeDirecte}
        onClose={() => setReformeDirecte(null)}
        onDone={(m) => { setInfo(m); void charger(); }}
      />
      <TourneePresenceModal
        ouvert={tournee}
        onClose={() => setTournee(false)}
        onTermine={(pointes) => {
          if (pointes > 0) {
            setInfo(`${pointes} bien${pointes > 1 ? "s" : ""} pointé${pointes > 1 ? "s" : ""} pendant la tournée.`);
            void charger();
          }
        }}
      />

      <ConfirmModal
        open={aSupprimer !== null}
        titre="Supprimer l'article"
        ton="danger"
        confirmer="Supprimer"
        occupe={occupe !== null}
        motif="obligatoire"
        labelMotif="Motif de la suppression"
        message={
          <>
            L&apos;article sort de la liste active. Un administrateur peut le
            restaurer : la ligne n&apos;est pas effacée, elle est datée et
            signée.
          </>
        }
        detail={
          aSupprimer && (
            <>
              <span className="font-mono text-[12px] text-slate-500">
                {aSupprimer.num_inventaire}
              </span>
              <p className="font-medium text-slate-800">{aSupprimer.designation}</p>
            </>
          )
        }
        onFermer={() => setASupprimer(null)}
        onConfirmer={(motif) => {
          if (aSupprimer) void supprimer(aSupprimer, motif);
        }}
      />

      <ChoixImpressionModal
        article={choixImpression}
        onClose={() => setChoixImpression(null)}
        onChoisir={(type) => {
          if (!choixImpression) return;
          setImpressionPrete(false);
          setAImprimer({ type, article: choixImpression });
        }}
      />

      {/* Garé hors champ plutôt qu'en display:none — un élément masqué n'a pas
          de mise en page, et l'imprimer fait sauter la première page.
          globals.css fait de ce conteneur la seule chose visible sur la
          feuille. */}
      <div
        id="print-ticket"
        aria-hidden
        className={
          "pointer-events-none absolute -left-[10000px] top-0 " +
          // La largeur A4 n'appartient QU'À LA FICHE. L'imposer aussi à une
          // étiquette de 40 mm lui donnerait un conteneur de 210 mm, et
          // l'étiquette ne se poserait pas sur la page comme celle que sort la
          // page Impressions — dont le conteneur, lui, n'a pas de largeur.
          (aImprimer?.type === "etiquette" ? "" : "w-[210mm]")
        }
      >
        {aImprimer?.type === "fiche" && (
          <FicheArticlePrint
            id={aImprimer.article.id_article}
            onPret={setImpressionPrete}
          />
        )}
        {/* LE MÊME COMPOSANT QUE LA PAGE IMPRESSIONS, avec un lot d'un seul
            article — et non une seconde implémentation de l'étiquette.
            Il y en avait deux : celle-ci rendait l'étiquette nue, l'autre la
            posait dans `.etiq-page` avec son `@page`. Deux rendus du même
            autocollant finissent toujours par diverger, et c'est ce qui était
            arrivé — la forme imprimée n'était pas la même des deux écrans. */}
        {aImprimer?.type === "etiquette" && (
          <PlancheEtiquettes
            etiquettes={[
              {
                num_inventaire: aImprimer.article.num_inventaire,
                designation: aImprimer.article.designation,
                localisation: aImprimer.article.localisation,
                // Le nom du service : la ligne ne porte que son id, et le
                // référentiel est déjà chargé pour les filtres.
                service:
                  ref?.services.find(
                    (s) => s.id_service === aImprimer.article.id_service,
                  )?.lib_service ?? null,
                marque: aImprimer.article.marque,
                modele: aImprimer.article.modele,
                num_serie: aImprimer.article.num_serie,
              },
            ]}
            onPret={setImpressionPrete}
          />
        )}
      </div>
    </div>
  );
}
