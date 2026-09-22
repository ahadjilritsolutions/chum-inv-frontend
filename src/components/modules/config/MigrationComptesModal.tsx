"use client";

import { useEffect, useState } from "react";
import {
  Check, ClipboardCopy, Loader2, PlayCircle, TriangleAlert, Users,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Banner, Field, FormActions, Select } from "@/components/ui/Form";
import { migrerComptesLegacy, type RapportMigration } from "@/services/inv/comptes";
import { getReference } from "@/services/inv/reference";
import type { ReferenceFeed } from "@/types/inv/reference";

/**
 * REPRENDRE TOUS LES COMPTES DE L'ANCIENNE PLATEFORME, D'UN GESTE.
 *
 * ── ON REGARDE AVANT D'ÉCRIRE ───────────────────────────────────────────────
 * L'écran s'ouvre sur une SIMULATION, toujours. Elle calcule tout — les logins
 * retenus, les collisions, les rôles, les services — et n'écrit rien. On ne
 * passe à l'écriture qu'après avoir lu le tableau.
 *
 * Ce n'est pas de la prudence décorative : on écrit dans `santeplus`, l'annuaire
 * que la DEP, le LIS et le RIS partagent. Un compte de trop y est visible par
 * trois autres applications, et se retire moins facilement qu'il ne se crée.
 *
 * ── LE SERVICE DE REPLI ─────────────────────────────────────────────────────
 * Sur les quatre services des comptes legacy, un seul a un équivalent
 * santeplus. Les autres n'en ont pas, et l'outil REFUSE de deviner : sans repli
 * ces lignes échouent en le disant. Choisir un service est donc une décision
 * qu'on prend, pas un défaut qu'on subit.
 *
 * ── LES MOTS DE PASSE NE S'AFFICHENT QU'UNE FOIS ────────────────────────────
 * Le rapport final porte le mot de passe initial de chaque compte créé. La base
 * n'en garde qu'une empreinte : ce tableau est la seule occasion de les noter,
 * d'où le bouton de copie et l'avertissement.
 */
export default function MigrationComptesModal({
  ouvert, nbLignes, onClose, onTermine,
}: {
  ouvert: boolean;
  /** Combien de comptes restent à reprendre — pour l'annoncer d'entrée. */
  nbLignes: number;
  onClose: () => void;
  onTermine: (message: string) => void;
}) {
  const [ref, setRef] = useState<ReferenceFeed | null>(null);
  const [service, setService] = useState("");
  const [rapport, setRapport] = useState<RapportMigration | null>(null);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    if (!ouvert) return;
    void getReference().then(setRef).catch(() => setRef(null));
    setService(""); setRapport(null); setErreur(null); setBusy(false); setCopie(false);
  }, [ouvert]);

  if (!ouvert) return null;

  async function lancer(simulation: boolean) {
    setBusy(true); setErreur(null);
    try {
      const r = await migrerComptesLegacy({
        simulation,
        id_service_defaut: service ? Number(service) : undefined,
      });
      setRapport(r);
      if (!simulation) {
        onTermine(
          `${r.crees} compte(s) créé(s), ${r.rattaches} rattaché(s)` +
          (r.echecs ? `, ${r.echecs} à traiter à la main.` : "."),
        );
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Reprise impossible.");
    } finally {
      setBusy(false);
    }
  }

  /** Les identifiants créés, en texte, pour les coller dans un message. */
  function copierIdentifiants() {
    const lignes = (rapport?.lignes ?? [])
      .filter((l) => l.action === "cree")
      .map((l) => `${l.nom}\t${l.login}\t${l.mot_de_passe}\t${l.role}`)
      .join("\n");
    void navigator.clipboard.writeText(`Nom\tIdentifiant\tMot de passe\tRôle\n${lignes}`);
    setCopie(true);
    setTimeout(() => setCopie(false), 2500);
  }

  const applique = rapport !== null && !rapport.simulation;

  return (
    <Modal
      open onClose={onClose}
      title="Reprendre les comptes de l'ancienne plateforme"
      icon={<Users size={18} />}
      width={860}
      footer={
        applique ? (
          <div className="flex justify-end px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-cyan-700"
            >
              Fermer
            </button>
          </div>
        ) : (
          <FormActions
            onCancel={onClose}
            onSubmit={() => void lancer(rapport === null)}
            submitLabel={rapport === null ? "Prévisualiser" : `Créer les ${rapport.crees} compte(s)`}
            submitting={busy}
            disabled={rapport !== null && rapport.crees === 0 && rapport.rattaches === 0}
          />
        )
      }
    >
      <div className="space-y-4 p-5">
        {erreur && <Banner type="error">{erreur}</Banner>}

        {rapport === null && (
          <>
            <Banner type="ok">
              {nbLignes} compte(s) de l&apos;ancienne plateforme restent à reprendre.
              L&apos;outil cherche d&apos;abord la personne dans l&apos;annuaire ; s&apos;il ne la
              trouve pas, il crée le compte et lui donne son rôle.
            </Banner>

            <Field
              label="Service de repli"
              hint="Pour les comptes dont le service de l'ancienne plateforme n'a pas d'équivalent"
            >
              <Select value={service} onChange={(e) => setService(e.target.value)}>
                <option value="">— aucun : ces comptes seront signalés, pas créés —</option>
                {(ref?.services ?? []).map((s) => (
                  <option key={s.id_service} value={s.id_service}>{s.lib_service}</option>
                ))}
              </Select>
            </Field>

            <p className="text-[11.5px] leading-snug text-slate-500">
              La prévisualisation ne modifie rien. Elle montre exactement ce qui
              serait créé — identifiants compris — avant d&apos;écrire quoi que ce
              soit dans l&apos;annuaire partagé avec la DEP et le LIS.
            </p>
          </>
        )}

        {rapport && (
          <>
            <Banner type={rapport.simulation ? "ok" : "ok"}>
              {rapport.simulation ? (
                <>
                  <strong>Prévisualisation</strong> — rien n&apos;a été écrit.{" "}
                  {rapport.crees} compte(s) seraient créés, {rapport.rattaches} rattaché(s)
                  {rapport.echecs > 0 && `, ${rapport.echecs} laissé(s) de côté`}.
                </>
              ) : (
                <>
                  <strong>Terminé</strong> — {rapport.crees} compte(s) créé(s),{" "}
                  {rapport.rattaches} rattaché(s)
                  {rapport.echecs > 0 && `, ${rapport.echecs} à traiter à la main`}.
                </>
              )}
            </Banner>

            {applique && rapport.crees > 0 && (
              <Banner type="error">
                Notez les mots de passe maintenant : ils ne seront plus affichés.
                La base n&apos;en garde qu&apos;une empreinte.
              </Banner>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-[12px]">
                <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Personne</th>
                    <th className="px-3 py-2 font-semibold">Identifiant</th>
                    {applique && <th className="px-3 py-2 font-semibold">Mot de passe</th>}
                    <th className="px-3 py-2 font-semibold">Rôle</th>
                    <th className="px-3 py-2 font-semibold">Service</th>
                  </tr>
                </thead>
                <tbody>
                  {rapport.lignes.map((l) => (
                    <tr key={l.id_legacy} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1.5 font-medium text-slate-800">
                          {l.action === "echec" ? (
                            <TriangleAlert size={12} className="shrink-0 text-amber-500" />
                          ) : (
                            <Check size={12} className="shrink-0 text-emerald-600" />
                          )}
                          {l.nom}
                        </span>
                        {l.motif && (
                          <span className="block text-[10.5px] text-slate-400">{l.motif}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11.5px] text-slate-600">
                        {l.login ?? "—"}
                      </td>
                      {applique && (
                        <td className="px-3 py-2 font-mono text-[12px] font-bold text-slate-900">
                          {l.mot_de_passe ?? "—"}
                        </td>
                      )}
                      <td className="px-3 py-2 text-slate-600">{l.role ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-500">{l.service ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {applique && rapport.crees > 0 && (
              <button
                type="button"
                onClick={copierIdentifiants}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                {copie ? <Check size={14} className="text-emerald-600" /> : <ClipboardCopy size={14} />}
                {copie ? "Copié" : "Copier les identifiants"}
              </button>
            )}

            {rapport.simulation && rapport.echecs > 0 && (
              <p className="text-[11.5px] leading-snug text-slate-500">
                Les lignes signalées ne seront pas créées. Un service de repli en
                règle une partie ; un homonyme se tranche à la main, en cherchant
                la personne dans l&apos;annuaire et en lui donnant son rôle.
              </p>
            )}

            {rapport.simulation && (
              <button
                type="button"
                onClick={() => setRapport(null)}
                className="text-[12px] font-medium text-cyan-700 underline-offset-2 hover:underline"
              >
                ← Changer le service de repli
              </button>
            )}
          </>
        )}

        {busy && (
          <p className="flex items-center justify-center gap-2 py-2 text-[12.5px] text-slate-500">
            <Loader2 size={15} className="animate-spin" />
            {rapport === null ? "Calcul en cours…" : "Création en cours…"}
          </p>
        )}

        {rapport === null && !busy && (
          <p className="flex items-center gap-1.5 text-[11.5px] text-slate-400">
            <PlayCircle size={13} />
            Étape 1 sur 2 : prévisualiser, puis confirmer.
          </p>
        )}
      </div>
    </Modal>
  );
}
