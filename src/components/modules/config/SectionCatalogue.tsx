"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import IconAction from "@/components/ui/IconAction";
import { Banner, Field, FormActions, TextInput } from "@/components/ui/Form";
import { useAccess } from "@/lib/auth/AccessProvider";
import { ACCESS } from "@/lib/access";
import {
  creerNiveau, listNiveau, modifierNiveau, supprimerNiveau,
  type LigneCatalogue, type Niveau,
} from "@/services/inv/catalogue";
import { cn } from "@/lib/utils";

/**
 * CONFIGURATION ▸ CATALOGUE — catégorie ▸ famille ▸ sous-famille.
 *
 * ── TROIS COLONNES, PAS TROIS ÉCRANS ────────────────────────────────────────
 * Le legacy avait trois dossiers PHP (`categorie/`, `famille/`, `sfamille/`) et
 * il fallait naviguer de l'un à l'autre en se souvenant d'où l'on venait. Ici
 * les trois niveaux sont côte à côte : cliquer une catégorie remplit la colonne
 * des familles, cliquer une famille remplit celle des sous-familles. On voit le
 * chemin complet en permanence, ce qui est exactement ce dont on a besoin pour
 * ranger quelque chose au bon endroit.
 *
 * ── POURQUOI CE CATALOGUE COMPTE ────────────────────────────────────────────
 * Choisir une sous-famille REMPLIT la désignation de l'article (le `setlib()`
 * du legacy). C'est ce qui fait que 2 930 articles partagent un vocabulaire au
 * lieu d'avoir 2 930 façons d'écrire « armoire ». Abîmer le catalogue, c'est
 * abîmer la possibilité même de compter ce qu'on possède.
 *
 * ── DÉSACTIVER PLUTÔT QUE SUPPRIMER ─────────────────────────────────────────
 * La suppression n'aboutit que si RIEN ne s'y rattache — le serveur refuse et
 * dit quoi. Le compteur d'articles est affiché sur chaque ligne pour qu'on le
 * sache AVANT de cliquer, plutôt que de découvrir le refus après coup.
 */

const NIVEAUX: ReadonlyArray<{ cle: Niveau; titre: string; singulier: string }> = [
  { cle: "categorie", titre: "Catégories", singulier: "catégorie" },
  { cle: "famille", titre: "Familles", singulier: "famille" },
  { cle: "sous_famille", titre: "Sous-familles", singulier: "sous-famille" },
];

export default function SectionCatalogue() {
  const { can } = useAccess();

  const [lignes, setLignes] = useState<Record<Niveau, LigneCatalogue[]>>({
    categorie: [], famille: [], sous_famille: [],
  });
  const [choix, setChoix] = useState<{ categorie: number | null; famille: number | null }>({
    categorie: null, famille: null,
  });
  const [chargement, setChargement] = useState<Niveau | null>("categorie");
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [form, setForm] = useState<{
    niveau: Niveau; ligne: LigneCatalogue | null; id_parent: number | null;
  } | null>(null);

  const charger = useCallback(async (niveau: Niveau, parent?: number | null) => {
    setChargement(niveau);
    try {
      const d = await listNiveau(niveau, { parent: parent ?? undefined });
      setLignes((p) => ({ ...p, [niveau]: d.lignes }));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setChargement(null);
    }
  }, []);

  useEffect(() => { void charger("categorie"); }, [charger]);

  // Chaque niveau ne se recharge que quand SON parent change — sinon changer de
  // famille rechargerait inutilement la liste des catégories.
  useEffect(() => {
    if (choix.categorie === null) { setLignes((p) => ({ ...p, famille: [] })); return; }
    void charger("famille", choix.categorie);
  }, [choix.categorie, charger]);

  useEffect(() => {
    if (choix.famille === null) { setLignes((p) => ({ ...p, sous_famille: [] })); return; }
    void charger("sous_famille", choix.famille);
  }, [choix.famille, charger]);

  async function supprimer(niveau: Niveau, l: LigneCatalogue) {
    if (!window.confirm(`Supprimer « ${l.libelle} » ? Cette action est définitive.`)) return;
    setErreur(null); setInfo(null);
    try {
      await supprimerNiveau(niveau, l.id);
      setInfo(`« ${l.libelle} » supprimé.`);
      await charger(
        niveau,
        niveau === "famille" ? choix.categorie : niveau === "sous_famille" ? choix.famille : null,
      );
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Suppression impossible.");
    }
  }

  /** Le parent qu'une création doit porter, selon le niveau. */
  const parentDe = (niveau: Niveau) =>
    niveau === "famille" ? choix.categorie : niveau === "sous_famille" ? choix.famille : null;

  /** Un niveau n'est ouvert à la création que si son parent est choisi. */
  const ouvert = (niveau: Niveau) =>
    niveau === "categorie" ||
    (niveau === "famille" && choix.categorie !== null) ||
    (niveau === "sous_famille" && choix.famille !== null);

  return (
    <div className="space-y-4">
      {erreur && <Banner type="error">{erreur}</Banner>}
      {info && <Banner type="ok">{info}</Banner>}

      <div className="grid gap-3 lg:grid-cols-3">
        {NIVEAUX.map(({ cle, titre, singulier }) => {
          const selection =
            cle === "categorie" ? choix.categorie : cle === "famille" ? choix.famille : null;

          return (
            <section key={cle} className="flex min-h-[420px] flex-col rounded-2xl bg-white shadow-sm">
              <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                <div className="min-w-0">
                  <h3 className="text-[13.5px] font-semibold text-slate-800">{titre}</h3>
                  <p className="text-[11px] text-slate-400">
                    {ouvert(cle)
                      ? `${lignes[cle].length} entrée${lignes[cle].length > 1 ? "s" : ""}`
                      : cle === "famille"
                        ? "choisissez une catégorie"
                        : "choisissez une famille"}
                  </p>
                </div>
                {can(ACCESS.CONFIG_CATALOGUE_CREER) && ouvert(cle) && (
                  <button
                    type="button"
                    onClick={() => setForm({ niveau: cle, ligne: null, id_parent: parentDe(cle) })}
                    title={`Nouvelle ${singulier}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-cyan-600 px-2.5 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-cyan-700"
                  >
                    <Plus size={13} />
                    Ajouter
                  </button>
                )}
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {chargement === cle && (
                  <p className="py-8 text-center text-[12.5px] text-slate-400">Chargement…</p>
                )}
                {chargement !== cle && !ouvert(cle) && (
                  <p className="py-8 text-center text-[12.5px] italic text-slate-400">
                    {cle === "famille"
                      ? "Sélectionnez une catégorie à gauche."
                      : "Sélectionnez une famille au centre."}
                  </p>
                )}
                {chargement !== cle && ouvert(cle) && lignes[cle].length === 0 && (
                  <p className="py-8 text-center text-[12.5px] italic text-slate-400">
                    Aucune entrée.
                  </p>
                )}

                <ul className="space-y-0.5">
                  {lignes[cle].map((l) => {
                    const actif = selection === l.id;
                    const cliquable = cle !== "sous_famille";
                    return (
                      <li key={l.id}>
                        <div
                          className={cn(
                            "group flex items-center gap-1.5 rounded-lg px-2.5 py-2 transition-colors",
                            actif ? "bg-cyan-50 ring-1 ring-cyan-200" : "hover:bg-slate-50",
                          )}
                        >
                          <button
                            type="button"
                            disabled={!cliquable}
                            onClick={() =>
                              cle === "categorie"
                                ? setChoix({ categorie: l.id, famille: null })
                                : setChoix((p) => ({ ...p, famille: l.id }))
                            }
                            className={cn(
                              "flex min-w-0 flex-1 items-center gap-1.5 text-left",
                              cliquable ? "cursor-pointer" : "cursor-default",
                            )}
                          >
                            <span className="min-w-0">
                              <span
                                className={cn(
                                  "block truncate text-[12.5px]",
                                  actif ? "font-semibold text-cyan-900" : "text-slate-700",
                                  l.actif ? "" : "text-slate-400 line-through",
                                )}
                              >
                                {l.libelle}
                              </span>
                              {/* Les compteurs sont là pour qu'on sache AVANT de
                                  cliquer que la suppression sera refusée. */}
                              <span className="block text-[10.5px] text-slate-400">
                                {l.nb_articles} article{l.nb_articles > 1 ? "s" : ""}
                                {l.nb_enfants > 0 && ` · ${l.nb_enfants} sous-niveau${l.nb_enfants > 1 ? "x" : ""}`}
                                {l.actif ? "" : " · inactif"}
                              </span>
                            </span>
                            {cliquable && (
                              <ChevronRight
                                size={13}
                                className={cn(
                                  "ml-auto shrink-0",
                                  actif ? "text-cyan-500" : "text-slate-300",
                                )}
                              />
                            )}
                          </button>

                          <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {can(ACCESS.CONFIG_CATALOGUE_MODIFIER) && (
                              <IconAction
                                title="Modifier"
                                tone="edit"
                                onClick={() => setForm({ niveau: cle, ligne: l, id_parent: l.id_parent })}
                              >
                                <Pencil size={13} />
                              </IconAction>
                            )}
                            {can(ACCESS.CONFIG_CATALOGUE_SUPPRIMER) && (
                              <IconAction
                                title={
                                  l.nb_articles > 0 || l.nb_enfants > 0
                                    ? "Suppression impossible : des éléments s'y rattachent"
                                    : "Supprimer"
                                }
                                tone="danger"
                                disabled={l.nb_articles > 0 || l.nb_enfants > 0}
                                onClick={() => void supprimer(cle, l)}
                              >
                                <Trash2 size={13} />
                              </IconAction>
                            )}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          );
        })}
      </div>

      <FormNiveau
        etat={form}
        onClose={() => setForm(null)}
        onSaved={(m, niveau) => {
          setInfo(m);
          void charger(niveau, parentDe(niveau));
        }}
      />
    </div>
  );
}

/** Créer ou renommer une entrée — les trois niveaux ont le même formulaire. */
function FormNiveau({
  etat, onClose, onSaved,
}: {
  etat: { niveau: Niveau; ligne: LigneCatalogue | null; id_parent: number | null } | null;
  onClose: () => void;
  onSaved: (message: string, niveau: Niveau) => void;
}) {
  const [libelle, setLibelle] = useState("");
  const [code, setCode] = useState("");
  const [actif, setActif] = useState(1);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!etat) return;
    setLibelle(etat.ligne?.libelle ?? "");
    setCode(etat.ligne?.code ?? "");
    setActif(etat.ligne?.actif ?? 1);
    setErreur(null); setBusy(false);
  }, [etat]);

  if (!etat) return null;
  const e = etat;
  const nom = NIVEAUX.find((n) => n.cle === e.niveau)!.singulier;

  async function valider() {
    setBusy(true); setErreur(null);
    try {
      const body = {
        libelle: libelle.trim(),
        code: code.trim() || null,
        actif,
        ...(e.id_parent !== null ? { id_parent: e.id_parent } : {}),
      };
      if (e.ligne) {
        await modifierNiveau(e.niveau, e.ligne.id, body);
        onSaved(`« ${body.libelle} » modifié.`, e.niveau);
      } else {
        await creerNiveau(e.niveau, body);
        onSaved(`« ${body.libelle} » créé.`, e.niveau);
      }
      onClose();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Enregistrement impossible.");
      setBusy(false);
    }
  }

  return (
    <Modal
      open onClose={onClose}
      title={e.ligne ? `Modifier la ${nom}` : `Nouvelle ${nom}`}
      width={480}
      footer={
        <FormActions
          onCancel={onClose}
          onSubmit={() => void valider()}
          submitLabel="Enregistrer"
          submitting={busy}
          disabled={!libelle.trim()}
        />
      }
    >
      <div className="space-y-4 p-5">
        {erreur && <Banner type="error">{erreur}</Banner>}

        <Field label="Libellé" required hint="Ce que liront les utilisateurs dans les listes">
          <TextInput
            value={libelle}
            onChange={(ev) => setLibelle(ev.target.value)}
            placeholder="Ex. MOBILIER-DE-BUREAU"
          />
        </Field>

        <Field label="Code" hint="Facultatif — repris du legacy pour les entrées migrées">
          <TextInput value={code} onChange={(ev) => setCode(ev.target.value)} />
        </Field>

        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
          <input
            type="checkbox"
            checked={actif === 1}
            onChange={(ev) => setActif(ev.target.checked ? 1 : 0)}
            className="h-4 w-4 rounded border-slate-300 accent-cyan-600"
          />
          Actif
        </label>

        {actif === 0 && (
          <Banner type="ok">
            Une entrée inactive disparaît des listes déroulantes, mais les
            articles déjà classés dessous gardent leur classement.
          </Banner>
        )}
      </div>
    </Modal>
  );
}
