"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration › Identité — the one screen that rebrands the installation.
//
// Everything it writes lands in `santeplus.sih_etablissement`, which DEP,
// Inventaire and Magasin all read: saving here re-letterheads all three.
//
// Written against lib/brand and plain Tailwind only — no app-specific UI
// primitives — so the SAME file is copied verbatim into each frontend. If you
// change it, change it in all three.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Check,
  ImagePlus,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  PRODUIT,
  logoSrc,
  resoudreEntete,
  saveBranding,
  useBranding,
  type Branding,
  type BrandingUpdate,
  type EnteteConfig,
} from "@/lib/brand";

const LOGO_MAX_BYTES = 2 * 1024 * 1024;

/** Switches, in the order they are drawn, with the label shown next to each. */
const INTERRUPTEURS: { key: keyof EnteteConfig; label: string; aide?: string }[] = [
  { key: "afficher_logo", label: "Logo" },
  {
    key: "afficher_republique",
    label: "République Algérienne Démocratique et Populaire",
    aide: "À décocher pour un établissement privé.",
  },
  { key: "afficher_nom", label: "Nom de l'établissement" },
  { key: "afficher_nom_ar", label: "Nom en arabe", aide: "Imprimé seulement s'il est renseigné." },
  { key: "afficher_slogan", label: "Slogan" },
  { key: "afficher_adresse", label: "Adresse" },
  { key: "afficher_telephone", label: "Téléphone" },
  { key: "afficher_email", label: "Email" },
  { key: "afficher_qr", label: "QR code" },
];

export default function IdentiteSection() {
  const branding = useBranding();

  // The form edits a draft; nothing reaches the server until "Enregistrer".
  // Re-seeded whenever the store publishes (first load, or another tab's
  // save), but not while there are unsaved edits — that would wipe them.
  const [draft, setDraft] = useState<Branding>(branding);
  const dirtyRef = useRef(false);
  useEffect(() => {
    if (!dirtyRef.current) setDraft(branding);
  }, [branding]);

  /** New logo chosen but not yet saved: a data-URL, or null for "remove",
   *  or undefined for "unchanged". Mirrors the API's own three states. */
  const [logoEdit, setLogoEdit] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enregistre, setEnregistre] = useState(false);

  function edit(patch: Partial<Branding>) {
    dirtyRef.current = true;
    setEnregistre(false);
    setDraft((d) => ({ ...d, ...patch }));
  }

  function editEntete(patch: Partial<EnteteConfig>) {
    dirtyRef.current = true;
    setEnregistre(false);
    setDraft((d) => ({ ...d, entete: { ...d.entete, ...patch } }));
  }

  function choisirLogo(file: File | undefined) {
    setErreur(null);
    if (!file) return;
    // Checked here as well as server-side so a 5 MB photo is refused before
    // it is base64-encoded and pushed over the wire.
    if (file.size > LOGO_MAX_BYTES) {
      setErreur("Le logo dépasse 2 Mo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      dirtyRef.current = true;
      setEnregistre(false);
      setLogoEdit(String(reader.result));
    };
    reader.onerror = () => setErreur("Lecture du fichier impossible.");
    reader.readAsDataURL(file);
  }

  async function enregistrer() {
    setSaving(true);
    setErreur(null);
    try {
      const patch: BrandingUpdate = {
        nom: draft.nom,
        nom_court: draft.nom_court,
        nom_ar: draft.nom_ar,
        slogan: draft.slogan,
        adresse: draft.adresse,
        commune: draft.commune,
        wilaya: draft.wilaya,
        telephone: draft.telephone,
        email: draft.email,
        site_web: draft.site_web,
        entete: draft.entete,
      };
      if (logoEdit !== undefined) patch.logo = logoEdit;

      await saveBranding(patch);
      dirtyRef.current = false;
      setLogoEdit(undefined);
      setEnregistre(true);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  function annuler() {
    dirtyRef.current = false;
    setDraft(branding);
    setLogoEdit(undefined);
    setErreur(null);
    setEnregistre(false);
  }

  const dirty = dirtyRef.current;
  // The preview must show the DRAFT's logo, not the saved one.
  const apercuLogo =
    logoEdit === undefined ? logoSrc(draft) : logoEdit === null ? logoSrc({ ...draft, logo_url: null }) : logoEdit;

  return (
    <div className="space-y-4">
      {draft.par_defaut && (
        <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[12.5px] text-amber-800">
          <AlertTriangle size={15} className="shrink-0 mt-px" />
          <span>
            Aucun établissement n&apos;est configuré : les documents portent l&apos;identité
            du produit ({PRODUIT.nom_court} — {PRODUIT.slogan}). Renseignez le nom et le
            logo ci-dessous.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-4">
        {/* ── Champs ──────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <Carte titre="Identité">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Champ
                label="Nom complet"
                aide="Imprimé en tête des documents."
                value={draft.nom}
                placeholder={PRODUIT.nom}
                onChange={(nom) => edit({ nom })}
              />
              <Champ
                label="Nom court"
                aide="Barre de navigation, tickets, onglet du navigateur."
                value={draft.nom_court}
                placeholder={PRODUIT.nom_court}
                onChange={(nom_court) => edit({ nom_court })}
              />
              <Champ
                label="Nom en arabe"
                value={draft.nom_ar ?? ""}
                rtl
                onChange={(v) => edit({ nom_ar: v || null })}
              />
              <Champ
                label="Slogan"
                value={draft.slogan ?? ""}
                placeholder={PRODUIT.slogan}
                onChange={(v) => edit({ slogan: v || null })}
              />
            </div>
          </Carte>

          <Carte titre="Coordonnées" aide="Imprimées sur les documents si les interrupteurs correspondants sont activés.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Champ label="Adresse" value={draft.adresse ?? ""} onChange={(v) => edit({ adresse: v || null })} />
              <Champ label="Commune" value={draft.commune ?? ""} onChange={(v) => edit({ commune: v || null })} />
              <Champ label="Wilaya" value={draft.wilaya ?? ""} onChange={(v) => edit({ wilaya: v || null })} />
              <Champ label="Téléphone" value={draft.telephone ?? ""} onChange={(v) => edit({ telephone: v || null })} />
              <Champ label="Email" value={draft.email ?? ""} onChange={(v) => edit({ email: v || null })} />
              <Champ label="Site web" value={draft.site_web ?? ""} onChange={(v) => edit({ site_web: v || null })} />
            </div>
          </Carte>

          <Carte titre="En-tête des documents">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
              {INTERRUPTEURS.map(({ key, label, aide }) => (
                <Interrupteur
                  key={key}
                  label={label}
                  aide={aide}
                  checked={draft.entete[key] as boolean}
                  onChange={(v) => editEntete({ [key]: v } as Partial<EnteteConfig>)}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
              <Champ
                label="Ville de la date"
                aide={`Ligne de date : « ${draft.entete.ville?.trim() || "Alger"} le : 14/10/2026 ».`}
                value={draft.entete.ville ?? ""}
                placeholder="Alger"
                onChange={(v) => editEntete({ ville: v || null })}
              />
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Alignement
                </span>
                <select
                  value={draft.entete.alignement}
                  onChange={(e) => editEntete({ alignement: e.target.value === "left" ? "left" : "center" })}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-[13px] outline-none focus:border-slate-400 transition-colors bg-white"
                >
                  <option value="center">Centré</option>
                  <option value="left">À gauche</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1 mt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Lignes libres
              </span>
              <textarea
                rows={2}
                value={draft.entete.texte ?? ""}
                placeholder="Une ligne par ligne imprimée"
                onChange={(e) => editEntete({ texte: e.target.value || null })}
                className="px-3 py-2 rounded-lg border border-slate-200 text-[13px] outline-none focus:border-slate-400 transition-colors resize-y"
              />
            </div>
          </Carte>
        </div>

        {/* ── Logo + aperçu ───────────────────────────────────────────── */}
        <div className="space-y-4">
          <Carte titre="Logo">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 shrink-0 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={apercuLogo} alt="" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                  <ImagePlus size={13} />
                  Choisir un fichier
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => choisirLogo(e.target.files?.[0])}
                  />
                </label>
                {(draft.logo_url || logoEdit) && logoEdit !== null && (
                  <button
                    type="button"
                    onClick={() => { dirtyRef.current = true; setEnregistre(false); setLogoEdit(null); }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} /> Retirer
                  </button>
                )}
                <p className="text-[11px] text-slate-400 leading-snug">
                  PNG, JPEG, WEBP ou SVG — 2 Mo maximum. Sans logo, la marque du
                  produit est utilisée.
                </p>
              </div>
            </div>
          </Carte>

          <Carte titre="Aperçu de l'en-tête" aide="Tel qu'il sera imprimé en haut des documents A4.">
            <ApercuEntete branding={draft} logo={apercuLogo} />
          </Carte>
        </div>
      </div>

      {/* ── Barre d'action ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-slate-100 py-3">
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={enregistrer}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 text-white text-[13px] font-semibold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Enregistrer
        </button>
        {dirty && !saving && (
          <button
            type="button"
            onClick={annuler}
            className="px-3 py-2 rounded-lg text-[13px] text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Annuler
          </button>
        )}
        {enregistre && !dirty && (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-emerald-600 font-medium">
            <Check size={14} /> Enregistré
          </span>
        )}
        {erreur && (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-rose-600 font-medium">
            <AlertTriangle size={14} /> {erreur}
          </span>
        )}
      </div>
    </div>
  );
}

/** The real masthead at A4 proportions, scaled down — the point is to see the
 *  effect of a switch without printing a page to find out. */
function ApercuEntete({ branding, logo }: { branding: Branding; logo: string }) {
  const entete = resoudreEntete(branding);
  return (
    <div className="border border-slate-200 rounded-lg bg-white p-3 text-black">
      <div className="flex items-start justify-between gap-2">
        <div className="w-12 h-12 shrink-0 flex items-center justify-center">
          {entete.afficherLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="max-w-full max-h-full object-contain" />
          )}
        </div>
        <div className="flex-1 min-w-0" style={{ textAlign: entete.alignement }}>
          {entete.lignes.map((ligne, i) => (
            <div
              key={i}
              dir={ligne.rtl ? "rtl" : undefined}
              className={
                ligne.kind === "nom"
                  ? "font-bold uppercase text-[8px] tracking-wide leading-snug font-[family-name:var(--font-display)]"
                  : ligne.kind === "republique"
                    ? "font-bold uppercase text-[8px] tracking-wide leading-snug"
                  : ligne.kind === "nom_ar"
                    ? "font-bold text-[8px] leading-snug"
                    : "text-[8px] leading-snug"
              }
            >
              {ligne.text}
            </div>
          ))}
          <div className="text-[8px] mt-1 text-slate-500">Service de …</div>
          <div className="mt-2 text-[11px] font-bold uppercase tracking-wide">Titre du document</div>
          <div className="flex items-center justify-between text-[8px] mt-1 pt-1 border-t border-slate-300">
            <span>N° : 1234</span>
            <span>{entete.ligneDate("14/10/2026")}</span>
          </div>
        </div>
        <div className="w-12 h-12 shrink-0">
          {entete.afficherQr && (
            <div className="w-full h-full border border-dashed border-slate-300 rounded flex items-center justify-center text-[7px] text-slate-400">
              QR
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Carte({ titre, aide, children }: { titre: string; aide?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-wide text-slate-600">
        <Building2 size={13} className="text-slate-400" />
        {titre}
      </h3>
      {aide && <p className="text-[11.5px] text-slate-400 mt-0.5 mb-3">{aide}</p>}
      <div className={aide ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

function Champ({
  label, aide, value, placeholder, rtl, onChange,
}: {
  label: string;
  aide?: string;
  value: string;
  placeholder?: string;
  rtl?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        dir={rtl ? "rtl" : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-lg border border-slate-200 text-[13px] outline-none focus:border-slate-400 transition-colors"
      />
      {aide && <span className="text-[11px] text-slate-400 leading-snug">{aide}</span>}
    </label>
  );
}

function Interrupteur({
  label, aide, checked, onChange,
}: {
  label: string;
  aide?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 py-1 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-3.5 h-3.5 shrink-0 accent-slate-700 cursor-pointer"
      />
      <span className="min-w-0">
        <span className="block text-[12.5px] text-slate-700 leading-snug group-hover:text-slate-900">{label}</span>
        {aide && <span className="block text-[11px] text-slate-400 leading-snug">{aide}</span>}
      </span>
    </label>
  );
}
