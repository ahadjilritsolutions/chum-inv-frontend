"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export interface OptionRecherche {
  id: number;
  libelle: string;
  /** Deuxième ligne — le parent, le service, ce qui lève l'ambiguïté. */
  detail?: string | null;
}

/**
 * UNE LISTE DÉROULANTE OÙ L'ON TAPE.
 *
 * Le `<select>` natif devient inutilisable au-delà de quelques dizaines
 * d'entrées, et ce formulaire en a de 704. On y descendait à la molette pour
 * trouver « CHAISE », sans aucun moyen de sauter — le navigateur ne cherche
 * que sur les premières lettres, et seulement si on tape vite.
 *
 * ── LA RECHERCHE IGNORE ACCENTS ET CASSE ────────────────────────────────────
 * Le catalogue mélange « ECHOGRAPHE » et « Échographe » — il a été saisi sur
 * vingt ans par des dizaines de personnes. Chercher « echo » doit trouver les
 * deux, sinon l'utilisateur conclut que l'entrée n'existe pas et en crée une
 * seconde. C'est comme cela qu'un catalogue double de taille.
 *
 * ── CE N'EST PAS UNE SAISIE LIBRE ───────────────────────────────────────────
 * On ne peut QUE choisir dans la liste. Le champ de recherche filtre, il
 * n'enregistre rien : un référentiel partagé ne se complète pas depuis le
 * formulaire de saisie d'un article, sinon on obtient « CHAISE », « Chaise »
 * et « chaise  » comme trois entrées distinctes.
 */
export default function SearchSelect({
  options,
  valeur,
  onChange,
  placeholder = "— choisir —",
  disabled,
  invalide,
  vide = "Aucun résultat",
}: {
  options: readonly OptionRecherche[];
  valeur: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  invalide?: boolean;
  /** Message quand la recherche ne donne rien. */
  vide?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [q, setQ] = useState("");
  const boite = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLInputElement>(null);

  const choisi = useMemo(
    () => options.find((o) => o.id === valeur) ?? null,
    [options, valeur],
  );

  // Refermer en cliquant ailleurs. Sans cela, deux listes ouvertes se
  // superposent et on ne sait plus laquelle on remplit.
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (boite.current && !boite.current.contains(e.target as Node)) {
        setOuvert(false);
        setQ("");
      }
    };
    document.addEventListener("mousedown", dehors);
    return () => document.removeEventListener("mousedown", dehors);
  }, [ouvert]);

  useEffect(() => {
    if (ouvert) champ.current?.focus();
  }, [ouvert]);

  const filtrees = useMemo(() => {
    const t = normaliser(q);
    if (!t) return options;
    // Ce qui COMMENCE par la recherche d'abord : taper « cha » doit proposer
    // « CHAISE » avant « FAUTEUIL DE BUREAU À CHÂSSIS ».
    const debut: OptionRecherche[] = [];
    const dedans: OptionRecherche[] = [];
    for (const o of options) {
      const n = normaliser(o.libelle);
      if (n.startsWith(t)) debut.push(o);
      else if (n.includes(t) || normaliser(o.detail ?? "").includes(t)) dedans.push(o);
    }
    return [...debut, ...dedans];
  }, [options, q]);

  const base =
    "flex h-10 w-full items-center gap-2 rounded-lg border px-3 text-left text-[13px] outline-none transition-colors";
  const bord = invalide
    ? "border-red-400 bg-red-50/40"
    : "border-slate-300 bg-white hover:border-slate-400";

  return (
    <div ref={boite} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOuvert((v) => !v)}
        className={`${base} ${bord} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
      >
        <span className={`min-w-0 flex-1 truncate ${choisi ? "text-slate-800" : "text-slate-400"}`}>
          {choisi ? choisi.libelle : placeholder}
        </span>
        {choisi && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Effacer"
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={13} />
          </span>
        )}
        <ChevronDown size={14} className="shrink-0 text-slate-400" />
      </button>

      {ouvert && !disabled && (
        <div className="absolute z-[1200] mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search size={14} className="shrink-0 text-slate-400" />
            <input
              ref={champ}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher…"
              className="w-full text-[13px] outline-none placeholder:text-slate-400"
              onKeyDown={(e) => {
                if (e.key === "Escape") { setOuvert(false); setQ(""); }
                // Entrée choisit le seul résultat : quand la recherche ne
                // laisse qu'une ligne, aller la cliquer est du geste perdu.
                if (e.key === "Enter" && filtrees.length === 1) {
                  e.preventDefault();
                  onChange(filtrees[0].id);
                  setOuvert(false); setQ("");
                }
              }}
            />
          </div>

          <ul className="max-h-[260px] list-none overflow-y-auto p-1">
            {filtrees.length === 0 && (
              <li className="px-3 py-4 text-center text-[12.5px] italic text-slate-400">
                {vide}
              </li>
            )}
            {filtrees.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => { onChange(o.id); setOuvert(false); setQ(""); }}
                  className={
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors " +
                    (o.id === valeur ? "bg-cyan-50" : "hover:bg-slate-50")
                  }
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-slate-800">
                      {o.libelle}
                    </span>
                    {o.detail && (
                      <span className="block truncate text-[11px] text-slate-400">
                        {o.detail}
                      </span>
                    )}
                  </span>
                  {o.id === valeur && (
                    <Check size={14} className="shrink-0 text-cyan-600" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Minuscules, sans accents — pour que « echo » trouve « Échographe ». */
function normaliser(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}
