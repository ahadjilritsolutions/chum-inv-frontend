"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck, FileText, Loader2, Printer, QrCode, Tag,
} from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import ViewTabs, { type ViewTab } from "@/components/ui/ViewTabs";
import { Banner, Field, Select } from "@/components/ui/Form";
import AccessPending from "@/components/ui/AccessPending";
import FeuilleImpression from "@/components/ui/FeuilleImpression";
import PlancheEtiquettes from "@/components/modules/impression/PlancheEtiquettes";
import { useRequireAccess } from "@/lib/auth/useRequireAccess";
import { useAccess } from "@/lib/auth/AccessProvider";
import { ACCESS } from "@/lib/access";
import {
  getEtiquettes, getInventaire, type GroupeImpression,
} from "@/services/inv/impression";
import {
  getFamilles, getLocalisations, getReference, getSousFamilles,
} from "@/services/inv/reference";
import type { LocalisationOption, Lookup, ReferenceFeed } from "@/types/inv/reference";

type Doc = "fiche" | "inventaire" | "etiquettes";

/**
 * Combien d'étiquettes on accepte de composer d'un coup.
 *
 * Chaque vignette coûte un encodage QR, deux décodages d'image et un dessin
 * sur canvas — le tout synchrone, dans l'onglet. À 2 932 le navigateur se fige
 * sans rien dire ; à 1 483 (la plus grosse catégorie du parc) aussi. Exiger un
 * périmètre ne suffit donc pas : « MOBILIER-DE-BUREAU » EST un périmètre.
 *
 * 150 est au-dessus de tout ce qu'on colle en une séance — la localisation la
 * plus fournie du parc en compte 100 — et bien en dessous de ce qui fait
 * souffrir la machine. Au-delà, la LISTE reste affichée : c'est elle qui sert à
 * redescendre sous le seuil, en décochant.
 */
const MAX_ETIQUETTES = 150;

type EtiquetteLigne = {
  id_article: number;
  num_inventaire: string;
  designation: string;
  localisation: string | null;
  service: string | null;
  marque: string | null;
  modele: string | null;
  num_serie: string | null;
};

/**
 * IMPRESSIONS — l'atelier de tirage du module.
 *
 * ── POURQUOI UNE PAGE, ET PAS UN BOUTON SUR CHAQUE ÉCRAN ────────────────────
 * Parce qu'on n'y vient pas pour consulter : on y vient parce qu'on a besoin de
 * PAPIER. Les documents qu'un inventaire produit — la feuille qu'on emporte
 * dans les couloirs, l'état d'un service qu'un chef signe, les étiquettes à
 * coller — ne se demandent pas depuis la fiche d'un bien. Ils se demandent pour
 * un PÉRIMÈTRE : un local, un service.
 *
 * ── TROIS DOCUMENTS, ET NON DEUX ────────────────────────────────────────────
 * L'onglet « Inventaire » en servait deux à la fois, et mal :
 *
 *   • LA FICHE D'INVENTAIRE — le récolement d'UN local. Quatre colonnes
 *     (numéro, désignation, marque, état) et une case à cocher, rien d'autre.
 *     C'est la feuille qu'on tient à la main devant une armoire, et tout ce qui
 *     ne sert pas à cocher l'encombre : la valeur, le n° de série et les totaux
 *     ne se vérifient pas à l'œil. La localisation y est OBLIGATOIRE — un
 *     récolement se fait pièce par pièce, pas par service entier — et seuls les
 *     biens EN SERVICE y figurent : on ne part pas chercher dans un bureau un
 *     meuble déjà réformé.
 *
 *   • L'INVENTAIRE DÉTAILLÉ — l'état complet, ventilé, valorisé, avec ses
 *     totaux. C'est une pièce comptable, pas une feuille de tournée. Il garde
 *     tous ses filtres et ses deux réglages.
 *
 * ── LA PORTÉE DÉCIDE DU DROIT ───────────────────────────────────────────────
 * Une localisation précise exige `impression.inventaire_localisation` ; sans
 * elle, la feuille couvre un service entier et c'est
 * `impression.inventaire_service` qu'il faut. Le serveur en décide lui-même en
 * lisant les filtres — l'écran ne fait que ne pas proposer ce qui sera refusé.
 */
export default function ImpressionPage() {
  const { allowed, loading: gating } = useRequireAccess(ACCESS.IMPRESSION_VOIR);
  const { can } = useAccess();

  const [doc, setDoc] = useState<Doc>("fiche");
  const [ref, setRef] = useState<ReferenceFeed | null>(null);
  const [locs, setLocs] = useState<LocalisationOption[]>([]);
  const [familles, setFamilles] = useState<Lookup[]>([]);
  const [sousFamilles, setSousFamilles] = useState<Lookup[]>([]);

  const [service, setService] = useState("");
  const [localisation, setLocalisation] = useState("");
  const [categorie, setCategorie] = useState("");
  const [famille, setFamille] = useState("");
  const [sousFamille, setSousFamille] = useState("");
  const [ventile, setVentile] = useState(true);
  const [inclureSortis, setInclureSortis] = useState(false);

  const [groupes, setGroupes] = useState<GroupeImpression[] | null>(null);
  const [etiquettes, setEtiquettes] = useState<EtiquetteLigne[] | null>(null);
  /** Les étiquettes RETENUES. Absente de l'ensemble = décochée. */
  const [choisies, setChoisies] = useState<Set<number>>(new Set());
  const [total, setTotal] = useState(0);
  const [totalValeur, setTotalValeur] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [qrPrets, setQrPrets] = useState(true);

  useEffect(() => {
    void getReference().then(setRef).catch(() => setRef(null));
    void getLocalisations().then(setLocs).catch(() => setLocs([]));
  }, []);

  // Le catalogue est hiérarchique : une catégorie restreint les familles, une
  // famille restreint les sous-familles. Remonter d'un niveau efface ce qui n'a
  // plus de sens en dessous.
  useEffect(() => {
    if (!categorie) { setFamilles([]); setFamille(""); return; }
    void getFamilles(Number(categorie)).then(setFamilles).catch(() => setFamilles([]));
  }, [categorie]);

  useEffect(() => {
    if (!famille) { setSousFamilles([]); setSousFamille(""); return; }
    void getSousFamilles(Number(famille)).then(setSousFamilles).catch(() => setSousFamilles([]));
  }, [famille]);

  // Changer de périmètre invalide ce qui est affiché : garder l'ancien aperçu
  // sous les nouveaux filtres laisserait imprimer le mauvais document.
  useEffect(() => {
    setGroupes(null); setEtiquettes(null); setChoisies(new Set()); setErreur(null);
  }, [service, localisation, categorie, famille, sousFamille, ventile, inclureSortis, doc]);

  const locsDuService = useMemo(
    () => (service ? locs.filter((l) => l.id_service === Number(service)) : locs),
    [locs, service],
  );

  const filtres = useMemo(() => ({
    service: service ? Number(service) : undefined,
    localisation: localisation ? Number(localisation) : undefined,
    categorie: categorie ? Number(categorie) : undefined,
    famille: famille ? Number(famille) : undefined,
    sous_famille: sousFamille ? Number(sousFamille) : undefined,
    inclure_sortis: inclureSortis,
  }), [service, localisation, categorie, famille, sousFamille, inclureSortis]);

  /**
   * Y a-t-il un périmètre ? Un seul filtre suffit — le service, le local, ou
   * n'importe quel niveau du catalogue.
   */
  const perimetrePose =
    service !== "" || localisation !== "" || categorie !== "" ||
    famille !== "" || sousFamille !== "";

  const preparer = useCallback(async () => {
    setChargement(true); setErreur(null);
    try {
      if (doc === "etiquettes") {
        const d = await getEtiquettes(filtres);
        setEtiquettes(d.etiquettes);
        // Tout est coché en arrivant : on vient d'exprimer un périmètre, et
        // c'est celui-là qu'on veut. Décocher trois exceptions est plus rapide
        // que cocher quarante lignes.
        setChoisies(new Set(d.etiquettes.map((e) => e.id_article)));
        setTotal(d.total);
      } else {
        const d = await getInventaire({
          ...filtres,
          // La fiche de récolement ne montre QUE ce qui est encore en service,
          // et n'est jamais ventilée : elle porte sur un seul local.
          ...(doc === "fiche"
            ? { statut: "en_service", inclure_sortis: false, groupe: "aucun" as const }
            : { groupe: ventile ? ("localisation" as const) : ("aucun" as const) }),
        });
        setGroupes(d.groupes);
        setTotal(d.total);
        setTotalValeur(d.total_valeur);
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Préparation impossible.");
      setGroupes(null); setEtiquettes(null);
    } finally {
      setChargement(false);
    }
  }, [doc, filtres, ventile]);

  // ── L'onglet Étiquettes se sert TOUT SEUL — MAIS PAS À VIDE ───────────────
  //
  // On y vient avec un périmètre en tête ; « Préparer le document » était un
  // clic de plus pour découvrir ce que l'on venait justement chercher. La liste
  // suit donc les filtres, et l'aperçu suit la liste. Les 250 ms évitent une
  // requête par frappe quand on descend une liste déroulante au clavier.
  //
  // ⚠ IL FAUT UN FILTRE. Sans garde, ouvrir l'onglet chargeait les 2 932
  // articles du parc et lançait 2 932 compositions de QR sur canvas — chacune
  // étant un encodage, deux décodages d'image et un dessin. Le navigateur se
  // fige, et rien à l'écran ne dit pourquoi. C'est arrivé au premier essai.
  //
  // Le garde n'est pas un plafond arbitraire : il dit que ce tirage n'a PAS DE
  // SENS sans périmètre. On n'imprime pas les étiquettes de tout l'hôpital
  // d'un clic ; on imprime celles d'un local, d'un service, d'une famille.
  useEffect(() => {
    if (doc !== "etiquettes" || !allowed || !perimetrePose) return;
    const t = setTimeout(() => { void preparer(); }, 250);
    return () => clearTimeout(t);
  }, [doc, allowed, perimetrePose, preparer]);

  if (gating || !allowed) return <AccessPending />;

  const onglets: ReadonlyArray<ViewTab<Doc>> = [
    { id: "fiche", label: "Fiche d'inventaire", icon: ClipboardCheck },
    { id: "inventaire", label: "Inventaire détaillé", icon: FileText },
    ...(can(ACCESS.IMPRESSION_ETIQUETTES_LOT)
      ? [{ id: "etiquettes" as const, label: "Étiquettes QR", icon: QrCode }]
      : []),
  ];

  // Sans localisation, la feuille couvre un service entier : c'est l'autre droit.
  const droitManquant =
    doc !== "etiquettes" && !localisation && !can(ACCESS.IMPRESSION_INVENTAIRE_SERVICE)
      ? "Vous ne pouvez imprimer que l'inventaire d'une localisation précise — choisissez-en une."
      : doc !== "etiquettes" && localisation && !can(ACCESS.IMPRESSION_INVENTAIRE_LOCALISATION)
        ? "Vous n'avez pas le droit d'imprimer l'inventaire d'une localisation."
        : null;

  // La fiche de récolement porte sur UN local. Sans lui, elle n'existe pas.
  const localManquant =
    doc === "fiche" && !localisation
      ? "Choisissez une localisation : une fiche de récolement se fait pièce par pièce."
      : null;

  const nomService =
    ref?.services.find((s) => s.id_service === Number(service))?.lib_service ?? null;
  const nomLoc =
    locs.find((l) => l.id_localisation === Number(localisation))?.libelle ?? null;

  const retenues = (etiquettes ?? []).filter((e) => choisies.has(e.id_article));
  const tropNombreuses = retenues.length > MAX_ETIQUETTES;
  const pret =
    doc === "etiquettes"
      ? retenues.length > 0 && !tropNombreuses && qrPrets
      : groupes !== null;

  const basculer = (id: number) =>
    setChoisies((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const toutes = etiquettes !== null && etiquettes.length > 0
    && retenues.length === etiquettes.length;

  return (
    <div className="space-y-4">
      <PageHero title="Impressions" icon={Printer} />

      <ViewTabs tabs={onglets} active={doc} onChange={setDoc} />

      {erreur && <Banner type="error">{erreur}</Banner>}

      {/* ── Le périmètre ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Field label="Service" hint="Vide = tous ceux que vous voyez">
            <Select
              value={service}
              onChange={(e) => { setService(e.target.value); setLocalisation(""); }}
            >
              <option value="">Tous les services</option>
              {(ref?.services ?? []).map((s) => (
                <option key={s.id_service} value={s.id_service}>{s.lib_service}</option>
              ))}
            </Select>
          </Field>

          <Field
            label="Localisation"
            hint={doc === "fiche" ? "Obligatoire pour une fiche" : "Vide = tout le service"}
          >
            <Select value={localisation} onChange={(e) => setLocalisation(e.target.value)}>
              <option value="">
                {doc === "fiche" ? "— à choisir —" : "Toutes les localisations"}
              </option>
              {locsDuService.map((l) => (
                <option key={l.id_localisation} value={l.id_localisation}>{l.libelle}</option>
              ))}
            </Select>
          </Field>

          <Field label="Catégorie">
            <Select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
              <option value="">Toutes catégories</option>
              {(ref?.categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.libelle}</option>
              ))}
            </Select>
          </Field>

          <Field label="Famille" hint="Après une catégorie">
            <Select
              value={famille}
              onChange={(e) => setFamille(e.target.value)}
              disabled={familles.length === 0}
            >
              <option value="">Toutes familles</option>
              {familles.map((f) => (
                <option key={f.id} value={f.id}>{f.libelle}</option>
              ))}
            </Select>
          </Field>

          <Field label="Sous-famille" hint="Après une famille">
            <Select
              value={sousFamille}
              onChange={(e) => setSousFamille(e.target.value)}
              disabled={sousFamilles.length === 0}
            >
              <option value="">Toutes sous-familles</option>
              {sousFamilles.map((f) => (
                <option key={f.id} value={f.id}>{f.libelle}</option>
              ))}
            </Select>
          </Field>

          {/* Ces deux réglages n'existent que pour l'inventaire détaillé : une
              fiche de récolement est par définition un seul local, et ne
              cherche jamais un bien déjà sorti du parc. */}
          {doc === "inventaire" && (
            <div className="flex flex-col justify-end gap-2 pb-0.5">
              <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-slate-700">
                <input
                  type="checkbox"
                  checked={ventile}
                  onChange={(e) => setVentile(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-cyan-600"
                />
                Ventiler par localisation
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-slate-700">
                <input
                  type="checkbox"
                  checked={inclureSortis}
                  onChange={(e) => setInclureSortis(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-cyan-600"
                />
                Inclure réformés et sortis
              </label>
            </div>
          )}
        </div>

        {(droitManquant || localManquant) && (
          <div className="mt-3">
            <Banner type="error">{droitManquant ?? localManquant}</Banner>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {/* L'onglet Étiquettes se charge seul : le bouton n'y aurait rien à
              préparer que l'écran n'ait déjà. */}
          {doc !== "etiquettes" && (
            <button
              type="button"
              onClick={() => void preparer()}
              disabled={chargement || droitManquant !== null || localManquant !== null}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-50"
            >
              {chargement ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
              Préparer le document
            </button>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            disabled={!pret}
            title={
              doc !== "etiquettes" || pret
                ? undefined
                : tropNombreuses
                  ? `Réduisez la sélection à ${MAX_ETIQUETTES} étiquettes au plus`
                  : "Cochez au moins une étiquette"
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
          >
            <Printer size={15} />
            Imprimer
            {doc === "etiquettes" && retenues.length > 0 ? ` (${retenues.length})` : ""}
          </button>

          {chargement && doc === "etiquettes" && (
            <Loader2 size={15} className="animate-spin text-slate-400" />
          )}

          {(groupes !== null || etiquettes !== null) && (
            <span className="text-[12.5px] text-slate-500">
              {total.toLocaleString("fr-DZ")} article{total > 1 ? "s" : ""}
              {doc === "inventaire" && totalValeur > 0 && (
                <> — {totalValeur.toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} DA</>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Sans périmètre, on explique — un écran vide se lit comme une panne. */}
      {doc === "etiquettes" && !perimetrePose && (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-[13px] font-medium text-slate-700">
            Choisissez d&apos;abord un périmètre.
          </p>
          <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-slate-500">
            Un service, une localisation ou une catégorie. Les étiquettes se
            tirent pour un local ou un lot précis — le parc entier compte
            2 932 articles, et personne ne colle 2 932 vignettes d&apos;un clic.
          </p>
        </div>
      )}

      {/* ── ÉTIQUETTES : la liste à gauche, l'aperçu à droite ──────────────── */}
      {doc === "etiquettes" && perimetrePose && etiquettes !== null && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* La liste. On y décoche ce qu'on ne veut pas coller. */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-semibold text-slate-800">
                Articles trouvés
                <span className="ml-1.5 font-normal text-slate-400">
                  ({retenues.length}/{etiquettes.length})
                </span>
              </h2>
              {etiquettes.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setChoisies(
                      toutes ? new Set() : new Set(etiquettes.map((e) => e.id_article)),
                    )
                  }
                  className="text-[12px] font-semibold text-cyan-700 hover:underline"
                >
                  {toutes ? "Tout décocher" : "Tout cocher"}
                </button>
              )}
            </div>

            {etiquettes.length === 0 ? (
              <p className="py-6 text-center text-[12.5px] italic text-slate-400">
                Aucun article dans ce périmètre.
              </p>
            ) : (
              <ul className="max-h-[460px] list-none space-y-1 overflow-y-auto p-0">
                {etiquettes.map((e) => {
                  const coche = choisies.has(e.id_article);
                  return (
                    <li key={e.id_article}>
                      <label
                        className={
                          "flex cursor-pointer items-start gap-2.5 rounded-lg border px-2.5 py-2 transition-colors " +
                          (coche
                            ? "border-cyan-300 bg-cyan-50/60"
                            : "border-slate-200 bg-white hover:bg-slate-50")
                        }
                      >
                        <input
                          type="checkbox"
                          checked={coche}
                          onChange={() => basculer(e.id_article)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-cyan-600"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-mono text-[11.5px] text-slate-500">
                            {e.num_inventaire}
                          </span>
                          <span className="block truncate text-[12.5px] font-medium text-slate-800">
                            {e.designation}
                          </span>
                          <span className="block truncate text-[11px] text-slate-400">
                            {e.localisation ?? "sans localisation"}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* L'aperçu — c'est LE document, pas une image de lui : le même
              conteneur part à l'imprimante. Les vignettes s'y rangent EN LIGNE
              et reviennent à la ligne (voir .etiq-suite dans globals.css) pour
              qu'une trentaine tienne dans la hauteur d'un écran ; à
              l'impression elles redeviennent une par page. */}
          <div className="max-h-[560px] overflow-auto rounded-2xl bg-slate-200 p-4">
            {/* Au-delà du plafond on ne MONTE PAS la planche : c'est le montage
                lui-même qui fige l'onglet, pas son affichage. */}
            {!tropNombreuses && (
              <div id="print-ticket">
                <PlancheEtiquettes etiquettes={retenues} onPret={setQrPrets} />
              </div>
            )}

            {tropNombreuses && (
              <div className="px-2 py-6 text-center">
                <p className="text-[13px] font-semibold text-slate-700">
                  {retenues.length.toLocaleString("fr-DZ")} étiquettes sélectionnées
                </p>
                <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-slate-600">
                  Au-delà de {MAX_ETIQUETTES}, l&apos;aperçu n&apos;est pas
                  composé : générer autant de codes QR fige le navigateur.
                  Décochez, ou resserrez le périmètre — une localisation, une
                  sous-famille.
                </p>
              </div>
            )}

            {retenues.length === 0 && (
              <p className="py-6 text-center text-[12.5px] italic text-slate-500">
                Cochez au moins un article pour voir son étiquette.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── L'aperçu des deux documents papier ─────────────────────────────── */}
      {doc !== "etiquettes" && groupes !== null && (
        <div className="overflow-x-auto rounded-2xl bg-slate-200 p-4">
          <div id="print-ticket">
            {doc === "fiche" ? (
              <FeuilleImpression
                titre="FICHE D'INVENTAIRE"
                numero={nomLoc ?? "—"}
                labelNumero="Local"
                date={new Date().toLocaleDateString("fr-FR")}
                service={nomService}
                localisation={nomLoc}
                signatures={["Le responsable du local", "Le bureau d'inventaire"]}
              >
                {/* QUATRE colonnes et une case. Le n° de série, la valeur et les
                    totaux ne se vérifient pas à l'œil devant une armoire : ils
                    allongeaient la feuille sans aider à cocher. */}
                <table className="bon-table">
                  <thead>
                    <tr>
                      <th style={{ width: "20%" }}>N° inventaire</th>
                      <th>Désignation</th>
                      <th style={{ width: "20%" }}>Marque</th>
                      <th style={{ width: "15%" }}>État</th>
                      <th style={{ width: "8%" }}>Vu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupes.flatMap((g) => g.lignes).map((l) => (
                      <tr key={l.id_article}>
                        <td style={{ fontFamily: "monospace" }}>{l.num_inventaire}</td>
                        <td>{l.designation}</td>
                        <td>{l.marque ?? "—"}</td>
                        <td>{l.etat ?? "—"}</td>
                        <td style={{ textAlign: "center" }}>☐</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} style={{ fontWeight: 700 }}>
                        {total} article{total > 1 ? "s" : ""} en service dans ce local
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </FeuilleImpression>
            ) : (
              <FeuilleImpression
                titre="INVENTAIRE"
                numero={nomLoc ?? nomService ?? "Tous services"}
                labelNumero="Périmètre"
                date={new Date().toLocaleDateString("fr-FR")}
                service={nomService}
                localisation={nomLoc}
                signatures={["Le responsable du service", "Le bureau d'inventaire"]}
              >
                {groupes.map((g) => (
                  <section
                    key={g.id_localisation ?? "sans"}
                    className="print-label"
                    style={{ marginBottom: "5mm" }}
                  >
                    {/* Le titre de groupe ne s'imprime que si l'on ventile : sur
                        une liste à plat il annoncerait un découpage inexistant. */}
                    {ventile && (
                      <h3
                        style={{
                          fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                          borderBottom: "1px solid #000", paddingBottom: "1mm",
                          marginBottom: "1.5mm",
                        }}
                      >
                        {g.localisation}
                        <span style={{ float: "right", fontWeight: 400 }}>
                          {g.lignes.length} article{g.lignes.length > 1 ? "s" : ""}
                        </span>
                      </h3>
                    )}

                    <table className="bon-table">
                      <thead>
                        <tr>
                          <th style={{ width: "17%" }}>N° inventaire</th>
                          <th>Désignation</th>
                          <th style={{ width: "14%" }}>Marque</th>
                          <th style={{ width: "13%" }}>N° série</th>
                          <th style={{ width: "11%" }}>État</th>
                          <th style={{ width: "12%" }}>Valeur</th>
                          {/* La case à cocher est le POINT de la feuille : on
                              part faire le tour et on coche ce qu'on trouve. */}
                          <th style={{ width: "7%" }}>Vu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.lignes.map((l) => (
                          <tr key={l.id_article}>
                            <td style={{ fontFamily: "monospace" }}>{l.num_inventaire}</td>
                            <td>{l.designation}</td>
                            <td>{l.marque ?? "—"}</td>
                            <td>{l.num_serie ?? "—"}</td>
                            <td>{l.etat ?? "—"}</td>
                            <td style={{ textAlign: "right" }}>
                              {Number(l.valeur || 0).toLocaleString("fr-DZ", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td style={{ textAlign: "center" }}>☐</td>
                          </tr>
                        ))}
                      </tbody>
                      {g.total_valeur > 0 && (
                        <tfoot>
                          <tr>
                            <td colSpan={5} style={{ textAlign: "right", fontWeight: 700 }}>
                              {ventile ? "Sous-total" : "Total"}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 700 }}>
                              {g.total_valeur.toLocaleString("fr-DZ", { minimumFractionDigits: 2 })}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </section>
                ))}

                {ventile && groupes.length > 1 && totalValeur > 0 && (
                  <p style={{ fontSize: "11px", fontWeight: 700, textAlign: "right", marginTop: "3mm" }}>
                    <Tag size={11} style={{ display: "inline", marginRight: "1mm" }} />
                    Total général : {total} articles —{" "}
                    {totalValeur.toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} DA
                  </p>
                )}
              </FeuilleImpression>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
