"use client";

import { useEffect, useMemo, useState } from "react";
import { BookMarked, Loader2, PackagePlus, Save, Wand2 } from "lucide-react";
import { useAccess } from "@/lib/auth/AccessProvider";
import { ACCESS } from "@/lib/access";
import {
  creerArticle, creerGroupe, getArticle, modifierArticle,
} from "@/services/inv/articles";
import { getFamilles, getLocalisations, getSousFamilles } from "@/services/inv/reference";
import type { ReferenceFeed, Lookup, LocalisationOption } from "@/types/inv/reference";

/**
 * Create or edit an article.
 *
 * ONE component for both, because they are the same form — the legacy had
 * `nmob.php` and `upmob.php` as separate files that drifted apart (the edit
 * screen gained a "présence" field the create screen never got).
 *
 * BATCH MODE is the create form plus a count. Ten identical chairs arrive
 * together and entering them one at a time is how a register falls behind;
 * each still gets its own row and its own number, only the typing is shared.
 *
 * LES DEUX VOIES DE NUMÉROTATION (legacy `mobilier.id_reg`) sont ici un
 * choix explicite, parce qu'elles décident QUI attribue le numéro :
 *
 *   PHYSIQUE — le compteur attribue, le champ est en lecture seule. C'est ce
 *     refus du choix qui garantit l'unicité. Un second champ, libre, note le
 *     renvoi vers l'ancien cahier papier (le « NUMEROS-REGISTRE » du legacy).
 *   REGISTRE — on TRANSCRIT un numéro déjà inscrit au registre officiel, donc
 *     on le saisit. Le code du service est pré-rempli comme le faisait
 *     `setcod()`, et le serveur refuse un numéro déjà pris.
 *
 * La voie registre n'apparaît qu'avec le droit correspondant : la proposer à
 * qui ne l'a pas donnerait un formulaire qui échoue à l'envoi.
 *
 * The three-level catalogue cascades: choosing a category narrows the
 * families, choosing a family narrows the sub-families. Picking a sub-family
 * fills the designation, exactly as the legacy's `setlib()` did — it is what
 * keeps 2 930 designations consistent instead of free text.
 */
export default function ArticleFormModal({
  mode, id, ref: reference, onClose, onSaved,
}: {
  mode: "creer" | "modifier" | "groupe" | null;
  id?: number | null;
  ref: ReferenceFeed | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const { can } = useAccess();
  const peutRegistre = can(ACCESS.ARTICLES_CREER_REGISTRE);
  /** La voie choisie. Sans le droit, la question ne se pose pas. */
  const [voie, setVoie] = useState<"physique" | "registre">("physique");
  const [f, setF] = useState<Record<string, unknown>>({});
  const [familles, setFamilles] = useState<Lookup[]>([]);
  const [sousFamilles, setSousFamilles] = useState<Lookup[]>([]);
  const [locs, setLocs] = useState<LocalisationOption[]>([]);
  const [nombre, setNombre] = useState(2);
  const [busy, setBusy] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!mode) return;
    setErreur(null); setBusy(false); setNombre(2); setVoie("physique");
    void getLocalisations().then(setLocs).catch(() => setLocs([]));
    if (mode === "modifier" && id) {
      setChargement(true);
      getArticle(id)
        .then((a) => {
          setF({
            designation: a.designation, id_categorie: a.id_categorie,
            id_famille: a.id_famille, id_sous_famille: a.id_sous_famille,
            id_localisation: a.id_localisation, id_etat: a.id_etat,
            id_statut: a.id_statut, id_presence: a.id_presence,
            marque: a.marque, modele: a.modele, num_serie: a.num_serie,
            valeur: a.valeur, date_inventaire: a.date_inventaire,
            date_mise_service: a.date_mise_service, num_facture: a.num_facture,
            type_observation: a.type_observation, observation: a.observation,
          });
        })
        .catch((e: unknown) =>
          setErreur(e instanceof Error ? e.message : "Chargement impossible."))
        .finally(() => setChargement(false));
    } else {
      setF({});
    }
  }, [mode, id]);

  // Cascades. Each depends only on the level above it, so changing a category
  // clears what is now meaningless rather than leaving a stale family behind.
  useEffect(() => {
    const c = f.id_categorie as number | undefined;
    if (!c) { setFamilles([]); return; }
    void getFamilles(Number(c)).then(setFamilles).catch(() => setFamilles([]));
  }, [f.id_categorie]);

  useEffect(() => {
    const fa = f.id_famille as number | undefined;
    if (!fa) { setSousFamilles([]); return; }
    void getSousFamilles(Number(fa)).then(setSousFamilles).catch(() => setSousFamilles([]));
  }, [f.id_famille]);

  /**
   * Le préfixe que `setcod()` posait : le code du service de la localisation
   * choisie. Pré-rempli et non imposé — un numéro venu du registre papier peut
   * porter le code d'un service que le bien a depuis quitté, et le serveur ne
   * contrôle que la forme et l'unicité.
   */
  const codeService = useMemo(() => {
    const idLoc = Number(f.id_localisation ?? 0);
    if (!idLoc) return null;
    const idSvc = locs.find((l) => l.id_localisation === idLoc)?.id_service;
    if (!idSvc) return null;
    return (reference?.services ?? []).find((s) => s.id_service === idSvc)?.cod_service ?? null;
  }, [f.id_localisation, locs, reference]);

  // Changer de localisation en voie registre re-pose le préfixe, tant que
  // l'utilisateur n'a pas commencé à écrire la séquence derrière.
  useEffect(() => {
    if (voie !== "registre" || !codeService) return;
    const actuel = String(f.num_inventaire ?? "");
    if (actuel === "" || /^[0-9A-Za-z]{1,4}-?$/.test(actuel)) {
      set("num_inventaire", codeService + "-");
    }
  }, [voie, codeService]); // eslint-disable-line react-hooks/exhaustive-deps

  const titre = useMemo(() => {
    if (mode === "modifier") return "Modifier l'article";
    if (mode === "groupe") return "Nouveau groupe d'articles";
    return "Nouvel article";
  }, [mode]);

  if (!mode) return null;

  async function enregistrer() {
    setBusy(true); setErreur(null);
    try {
      const body: Record<string, unknown> = { ...f };
      // Empty strings would be written as "" rather than NULL.
      for (const k of Object.keys(body)) if (body[k] === "") delete body[k];

      if (mode !== "modifier") {
        // La voie est portée par `est_registre` et RIEN d'autre : c'est elle
        // que le serveur lit pour décider s'il attribue ou s'il accepte une
        // saisie, et c'est sur elle qu'il exige le droit.
        body.est_registre = voie === "registre" ? 1 : 0;
        if (voie !== "registre") delete body.num_inventaire;
      }

      if (mode === "modifier" && id) {
        const r = await modifierArticle(id, body);
        onSaved(
          r.modifie === 0
            ? "Aucune modification à enregistrer."
            : `${r.modifie} champ${r.modifie > 1 ? "s" : ""} modifié${r.modifie > 1 ? "s" : ""}.`,
        );
      } else if (mode === "groupe") {
        const r = await creerGroupe({ ...body, nombre });
        onSaved(
          `${r.crees.length} articles créés — ${r.crees[0].num_inventaire} à ${
            r.crees[r.crees.length - 1].num_inventaire
          }.`,
        );
      } else {
        const r = await creerArticle(body);
        onSaved(`Article créé sous le n° ${r.num_inventaire}.`);
      }
      onClose();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
      setBusy(false);
    }
  }

  // En voie registre le numéro doit être complet AVANT l'envoi : le préfixe
  // seul (« 109- ») est ce que le pré-remplissage laisse, pas une saisie.
  const numeroComplet =
    voie !== "registre" ||
    mode === "modifier" ||
    /^[0-9A-Za-z]{1,4}-[0-9]{1,6}$/.test(String(f.num_inventaire ?? ""));
  const valide =
    Boolean(f.designation) && Boolean(f.id_localisation) && numeroComplet;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header
          className="flex shrink-0 items-center gap-3 px-5 py-4 text-white"
          style={{ background: "var(--gradient-brand)" }}
        >
          <PackagePlus size={20} />
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold">{titre}</h2>
            <p className="text-[11.5px] text-white/70">
              {mode === "modifier"
                ? "Chaque champ modifié est enregistré dans l'historique"
                : voie === "registre"
                  ? "Le numéro est transcrit depuis le registre officiel"
                  : "Le numéro d'inventaire est attribué automatiquement"}
            </p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {erreur && (
            <div role="alert" className="mb-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] text-red-800">
              {erreur}
            </div>
          )}
          {chargement && (
            <p className="py-10 text-center text-slate-400">
              <Loader2 size={20} className="mx-auto animate-spin" />
            </p>
          )}

          {/* ── LA VOIE ──────────────────────────────────────────────────
              Placée en tête et non parmi les champs : elle ne décrit pas le
              bien, elle décide de la façon dont il entre au registre, et cela
              change le formulaire en dessous. */}
          {!chargement && mode !== "modifier" && peutRegistre && (
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              <VoieBouton
                actif={voie === "physique"}
                onClick={() => { setVoie("physique"); set("num_inventaire", ""); }}
                icone={<Wand2 size={15} />}
                titre="Physique"
                detail="Le numéro est attribué par le compteur"
              />
              <VoieBouton
                actif={voie === "registre"}
                onClick={() => setVoie("registre")}
                icone={<BookMarked size={15} />}
                titre="Registre"
                detail="Le numéro est saisi, tel qu'il figure au registre"
              />
            </div>
          )}

          {!chargement && (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* ── LE NUMÉRO ──────────────────────────────────────────────
                  Deux champs qui ne se confondent pas : celui du haut est le
                  NUMÉRO D'INVENTAIRE (attribué ou saisi selon la voie), celui
                  du bas le renvoi libre vers l'ancien cahier papier. Le legacy
                  les tenait tous deux dans `num_art` / `num_art_r` sans
                  jamais le dire nulle part à l'écran. */}
              {mode !== "modifier" && (
                <>
                  <Champ label="N° d'inventaire" obligatoire={voie === "registre"}>
                    <input
                      value={
                        voie === "registre"
                          ? String(f.num_inventaire ?? "")
                          : ""
                      }
                      onChange={(e) => set("num_inventaire", e.target.value.toUpperCase())}
                      disabled={voie !== "registre"}
                      placeholder={
                        voie === "registre"
                          ? (codeService ? `${codeService}-001467` : "109-001467")
                          : "attribué à l'enregistrement"
                      }
                      className={input}
                    />
                    {voie === "registre" && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        {mode === "groupe"
                          ? `Premier numéro du lot — les ${nombre} suivants se suivent.`
                          : "Code du service, un tiret, puis la séquence."}
                      </p>
                    )}
                  </Champ>

                  {voie === "physique" && (
                    <Champ label="N° au registre papier">
                      <input
                        value={String(f.num_registre ?? "")}
                        onChange={(e) => set("num_registre", e.target.value)}
                        placeholder="renvoi libre — ex. cahier 3, p. 42"
                        className={input}
                      />
                    </Champ>
                  )}
                </>
              )}

              {mode === "groupe" && (
                <Champ label="Nombre d'articles identiques" obligatoire>
                  <input
                    type="number" min={1} max={200} value={nombre}
                    onChange={(e) => setNombre(Number(e.target.value))}
                    className={input}
                  />
                </Champ>
              )}

              <Champ label="Localisation" obligatoire>
                <select
                  value={String(f.id_localisation ?? "")}
                  onChange={(e) => set("id_localisation", Number(e.target.value) || null)}
                  className={input}
                >
                  <option value="">— choisir —</option>
                  {locs.map((l) => (
                    <option key={l.id_localisation} value={l.id_localisation}>
                      {l.libelle}
                    </option>
                  ))}
                </select>
              </Champ>

              <Champ label="Catégorie">
                <select
                  value={String(f.id_categorie ?? "")}
                  onChange={(e) => {
                    set("id_categorie", Number(e.target.value) || null);
                    set("id_famille", null);
                    set("id_sous_famille", null);
                  }}
                  className={input}
                >
                  <option value="">—</option>
                  {(reference?.categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.libelle}</option>
                  ))}
                </select>
              </Champ>

              <Champ label="Famille">
                <select
                  value={String(f.id_famille ?? "")}
                  onChange={(e) => {
                    set("id_famille", Number(e.target.value) || null);
                    set("id_sous_famille", null);
                  }}
                  disabled={familles.length === 0}
                  className={input}
                >
                  <option value="">—</option>
                  {familles.map((c) => (
                    <option key={c.id} value={c.id}>{c.libelle}</option>
                  ))}
                </select>
              </Champ>

              <Champ label="Sous-famille">
                <select
                  value={String(f.id_sous_famille ?? "")}
                  onChange={(e) => {
                    const v = Number(e.target.value) || null;
                    set("id_sous_famille", v);
                    // Fills the designation from the sub-family, as the legacy
                    // setlib() did — that is what keeps designations uniform.
                    const lib = sousFamilles.find((s) => s.id === v)?.libelle;
                    if (lib && !f.designation) set("designation", lib);
                  }}
                  disabled={sousFamilles.length === 0}
                  className={input}
                >
                  <option value="">—</option>
                  {sousFamilles.map((c) => (
                    <option key={c.id} value={c.id}>{c.libelle}</option>
                  ))}
                </select>
              </Champ>

              <Champ label="Désignation" obligatoire pleineLargeur>
                <input
                  value={String(f.designation ?? "")}
                  onChange={(e) => set("designation", e.target.value)}
                  className={input}
                  placeholder="Ex. ARMOIRE VITREE 04 PORTES"
                />
              </Champ>

              <Champ label="État (condition)">
                <select
                  value={String(f.id_etat ?? "")}
                  onChange={(e) => set("id_etat", Number(e.target.value) || null)}
                  className={input}
                >
                  <option value="">—</option>
                  {(reference?.etats ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.libelle}</option>
                  ))}
                </select>
              </Champ>

              <Champ label="Présence physique">
                <select
                  value={String(f.id_presence ?? "")}
                  onChange={(e) => set("id_presence", Number(e.target.value) || null)}
                  className={input}
                >
                  <option value="">—</option>
                  {(reference?.presences ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.libelle}</option>
                  ))}
                </select>
              </Champ>

              <Champ label="Marque">
                <input value={String(f.marque ?? "")} onChange={(e) => set("marque", e.target.value)} className={input} />
              </Champ>
              <Champ label="Modèle">
                <input value={String(f.modele ?? "")} onChange={(e) => set("modele", e.target.value)} className={input} />
              </Champ>
              <Champ label="N° de série">
                <input value={String(f.num_serie ?? "")} onChange={(e) => set("num_serie", e.target.value)} className={input} />
              </Champ>
              <Champ label="Valeur (DA)">
                <input
                  type="number" step="0.01" min="0"
                  value={String(f.valeur ?? "")}
                  onChange={(e) => set("valeur", e.target.value)}
                  className={input}
                />
              </Champ>
              <Champ label="Date d'inventaire">
                <input
                  type="date"
                  value={String(f.date_inventaire ?? "").slice(0, 10)}
                  onChange={(e) => set("date_inventaire", e.target.value)}
                  className={input}
                />
              </Champ>
              <Champ label="Mise en service">
                <input
                  type="date"
                  value={String(f.date_mise_service ?? "").slice(0, 10)}
                  onChange={(e) => set("date_mise_service", e.target.value)}
                  className={input}
                />
              </Champ>

              <Champ label="Type d'observation">
                <select
                  value={String(f.type_observation ?? "")}
                  onChange={(e) => set("type_observation", e.target.value || null)}
                  className={input}
                >
                  <option value="">—</option>
                  <option value="don">Don</option>
                  <option value="personnel">Personnel</option>
                  <option value="non_disponible">Non disponible</option>
                  <option value="autre">Autre</option>
                </select>
              </Champ>
              <Champ label="Observation">
                <input
                  value={String(f.observation ?? "")}
                  onChange={(e) => set("observation", e.target.value)}
                  className={input}
                />
              </Champ>
            </div>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <span className="text-[11.5px] text-slate-500">
            {valide
              ? ""
              : !numeroComplet
                ? "Complétez le numéro d'inventaire (ex. 109-001467)."
                : "Désignation et localisation sont obligatoires."}
          </span>
          <div className="flex gap-2">
            <button
              type="button" onClick={onClose} disabled={busy}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={busy || !valide || chargement}
              onClick={() => void enregistrer()}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "var(--gradient-brand)" }}
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {mode === "groupe" ? `Créer ${nombre} articles` : "Enregistrer"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

const input =
  "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:bg-slate-50 disabled:text-slate-400";

/** Un des deux boutons de voie — une carte cliquable, pas une case à cocher. */
function VoieBouton({
  actif, onClick, icone, titre, detail,
}: {
  actif: boolean; onClick: () => void; icone: React.ReactNode;
  titre: string; detail: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={
        "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors " +
        (actif
          ? "border-cyan-500 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-500/20"
          : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50")
      }
    >
      <span className={actif ? "mt-0.5 text-cyan-600" : "mt-0.5 text-slate-400"}>{icone}</span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold">{titre}</span>
        <span className="block text-[11px] leading-snug opacity-80">{detail}</span>
      </span>
    </button>
  );
}

function Champ({
  label, children, obligatoire, pleineLargeur,
}: {
  label: string; children: React.ReactNode; obligatoire?: boolean; pleineLargeur?: boolean;
}) {
  return (
    <div className={pleineLargeur ? "sm:col-span-2" : undefined}>
      <label className="mb-1 block text-[11.5px] font-medium text-slate-600">
        {label}
        {obligatoire && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
