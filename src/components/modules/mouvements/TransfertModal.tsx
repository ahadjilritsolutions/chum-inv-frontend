"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Building2, Home } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Field, Select, TextInput, Banner, FormActions } from "@/components/ui/Form";
import { transferer } from "@/services/inv/mouvements";
import { getLocalisations, getReference } from "@/services/inv/reference";
import { useAccess } from "@/lib/auth/AccessProvider";
import { ACCESS } from "@/lib/access";
import type { LocalisationOption, ServiceRef } from "@/types/inv/reference";
import type { ArticleRow } from "@/types/inv/article";

/**
 * Transférer un article — UN écran pour les deux transferts du legacy.
 *
 * Le legacy avait deux entrées de menu, « Transfert-Interne » et
 * « Transfert-Externe », donc deux écrans à tenir pour un seul geste : déplacer
 * un bien. Ici la question n'est pas posée. Le service de destination arrive
 * PRÉ-SÉLECTIONNÉ sur le service actuel de l'article, si bien qu'un transfert
 * est interne par défaut et ne devient externe que si l'on change ce champ.
 *
 * Ce que l'on choisit, c'est une destination — pas une catégorie de mouvement.
 * La nature du transfert est une CONSÉQUENCE, affichée au fur et à mesure pour
 * que personne ne déplace un bien hors de son service sans s'en apercevoir.
 *
 * ⚠ L'affichage ci-dessous n'est qu'un miroir. Le droit exigé
 * (transfert.interne ou transfert.externe) est décidé par le serveur, qui
 * compare lui-même les deux services : un client peut mentir, une comparaison
 * faite en base ne ment pas.
 *
 * La destination reste la seule donnée obligatoire — d'où part le bien, qui le
 * déplace et quand sont déduits et écrits par le serveur. Le legacy faisait
 * ressaisir l'origine, c'est-à-dire recopier ce que la base savait déjà, avec
 * l'occasion de se tromper que cela suppose.
 */
export default function TransfertModal({
  article, onClose, onDone,
}: {
  article: ArticleRow | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { can } = useAccess();
  const [locs, setLocs] = useState<LocalisationOption[]>([]);
  const [services, setServices] = useState<ServiceRef[]>([]);
  const [service, setService] = useState("");
  const [destination, setDestination] = useState("");
  const [motif, setMotif] = useState("");
  const [fiche, setFiche] = useState(true);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!article) return;
    setDestination(""); setMotif(""); setFiche(true); setErreur(null); setBusy(false);
    // Pré-sélection : le service où le bien se trouve DÉJÀ. C'est ce qui fait
    // du transfert interne le défaut, sans avoir à nommer le mot « interne ».
    setService(article.id_service ? String(article.id_service) : "");
    void getLocalisations().then(setLocs).catch(() => setLocs([]));
    void getReference().then((r) => setServices(r.services)).catch(() => setServices([]));
  }, [article]);

  const idService = service ? Number(service) : null;

  /** Les localisations du service choisi, celle du bien exceptée. */
  const destinations = useMemo(
    () =>
      locs.filter(
        (l) => l.id_service === idService && l.libelle !== article?.localisation,
      ),
    [locs, idService, article],
  );

  // Changer de service invalide la localisation retenue : elle appartenait au
  // service précédent et n'est plus proposée.
  useEffect(() => { setDestination(""); }, [service]);

  if (!article) return null;
  const art = article;

  const externe = idService !== null && idService !== art.id_service;
  const droitManquant =
    externe && !can(ACCESS.TRANSFERT_EXTERNE)
      ? "Vous n'avez pas le droit de transférer vers un autre service."
      : !externe && idService !== null && !can(ACCESS.TRANSFERT_INTERNE)
        ? "Vous n'avez pas le droit de transférer au sein de ce service."
        : null;

  async function valider() {
    setBusy(true); setErreur(null);
    try {
      const r = await transferer({
        articles: [art.id_article],
        id_localisation_destination: Number(destination),
        motif: motif.trim() || undefined,
        avec_document: fiche,
      });
      onDone(
        r.id_document
          ? "Article transféré — fiche de transfert établie."
          : "Article transféré.",
      );
      onClose();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Transfert impossible.");
      setBusy(false);
    }
  }

  return (
    <Modal
      open onClose={onClose}
      title="Transférer l'article"
      icon={<ArrowLeftRight size={18} />}
      width={580}
      footer={
        <FormActions
          onCancel={onClose}
          onSubmit={() => void valider()}
          submitLabel={externe ? "Transférer hors du service" : "Transférer"}
          submitting={busy}
          disabled={!destination || droitManquant !== null}
        />
      }
    >
      <div className="space-y-4 p-5">
        {erreur && <Banner type="error">{erreur}</Banner>}

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px]">
          <span className="font-mono text-[12px] text-slate-500">{art.num_inventaire}</span>
          <p className="font-medium text-slate-800">{art.designation}</p>
          <p className="text-[12px] text-slate-500">
            Actuellement : {art.localisation ?? "sans localisation"}
          </p>
        </div>

        <Field
          label="Service de destination"
          required
          hint="Pré-rempli sur le service actuel — le changer fait un transfert externe"
        >
          <Select value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">— choisir —</option>
            {services.map((s) => (
              <option key={s.id_service} value={s.id_service}>
                {s.lib_service}
                {s.id_service === art.id_service ? " (service actuel)" : ""}
              </option>
            ))}
          </Select>
        </Field>

        {/* La nature du mouvement, montrée dès que le service est connu — ce
            n'est pas un choix, c'est une conséquence. */}
        {idService !== null && (
          <div
            className={
              "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[12.5px] " +
              (externe
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-emerald-300 bg-emerald-50 text-emerald-900")
            }
          >
            <span className="mt-0.5 shrink-0">
              {externe ? <Building2 size={15} /> : <Home size={15} />}
            </span>
            <span>
              <strong>{externe ? "Transfert externe" : "Transfert interne"}</strong>
              {" — "}
              {externe
                ? "le bien quitte son service et change de responsable."
                : "le bien reste dans son service, il change seulement de local."}
            </span>
          </div>
        )}

        <Field label="Nouvelle localisation" required>
          <Select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            disabled={idService === null}
          >
            <option value="">
              {idService === null ? "— choisir un service d'abord —" : "— choisir —"}
            </option>
            {destinations.map((l) => (
              <option key={l.id_localisation} value={l.id_localisation}>{l.libelle}</option>
            ))}
          </Select>
          {idService !== null && destinations.length === 0 && (
            <p className="mt-1 text-[11.5px] text-amber-700">
              Ce service n&apos;a aucune autre localisation disponible.
            </p>
          )}
        </Field>

        <Field label="Motif" hint="Apparaîtra sur la fiche et dans l'historique">
          <TextInput
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex. réaffectation au service"
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
          <input
            type="checkbox"
            checked={fiche}
            onChange={(e) => setFiche(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-cyan-600"
          />
          Établir une fiche de transfert (imprimable et signable)
        </label>

        {droitManquant && <Banner type="error">{droitManquant}</Banner>}
      </div>
    </Modal>
  );
}
