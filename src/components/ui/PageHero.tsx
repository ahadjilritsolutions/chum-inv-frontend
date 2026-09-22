"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export type ActionVariant = "primary" | "outline" | "danger";

export interface PageAction {
  label: string;
  icon?: LucideIcon;
  /** If provided, renders as a <Link>. Otherwise renders as <button>. */
  href?: string;
  onClick?: () => void;
  variant?: ActionVariant;
  disabled?: boolean;
}

export interface PageHeroProps {
  title: string;
  icon: LucideIcon;
  actions?: PageAction[];
  /** Stat tiles rendered to the right of the actions (dashboard header). */
  stats?: React.ReactNode;
}

const variantCls: Record<ActionVariant, string> = {
  primary: "text-white hover:opacity-90 [background:var(--gradient-brand)]",
  outline: "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50",
  danger: "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100",
};

const sharedCls =
  "inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-[7px] rounded-xl " +
  "text-xs sm:text-sm font-medium transition-colors cursor-pointer no-underline " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * Le titre par lequel chaque page commence — l'icône et le titre, sans
 * bandeau autour.
 *
 * Repris TEL QUEL de magasin-migration, dont le commentaire d'origine explique le
 * choix : la carte en dégradé qu'il y avait avant mangeait une rangée entière de
 * hauteur pour répéter ce que la barre latérale dit déjà — dans quel module on
 * se trouve. Un simple titre le dit aussi bien, en une fraction de la place.
 *
 * L'inventaire avait hérité de la version DEP/LIS (bandeau en dégradé, pastille
 * blanche, sous-titre en capitales). C'était le mauvais parent : la référence
 * visuelle de ce module est le magasin. Le sous-titre disparaît avec le
 * bandeau, et c'est voulu — il ne portait jamais qu'une paraphrase du titre.
 */
export default function PageHero({
  title,
  icon: Icon,
  actions = [],
  stats,
}: PageHeroProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={19} className="shrink-0 text-slate-400" />
        <h1 className="text-[16px] sm:text-[18px] font-bold text-slate-800 leading-tight truncate">
          {title}
        </h1>
      </div>

      {(actions.length > 0 || stats) && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {actions.map((action, i) => {
            const cls = `${sharedCls} ${variantCls[action.variant ?? "outline"]}`;

            if (action.href) {
              return (
                <Link key={i} href={action.href} className={cls} title={action.label}>
                  {action.icon && <action.icon size={14} />}
                  {action.icon ? (
                    <span className="hidden sm:inline">{action.label}</span>
                  ) : (
                    action.label
                  )}
                </Link>
              );
            }

            return (
              <button
                key={i}
                type="button"
                disabled={action.disabled}
                onClick={action.onClick ?? (() => router.back())}
                className={cls}
                title={action.label}
              >
                {action.icon && <action.icon size={14} />}
                {action.icon ? (
                  <span className="hidden sm:inline">{action.label}</span>
                ) : (
                  action.label
                )}
              </button>
            );
          })}

          {stats}
        </div>
      )}
    </div>
  );
}
