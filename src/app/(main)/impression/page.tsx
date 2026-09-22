"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Printer, QrCode, Tag } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import ViewTabs, { type ViewTab } from "@/components/ui/ViewTabs";
import { Banner, Field, Select } from "@/components/ui/Form";
import AccessPending from "@/components/ui/AccessPending";
import FeuilleImpression from "@/components/ui/FeuilleImpression";
import PlancheEtiquettes from "@/components/modules/impression/PlancheEtiquettes";
import {
  FORMATS_ETIQUETTE, FORMAT_PAR_DEFAUT, formatParCle,
} from "@/lib/inv/formats-etiquette";
import { useRequireAccess } from "@/lib/auth/useRequireAccess";
import { useAccess } from "@/lib/auth/AccessProvider";
import { ACCESS } from "@/lib/access";
import { getEtiquettes, getInventaire, type GroupeImpression } from "@/services/inv/impression";
import { getLocalisations, getReference } from "@/services/inv/reference";
import type { LocalisationOption, ReferenceFeed } from "@/types/inv/reference";

type Doc = "inventaire" | "etiquettes";

/**
 * IMPRESSIONS — l'atelier de tirage du module.
 *
 * ── POURQUOI UNE PAGE, ET PAS UN BOUTON SUR CHAQUE ÉCRAN ────────────────────
 * Parce qu'on n'y vient pas pour consulter : on y vient parce qu'on a besoin de
 * PAPIER. Les documents qu'un inventaire produit — la feuille qu'on emporte
 * dans les couloirs, l'état d'un service qu'un chef signe, la planche
 * d'étiquettes à coller — ne se demandent pas depuis la fiche d'un bien. Ils se
 * demandent pour un PÉRIMÈTRE : un local, un service.
 *
 * Le legacy dispersait ces sorties dans une dizaine de fichiers FPDF sous
 * `sortie/`, chacun accessible depuis un écran différent, et aucun ne disait
 * lequel produisait quoi.
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

  const [doc, setDoc] = useState<Doc>("inventaire");
  const [ref, setRef] = useState<ReferenceFeed | null>(null);
  const [locs, setLocs] = useState<LocalisationOption[]>([]);

  const [service, setService] = useState("");
  const [localisation, setLocalisation] = useState("");
  const [categorie, setCategorie] = useState("");
  const [ventile, setVentile] = useState(true);
  const [inclureSortis, setInclureSortis] = useState(false);
  const [formatEtiq, setFormatEtiq] = useState(FORMAT_PAR_DEFAUT.cle);

  const [groupes, setGroupes] = useState<GroupeImpression[] | null>(null);
  const [etiquettes, setEtiquettes] = useState<
    Array<{
      id_article: number;
      num_inventaire: string;
      designation: string;
      localisation: string | null;
      service: string | null;
      marque: string | null;
      modele: string | null;
      num_serie: string | null;
    }> | null
  >(null);
  const [total, setTotal] = useState(0);
  const [totalValeur, setTotalValeur] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [qrPrets, setQrPrets] = useState(true);

  useEffect(() => {
    void getReference().then(setRef).catch(() => setRef(null));
    void getLocalisations().then(setLocs).catch(() => setLocs([]));
  }, []);

  // Changer de périmètre invalide ce qui est affiché : garder l'ancien aperçu
  // sous les nouveaux filtres laisserait imprimer le mauvais document.
  useEffect(() => {
    setGroupes(null); setEtiquettes(null); setErreur(null);
  }, [service, localisation, categorie, ventile, inclureSortis, doc]);

  // Changer la taille ne relance pas la requête — les données sont les mêmes —
  // mais le format de page, lui, doit suivre l'aperçu affiché.

  const locsDuService = useMemo(
    () => (service ? locs.filter((l) => l.id_service === Number(service)) : locs),
    [locs, service],
  );

  const filtres = {
    service: service ? Number(service) : undefined,
    localisation: localisation ? Number(localisation) : undefined,
    categorie: categorie ? Number(categorie) : undefined,
    inclure_sortis: inclureSortis,
  };

  const preparer = useCallback(async () => {
    setChargement(true); setErreur(null);
    try {
      if (doc === "etiquettes") {
        const d = await getEtiquettes(filtres);
        setEtiquettes(d.etiquettes);
        setTotal(d.total);
      } else {
        const d = await getInventaire({
          ...filtres,
          groupe: ventile ? "localisation" : "aucun",
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
  }, [doc, service, localisation, categorie, ventile, inclureSortis]); // eslint-disable-line react-hooks/exhaustive-deps

  if (gating || !allowed) return <AccessPending />;

  const onglets: ReadonlyArray<ViewTab<Doc>> = [
    { id: "inventaire", label: "Inventaire", icon: FileText },
    ...(can(ACCESS.IMPRESSION_ETIQUETTES_LOT)
      ? [{ id: "etiquettes" as const, label: "Étiquettes QR", icon: QrCode }]
      : []),
  ];

  // Sans localisation, la feuille couvre un service entier : c'est l'autre droit.
  const droitManquant =
    doc === "inventaire" && !localisation && !can(ACCESS.IMPRESSION_INVENTAIRE_SERVICE)
      ? "Vous ne pouvez imprimer que l'inventaire d'une localisation précise — choisissez-en une."
      : doc === "inventaire" && localisation && !can(ACCESS.IMPRESSION_INVENTAIRE_LOCALISATION)
        ? "Vous n'avez pas le droit d'imprimer l'inventaire d'une localisation."
        : null;

  const nomService =
    ref?.services.find((s) => s.id_service === Number(service))?.lib_service ?? null;
  const nomLoc =
    locs.find((l) => l.id_localisation === Number(localisation))?.libelle ?? null;

  const pret = doc === "etiquettes" ? etiquettes !== null && qrPrets : groupes !== null;

  return (
    <div className="space-y-4">
      <PageHero title="Impressions" icon={Printer} />

      <ViewTabs tabs={onglets} active={doc} onChange={setDoc} />

      {erreur && <Banner type="error">{erreur}</Banner>}

      {/* ── Le périmètre ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

          <Field label="Localisation" hint="Vide = tout le service">
            <Select value={localisation} onChange={(e) => setLocalisation(e.target.value)}>
              <option value="">Toutes les localisations</option>
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

          <div className="flex flex-col justify-end gap-2 pb-0.5">
            {/* La taille du support, demandée et non devinée : le service qui
                imprime sait ce qu'il a en rouleau, l'application non. */}
            {doc === "etiquettes" && (
              <Field label="Taille de l'étiquette" hint="Une étiquette par page">
                <Select
                  value={formatEtiq}
                  onChange={(e) => setFormatEtiq(e.target.value)}
                >
                  {FORMATS_ETIQUETTE.map((f) => (
                    <option key={f.cle} value={f.cle}>{f.libelle}</option>
                  ))}
                </Select>
              </Field>
            )}
            {doc === "inventaire" && (
              <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-slate-700">
                <input
                  type="checkbox"
                  checked={ventile}
                  onChange={(e) => setVentile(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-cyan-600"
                />
                Ventiler par localisation
              </label>
            )}
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
        </div>

        {droitManquant && (
          <div className="mt-3">
            <Banner type="error">{droitManquant}</Banner>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => void preparer()}
            disabled={chargement || droitManquant !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-50"
          >
            {chargement ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
            Préparer le document
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={!pret}
            title={
              !pret && (groupes !== null || etiquettes !== null)
                ? "Les codes QR sont en cours de génération"
                : undefined
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
          >
            <Printer size={15} />
            Imprimer
          </button>

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

      {/* ── L'aperçu, qui EST le document ────────────────────────────────── */}
      {(groupes !== null || etiquettes !== null) && (
        <div className="overflow-x-auto rounded-2xl bg-slate-200 p-4">
          <div id="print-ticket">
            {doc === "etiquettes" && etiquettes && (
              <PlancheEtiquettes
                etiquettes={etiquettes}
                format={formatParCle(formatEtiq)}
                onPret={setQrPrets}
              />
            )}

            {doc === "inventaire" && groupes && (
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
