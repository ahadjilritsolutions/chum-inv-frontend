"use client";

import { Construction, type LucideIcon } from "lucide-react";
import PageHero from "./PageHero";

interface ModulePlaceholderProps {
  title: string;
  icon: LucideIcon;
  /** One line on what the section will do, shown under the title. */
  subtitle: string;
  /** The screens planned for this section, listed so the scope is visible. */
  planned?: string[];
}

/**
 * Stub screen for a routed-but-unbuilt section.
 *
 * Each of the seven sidebar sections is routed from day one so the rail's order
 * never shifts as modules land. This renders the real page chrome — same hero,
 * same card surface — with an explicit "not built yet" panel, so a stub is
 * never mistaken for a module that loaded empty.
 */
export default function ModulePlaceholder({
  title,
  icon,
  subtitle,
  planned = [],
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-4">
      <PageHero title={title} icon={icon} />

      <section className="rounded-2xl bg-white p-8 shadow-sm">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Construction size={26} />
          </span>

          <h2 className="mt-4 text-[15px] font-bold text-slate-800">
            Module en cours de construction
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Cette section est déjà routée : son contenu sera livré prochainement.
          </p>

          {planned.length > 0 && (
            <ul className="mt-5 w-full space-y-2 text-left">
              {planned.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-600"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
