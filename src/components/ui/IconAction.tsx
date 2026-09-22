"use client";

import { cn } from "@/lib/utils";

/**
 * A square icon button for a table's actions column.
 *
 * Each action carries its own colour, because a row holds up to eight of them
 * and at
 * 14px the icons alone are too similar to tell apart at a glance. Colour is the
 * fastest discriminator there is, and the destructive one has to be the one that
 * cannot be clicked by mistake.
 *
 * The classes are written out per tone rather than interpolated: Tailwind reads
 * the source statically, so `bg-${tone}-50` would produce no CSS at all.
 */
export type ActionTone =
  | "print" | "view" | "edit" | "move" | "sleep" | "retire" | "danger" | "neutral";

const TONES: Record<ActionTone, string> = {
  // Impression — violet
  print:
    "border-violet-200 bg-violet-50 text-violet-600 hover:border-violet-300 hover:bg-violet-100 hover:text-violet-700",
  // Consultation — bleu
  view:
    "border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-300 hover:bg-blue-100 hover:text-blue-700",
  // Modification — vert
  edit:
    "border-emerald-200 bg-emerald-50 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-700",
  // Déplacement — indigo. Le bien change de place, rien d'autre : ni son état,
  // ni sa valeur, ni son existence. D'où une teinte franche mais froide, qui ne
  // le fait pas lire comme une action destructrice.
  move:
    "border-indigo-200 bg-indigo-50 text-indigo-600 hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-700",
  // Mise en sommeil / réactivation — orange
  sleep:
    "border-amber-200 bg-amber-50 text-amber-600 hover:border-amber-300 hover:bg-amber-100 hover:text-amber-700",
  // Sortie définitive du parc (réforme) — rose. Volontairement distincte du
  // rouge de la suppression : réformer SORT UN BIEN, supprimer EFFACE UNE
  // LIGNE. Les deux sont irréversibles et ne veulent pas dire la même chose ;
  // les peindre pareil serait inviter à confondre le bien et sa fiche.
  retire:
    "border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700",
  // Suppression — rouge
  danger:
    "border-red-200 bg-red-50 text-red-600 hover:border-red-300 hover:bg-red-100 hover:text-red-700",
  neutral:
    "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700",
};

export default function IconAction({
  title,
  tone = "neutral",
  onClick,
  disabled,
  children,
}: {
  /** Shown as the tooltip AND the accessible name — the button has no label. */
  title: string;
  tone?: ActionTone;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
        // Disabled keeps the tone but drains it, so a busy row still reads as
        // the same actions rather than a line of grey squares.
        "disabled:cursor-not-allowed disabled:opacity-40",
        TONES[tone],
      )}
    >
      {children}
    </button>
  );
}
