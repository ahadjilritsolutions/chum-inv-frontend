"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ViewTab<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
  /**
   * Un onglet d'ACTION (« Ajouter ») — déclenche `onAction` au lieu de changer
   * de vue, et se teinte pour ne jamais passer pour la sélection courante.
   */
  isAction?: boolean;
  /** Petit compteur à droite du libellé (une file d'attente, par exemple). */
  badge?: number;
}

interface ViewTabsProps<T extends string> {
  tabs: ReadonlyArray<ViewTab<T>>;
  active: T;
  onChange: (id: T) => void;
  onAction?: (id: T) => void;
}

/**
 * La barre d'onglets des écrans à plusieurs vues.
 *
 * ── POURQUOI LES ONGLETS NE S'ÉTIRENT PAS ───────────────────────────────────
 * La première version donnait à chaque onglet `1fr`, donc la barre était
 * toujours remplie sur toute la largeur. Avec les sept onglets du magasin cela
 * passe ; avec DEUX, chacun faisait près de 900 px sur un écran large et le
 * soulignement cyan de l'onglet actif courait sur la moitié de la page. Deux
 * boutons géants qui ne ressemblent plus à des onglets.
 *
 * Les onglets sont donc dimensionnés par leur CONTENU et alignés à gauche. La
 * barre garde exactement le vocabulaire visuel du magasin — carte blanche
 * arrondie, fond `slate-50/70` pour l'inactif, onglet actif blanc souligné de
 * cyan — mais sa largeur ne dépend plus du nombre d'onglets. Un écran à deux
 * vues et un écran à sept se ressemblent enfin.
 *
 * `overflow-x-auto` : sur téléphone, six onglets ne tiennent pas. Ils défilent
 * plutôt que de passer à la ligne, ce qui garderait la carte lisible mais
 * ferait sauter la mise en page à chaque changement de vue.
 */
export default function ViewTabs<T extends string>({
  tabs,
  active,
  onChange,
  onAction,
}: ViewTabsProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="flex overflow-x-auto bg-slate-50/70 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map(({ id, label, icon: Icon, isAction, badge }) => {
          const isActive = !isAction && active === id;

          return (
            <button
              key={id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => (isAction ? onAction?.(id) : onChange(id))}
              className={cn(
                "flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap",
                "border-b-2 px-4 py-3 text-[12.5px] font-semibold transition-colors",
                "cursor-pointer sm:gap-2 sm:px-5 sm:py-3.5 sm:text-[13px]",
                isActive
                  ? "border-cyan-500 bg-white text-[#0f2847]"
                  : "border-transparent text-slate-500 hover:bg-slate-50",
                isAction && "text-cyan-600 hover:text-cyan-700",
              )}
            >
              <Icon size={15} className="shrink-0" />
              {label}
              {badge !== undefined && badge > 0 && (
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 py-px text-[10.5px] font-bold",
                    isActive ? "bg-cyan-100 text-cyan-800" : "bg-slate-200 text-slate-600",
                  )}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
