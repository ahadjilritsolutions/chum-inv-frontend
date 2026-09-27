"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The bar every list screen opens with: a search box, optional filters, and the
 * Add button.
 *
 * The search is DEBOUNCED here rather than at each call site, because a list of
 * 982 articles refetching on every keystroke is the difference between a screen
 * that feels instant and one that feels broken.
 */
export default function ListToolbar({
  recherche,
  onRecherche,
  placeholder = "Rechercher par code ou nom…",
  onAdd,
  addLabel = "Ajouter",
  actions,
  filters,
  total,
  focusSignal,
}: {
  recherche: string;
  onRecherche: (v: string) => void;
  placeholder?: string;
  /** Omit it and no button is rendered — a read-only list has nothing to add. */
  onAdd?: () => void;
  addLabel?: string;
  /**
   * Boutons secondaires, posés à gauche du bouton d'ajout.
   *
   * Un écran a parfois plusieurs façons d'entrer de la matière — le registre
   * des articles en a trois (un article, un lot, une recherche par code
   * scanné). Les empiler ici plutôt que de dupliquer la barre garde une seule
   * mise en page à corriger le jour où elle bouge.
   */
  actions?: ReactNode;
  /**
   * Incrémentez-le pour donner le focus à la zone de recherche.
   *
   * Un compteur et non un booléen : deux demandes successives doivent toutes
   * deux agir, et « déjà à true » ne redéclencherait rien. C'est la façon
   * propre de laisser la page piloter un champ que la barre possède — sans
   * aller le chercher dans le DOM par son placeholder, qui casse au premier
   * changement de libellé.
   */
  focusSignal?: number;
  filters?: ReactNode;
  total?: number;
}) {
  const [draft, setDraft] = useState(recherche);
  const champ = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusSignal === undefined || focusSignal === 0) return;
    champ.current?.focus();
    champ.current?.select();
  }, [focusSignal]);

  // Keeps the box in step when the page resets the query (a filter change).
  useEffect(() => {
    setDraft(recherche);
  }, [recherche]);

  useEffect(() => {
    if (draft === recherche) return;
    const t = setTimeout(() => onRecherche(draft), 300);
    return () => clearTimeout(t);
  }, [draft, recherche, onRecherche]);

  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm sm:p-4">
      {/* ── TROIS RANGÉES SUR MOBILE, UNE SEULE BARRE À PARTIR DE `sm` ──────
          Sur un téléphone, la recherche prend sa propre ligne : partagée avec
          un premier filtre, elle tombait sous les 80 px et la liste déroulante
          venait se poser par-dessus.

          Les filtres passent ensuite dans leur propre rangée, chacun prenant
          une part égale de la largeur — deux par ligne — au lieu de garder la
          largeur de leur contenu et de déborder.

          `sm:contents` fait DISPARAÎTRE ces deux conteneurs de la mise en page
          à partir de `sm` : leurs enfants remontent dans la barre et
          retrouvent exactement la disposition d'avant. Aucun écran large ne
          bouge. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <div className="relative w-full min-w-0 sm:w-auto sm:flex-1 sm:min-w-[240px]">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            ref={champ}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className={cn(
              "h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-800",
              "outline-none transition placeholder:text-slate-400",
              "focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10",
            )}
          />
          {draft && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => {
                setDraft("");
                onRecherche("");
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition-colors hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {filters && (
          <div
            className={cn(
              "flex w-full flex-wrap items-center gap-2 sm:contents",
              // Sous `sm` uniquement : chaque filtre prend une part égale de la
              // rangée. Les `min-w-[150px]` posés par les pages restent le
              // plancher, donc on obtient deux filtres par ligne sur un
              // téléphone et non une colonne de largeurs dépareillées.
              "max-sm:[&>*]:min-w-[140px] max-sm:[&>*]:flex-1",
            )}
          >
            {filters}
          </div>
        )}

        {total !== undefined && (
          <span className="hidden text-xs text-slate-400 sm:inline">
            {total.toLocaleString("fr-DZ")} résultat{total > 1 ? "s" : ""}
          </span>
        )}

        {(actions || onAdd) && (
          /* PAS de `shrink-0` ici : c'est lui qui débordait. Un bloc de trois
             boutons large de 403 px refusait de rétrécir dans un écran de
             300 px, et poussait toute la page en défilement horizontal. */
          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
            {actions}
            {onAdd && (
              <button
                type="button"
                onClick={onAdd}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-cyan-700 sm:flex-none sm:shrink-0"
              >
                <Plus size={15} />
                {addLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
