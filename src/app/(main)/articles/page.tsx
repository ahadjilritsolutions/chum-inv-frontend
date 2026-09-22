"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeftRight, BookMarked, Boxes, Eye, Layers, PackageX, Pencil, Printer,
  QrCode, Recycle, ScanLine, Trash2,
} from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import ListToolbar from "@/components/ui/ListToolbar";
import DataTable, { Td } from "@/components/ui/DataTable";
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
import EtiquetteArticle, {
  useEtiquettes,
} from "@/components/modules/articles/EtiquetteArticle";
import {
  FORMAT_PAR_DEFAUT, type FormatEtiquette,
} from "@/lib/inv/formats-etiquette";
import TourneePresenceModal from "@/components/modules/articles/TourneePresenceModal";
import { useRequireAccess } from "@/lib/auth/useRequireAccess";
import { useAccess } from "@/lib/auth/AccessProvider";
import { ACCESS } from "@/lib/access";
import { listArticles, supprimerArticle, confirmerPresence } from "@/services/inv/articles";
import { getReference } from "@/services/inv/reference";
import { statutArticleChip, chipStyle } from "@/lib/inv/theme";
import type { ArticleRow } from "@/types/inv/article";
import type { ReferenceFeed } from "@/types/inv/reference";

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
  const [service, setService] = useState("");
  const [registre, setRegistre] = useState("");
  /**
   * Compteur de demandes de scan.
   *
   * La douchette EST un clavier : elle tape le numéro puis valide. Le bouton
   * n'ouvre donc pas de caméra, il rend la zone de recherche prête à recevoir
   * la frappe — c'est tout ce dont un lecteur physique a besoin, et cela marche
   * aussi quand l'utilisateur tape le numéro à la main.
   */
  const [scan, setScan] = useState(0);
  const [supprimes, setSupprimes] = useState("sans");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [ref, setRef] = useState<ReferenceFeed | null>(null);
  const [occupe, setOccupe] = useState<number | null>(null);

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
    { type: TypeImpression; article: ArticleRow; format?: FormatEtiquette } | null
  >(null);
  const [impressionPrete, setImpressionPrete] = useState(false);
  const [tournee, setTournee] = useState(false);

  useEffect(() => {
    void getReference().then(setRef).catch(() => setRef(null));
  }, []);

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
  }, [recherche, statut, etat, categorie, service, registre, supprimes, page]);

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

  async function supprimer(a: ArticleRow) {
    const motif = window.prompt(`Motif de la suppression de ${a.num_inventaire} ?`, "");
    if (motif === null) return;
    await agir(a.id_article, () => supprimerArticle(a.id_article, motif), "Article supprimé.");
  }

  async function marquerPresent(a: ArticleRow) {
    const p = ref?.presences.find((x) => x.code === "present");
    if (!p) { setErreur("Statut de présence « présent » introuvable."); return; }
    await agir(a.id_article, () => confirmerPresence(a.id_article, p.id), "Présence confirmée.");
  }

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
        focusSignal={scan}
        placeholder="N° d'inventaire, désignation, n° de série, marque…"
        total={total}
        onAdd={can(ACCESS.ARTICLES_CREER) ? () => { setCible(null); setForm("creer"); } : undefined}
        addLabel="Nouvel article"
        actions={
          <>
            {/* LA TOURNÉE — caméra allumée en continu, un scan = un pointage.
                Placée en premier et en plein cyan parce que c'est l'action pour
                laquelle on sort le téléphone : confirmer que les biens sont
                bien là. L'icône de présence reste sur chaque ligne pour le cas
                d'un seul bien, au bureau. */}
            {can(ACCESS.ARTICLES_PRESENCE) && (
              <button
                type="button"
                onClick={() => setTournee(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <ScanLine size={15} />
                Tournée
              </button>
            )}
            {/* Chercher par code scanné : la douchette tape le numéro dans la
                zone de recherche et valide. Le bouton ne fait que donner le
                focus — c'est le lecteur qui saisit, pas l'écran. */}
            <button
              type="button"
              onClick={() => {
                setScan((n) => n + 1);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12.5px] font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50"
            >
              <QrCode size={15} />
              Scanner
            </button>
            {can(ACCESS.ARTICLES_CREER_GROUPE) && (
              <button
                type="button"
                onClick={() => { setCible(null); setForm("groupe"); }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-cyan-600 bg-white px-3 py-2 text-[12.5px] font-semibold text-cyan-700 transition-colors hover:bg-cyan-50"
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
          { titre: "Voie" },
          { titre: "Désignation" },
          { titre: "Localisation" },
          { titre: "Catégorie" },
          { titre: "État" },
          { titre: "Statut" },
          { titre: "Actions", className: "text-right" },
        ]}
        lignes={lignes}
        cle={(a) => a.id_article}
        chargement={chargement}
        messageVide="Aucun article ne correspond à ces critères."
        largeurMin={1180}
        page={page}
        pages={pages}
        onPage={setPage}
        rendu={(a) => {
          const st = statutArticleChip(a.statut_code);
          const enService = !a.supprime && a.statut_code !== "reforme";
          return (
            <>
              <Td className="font-mono text-[12.5px] font-medium text-slate-700">
                {a.num_inventaire}
              </Td>
              {/* Qui a attribué ce numéro — le compteur, ou le registre papier.
                  Deux biens voisins dans la liste peuvent ne pas avoir la même
                  autorité derrière leur numéro, et cela se lit ici. */}
              <Td>
                {a.est_registre ? (
                  <span
                    title={
                      a.num_registre && a.num_registre !== a.num_inventaire
                        ? `Registre : ${a.num_registre}`
                        : "Numéro transcrit du registre officiel"
                    }
                    className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700"
                  >
                    <BookMarked size={11} />
                    Registre
                  </span>
                ) : (
                  <span
                    title={
                      a.num_registre
                        ? `Renvoi au cahier papier : ${a.num_registre}`
                        : "Numéro attribué par le compteur"
                    }
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                  >
                    Physique
                  </span>
                )}
              </Td>
              <Td className="font-medium text-slate-800">{a.designation}</Td>
              <Td>
                {a.localisation ?? (
                  <span className="text-[12px] italic text-amber-600">sans localisation</span>
                )}
              </Td>
              <Td className="text-slate-500">{a.categorie ?? "—"}</Td>
              <Td>
                {a.etat ? (
                  <span
                    className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                    style={chipStyle({
                      bg: `${a.etat_couleur ?? "#94a3b8"}22`,
                      fg: a.etat_couleur ?? "#475569",
                    })}
                  >
                    {a.etat}
                  </span>
                ) : "—"}
              </Td>
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
                      onClick={() => void supprimer(a)}
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

      <ChoixImpressionModal
        article={choixImpression}
        onClose={() => setChoixImpression(null)}
        onChoisir={(type, format) => {
          if (!choixImpression) return;
          setImpressionPrete(false);
          setAImprimer({ type, article: choixImpression, format });
        }}
      />

      {/* Garé hors champ plutôt qu'en display:none — un élément masqué n'a pas
          de mise en page, et l'imprimer fait sauter la première page.
          globals.css fait de ce conteneur la seule chose visible sur la
          feuille. */}
      <div
        id="print-ticket"
        aria-hidden
        className="pointer-events-none absolute -left-[10000px] top-0 w-[210mm]"
      >
        {aImprimer?.type === "fiche" && (
          <FicheArticlePrint
            id={aImprimer.article.id_article}
            onPret={setImpressionPrete}
          />
        )}
        {aImprimer?.type === "etiquette" && (
          <EtiquetteSeule
            article={aImprimer.article}
            format={aImprimer.format ?? FORMAT_PAR_DEFAUT}
            // Le nom du service : la ligne ne porte que son id, et le
            // référentiel est déjà chargé pour les filtres.
            service={
              ref?.services.find(
                (s) => s.id_service === aImprimer.article.id_service,
              )?.lib_service ?? null
            }
            onPret={setImpressionPrete}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Une étiquette seule sur sa feuille.
 *
 * Le hook doit être appelé depuis un composant, pas depuis le JSX de la page :
 * il ne peut pas vivre sous une condition. D'où ce composant minuscule, monté
 * seulement quand on imprime une étiquette.
 */
function EtiquetteSeule({
  article, format, service, onPret,
}: {
  article: ArticleRow;
  format: FormatEtiquette;
  service: string | null;
  onPret: (pret: boolean) => void;
}) {
  const { pret, logo, qrs } = useEtiquettes([article.num_inventaire]);

  useEffect(() => { onPret(pret); }, [pret, onPret]);

  return (
    <>
      {/* Le format de PAGE est celui de l'étiquette : une étiqueteuse
          imprime des pages, et une page A4 lui ferait dérouler 30 cm de
          ruban pour une vignette de 8 cm. */}
      <style>{`@page { size: ${format.largeur}mm ${format.hauteur}mm; margin: 0; }`}</style>
      <EtiquetteArticle
        article={{
          num_inventaire: article.num_inventaire,
          designation: article.designation,
          localisation: article.localisation,
          service,
          marque: article.marque,
          num_serie: article.num_serie,
        }}
        format={format}
        logo={logo}
        qr={qrs[article.num_inventaire]}
      />
    </>
  );
}
