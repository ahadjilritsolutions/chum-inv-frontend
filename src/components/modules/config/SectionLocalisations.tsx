"use client";

import { useCallback, useEffect, useState } from "react";
import { DoorOpen, Pencil, Trash2 } from "lucide-react";
import ListToolbar from "@/components/ui/ListToolbar";
import DataTable, { Td } from "@/components/ui/DataTable";
import IconAction from "@/components/ui/IconAction";
import Modal from "@/components/ui/Modal";
import { Banner, Field, FormActions, Select, TextInput } from "@/components/ui/Form";
import { useAccess } from "@/lib/auth/AccessProvider";
import { ACCESS } from "@/lib/access";
import {
  creerLocalisation, listLocalisationsConfig, modifierLocalisation,
  supprimerLocalisation, type LocalisationRow,
} from "@/services/inv/localisations";
import { getReference } from "@/services/inv/reference";
import type { ReferenceFeed } from "@/types/inv/reference";

/**
 * CONFIGURATION ▸ LOCALISATIONS — les lieux où les biens se tiennent.
 *
 * ── LES SERVICES NE SE MODIFIENT PAS ICI ────────────────────────────────────
 * Une localisation APPARTIENT à un service, mais le service vient de
 * `santeplus`, l'annuaire commun à la DEP, au LIS, au magasin et à
 * l'inventaire. Cette application le LIT et ne l'écrit jamais : renommer un
 * service depuis l'inventaire le renommerait pour tout l'hôpital, et en créer
 * un ici en fabriquerait un que l'annuaire ne connaît pas.
 *
 * On choisit donc le service dans une liste, et c'est tout. Aucun bouton
 * « nouveau service » n'existe sur cet écran, et le serveur n'a aucune route
 * pour en écrire un.
 *
 * ── SUPPRIMER OU DÉSACTIVER ─────────────────────────────────────────────────
 * La suppression n'aboutit que si RIEN ne s'y rattache : ni article (même
 * supprimé), ni mouvement (transfert ou réforme), ni document. Les compteurs
 * sont affichés sur chaque ligne et l'icône est désactivée d'avance, pour qu'on
 * le sache avant de cliquer plutôt que de recevoir un refus.
 *
 * Pour tout le reste il y a « inactif » : le local sort des listes déroulantes
 * sans effacer l'histoire des biens qui y ont séjourné.
 */
export default function SectionLocalisations() {
  const { can } = useAccess();

  const [lignes, setLignes] = useState<LocalisationRow[]>([]);
  const [ref, setRef] = useState<ReferenceFeed | null>(null);
  const [recherche, setRecherche] = useState("");
  const [service, setService] = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [form, setForm] = useState<{ ligne: LocalisationRow | null } | null>(null);

  useEffect(() => { void getReference().then(setRef).catch(() => setRef(null)); }, []);

  const charger = useCallback(async () => {
    setChargement(true); setErreur(null);
    try {
      const d = await listLocalisationsConfig({
        q: recherche || undefined,
        service: service ? Number(service) : undefined,
      });
      setLignes(d.localisations);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setChargement(false);
    }
  }, [recherche, service]);

  useEffect(() => { void charger(); }, [charger]);

  async function supprimer(l: LocalisationRow) {
    if (!window.confirm(`Supprimer définitivement « ${l.libelle} » ?`)) return;
    setErreur(null); setInfo(null);
    try {
      await supprimerLocalisation(l.id_localisation);
      setInfo(`« ${l.libelle} » supprimée.`);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Suppression impossible.");
    }
  }

  const nomService = (id: number) =>
    ref?.services.find((s) => s.id_service === id)?.lib_service ?? `Service ${id}`;

  return (
    <div className="space-y-4">
      {erreur && <Banner type="error">{erreur}</Banner>}
      {info && <Banner type="ok">{info}</Banner>}

      <ListToolbar
        recherche={recherche}
        onRecherche={setRecherche}
        placeholder="Libellé, code ou description…"
        total={lignes.length}
        onAdd={
          can(ACCESS.CONFIG_STRUCTURE_CREER)
            ? () => setForm({ ligne: null })
            : undefined
        }
        addLabel="Nouvelle localisation"
        filters={
          <Select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-auto min-w-[180px]"
          >
            <option value="">Tous les services</option>
            {(ref?.services ?? []).map((s) => (
              <option key={s.id_service} value={s.id_service}>{s.lib_service}</option>
            ))}
          </Select>
        }
      />

      <DataTable
        colonnes={[
          { titre: "Localisation" },
          { titre: "Code" },
          { titre: "Service" },
          { titre: "Type" },
          { titre: "Articles" },
          { titre: "État" },
          { titre: "Actions", className: "text-right" },
        ]}
        lignes={lignes}
        cle={(l) => l.id_localisation}
        chargement={chargement}
        messageVide="Aucune localisation."
        largeurMin={1040}
        rendu={(l) => {
          // Ce qui interdit la suppression, calculé par le serveur.
          const rattachements =
            l.nb_articles + l.nb_mouvements + l.nb_documents;
          return (
            <>
              <Td className="font-medium text-slate-800">
                {l.libelle}
                {l.description && (
                  <span className="block text-[11px] font-normal text-slate-400">
                    {l.description}
                  </span>
                )}
              </Td>
              <Td className="font-mono text-[12px] text-slate-500">{l.code ?? "—"}</Td>
              <Td className="text-slate-600">{nomService(l.id_service)}</Td>
              <Td className="text-slate-500">{l.type_localisation ?? "—"}</Td>
              <Td className="text-slate-600">{l.nb_articles}</Td>
              <Td>
                <span
                  className={
                    "rounded-md px-2 py-0.5 text-[11px] font-semibold " +
                    (l.actif ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")
                  }
                >
                  {l.actif ? "Active" : "Inactive"}
                </span>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-1.5">
                  {can(ACCESS.CONFIG_STRUCTURE_MODIFIER) && (
                    <IconAction
                      title="Modifier"
                      tone="edit"
                      onClick={() => setForm({ ligne: l })}
                    >
                      <Pencil size={14} />
                    </IconAction>
                  )}
                  {can(ACCESS.CONFIG_STRUCTURE_RETIRER) && (
                    <IconAction
                      title={
                        rattachements > 0
                          ? `Suppression impossible : ${l.nb_articles} article(s), ` +
                            `${l.nb_mouvements} mouvement(s), ${l.nb_documents} document(s) s'y rattachent — ` +
                            "rendez-la inactive à la place"
                          : "Supprimer"
                      }
                      tone="danger"
                      disabled={rattachements > 0}
                      onClick={() => void supprimer(l)}
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

      <FormLocalisation
        etat={form}
        ref_={ref}
        onClose={() => setForm(null)}
        onSaved={(m) => { setInfo(m); void charger(); }}
      />
    </div>
  );
}

function FormLocalisation({
  etat, ref_, onClose, onSaved,
}: {
  etat: { ligne: LocalisationRow | null } | null;
  ref_: ReferenceFeed | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [f, setF] = useState<Record<string, string>>({});
  const [actif, setActif] = useState(1);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!etat) return;
    const l = etat.ligne;
    setF({
      libelle: l?.libelle ?? "",
      code: l?.code ?? "",
      description: l?.description ?? "",
      numero: l?.numero ?? "",
      etage: l?.etage ?? "",
      id_service: l ? String(l.id_service) : "",
      id_type_localisation: l?.id_type_localisation ? String(l.id_type_localisation) : "",
    });
    setActif(l?.actif ?? 1);
    setErreur(null); setBusy(false);
  }, [etat]);

  if (!etat) return null;
  const e = etat;

  async function valider() {
    setBusy(true); setErreur(null);
    try {
      const body = {
        libelle: f.libelle.trim(),
        code: f.code?.trim() || null,
        description: f.description?.trim() || null,
        numero: f.numero?.trim() || null,
        etage: f.etage?.trim() || null,
        id_service: Number(f.id_service),
        id_type_localisation: f.id_type_localisation ? Number(f.id_type_localisation) : null,
        actif,
      };
      if (e.ligne) {
        await modifierLocalisation(e.ligne.id_localisation, body);
        onSaved(`« ${body.libelle} » modifiée.`);
      } else {
        await creerLocalisation(body);
        onSaved(`« ${body.libelle} » créée.`);
      }
      onClose();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Enregistrement impossible.");
      setBusy(false);
    }
  }

  const valide = Boolean(f.libelle?.trim()) && Boolean(f.id_service);
  // Capturé dans une const : TypeScript ne retient pas le rétrécissement de
  // `e.ligne` jusque dans le JSX plus bas.
  const ligne = e.ligne;
  const changeDeService =
    ligne !== null && f.id_service !== "" && Number(f.id_service) !== ligne.id_service;

  return (
    <Modal
      open onClose={onClose}
      title={e.ligne ? "Modifier la localisation" : "Nouvelle localisation"}
      icon={<DoorOpen size={18} />}
      width={620}
      footer={
        <FormActions
          onCancel={onClose}
          onSubmit={() => void valider()}
          submitLabel="Enregistrer"
          submitting={busy}
          disabled={!valide}
        />
      }
    >
      <div className="space-y-4 p-5">
        {erreur && <Banner type="error">{erreur}</Banner>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Libellé" required>
            <TextInput
              value={f.libelle ?? ""}
              onChange={(ev) => set("libelle", ev.target.value)}
              placeholder="Ex. BUR-ECONOME"
            />
          </Field>

          <Field label="Code" hint="Facultatif">
            <TextInput value={f.code ?? ""} onChange={(ev) => set("code", ev.target.value)} />
          </Field>

          <Field
            label="Service"
            required
            hint="Choisi dans l'annuaire — non modifiable depuis l'inventaire"
          >
            <Select
              value={f.id_service ?? ""}
              onChange={(ev) => set("id_service", ev.target.value)}
            >
              <option value="">— choisir —</option>
              {(ref_?.services ?? []).map((s) => (
                <option key={s.id_service} value={s.id_service}>{s.lib_service}</option>
              ))}
            </Select>
          </Field>

          <Field label="Type de local">
            <Select
              value={f.id_type_localisation ?? ""}
              onChange={(ev) => set("id_type_localisation", ev.target.value)}
            >
              <option value="">—</option>
              {(ref_?.types_localisation ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.libelle}</option>
              ))}
            </Select>
          </Field>

          <Field label="Numéro">
            <TextInput value={f.numero ?? ""} onChange={(ev) => set("numero", ev.target.value)} />
          </Field>

          <Field label="Étage">
            <TextInput value={f.etage ?? ""} onChange={(ev) => set("etage", ev.target.value)} />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Description">
              <TextInput
                value={f.description ?? ""}
                onChange={(ev) => set("description", ev.target.value)}
                placeholder="Ex. 2ᵉ étage, aile nord"
              />
            </Field>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
          <input
            type="checkbox"
            checked={actif === 1}
            onChange={(ev) => setActif(ev.target.checked ? 1 : 0)}
            className="h-4 w-4 rounded border-slate-300 accent-cyan-600"
          />
          Localisation active
        </label>

        {/* Changer le service d'un local DÉPLACE tous les biens qui s'y
            trouvent, puisque leur service se lit à travers lui. Il faut le dire
            avant, pas le découvrir après. */}
        {changeDeService && ligne !== null && ligne.nb_articles > 0 && (
          <Banner type="error">
            Changer le service rattachera les {ligne.nb_articles} article(s) de
            ce local au nouveau service — leur service se lit à travers leur
            localisation.
          </Banner>
        )}

        {actif === 0 && (
          <Banner type="ok">
            Une localisation inactive disparaît des listes, mais les articles
            qu&apos;elle contient y restent et gardent leur histoire.
          </Banner>
        )}
      </div>
    </Modal>
  );
}
