"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { HEADER_NAVY } from "@/lib/inv/theme";

/**
 * The list-screen table.
 *
 * Extracted once the fifth screen wanted the same navy header, the same empty
 * state and the same pager: five hand-rolled copies is how a module starts
 * looking like five products.
 *
 * The table scrolls inside its own `overflow-x-auto` box, so a wide list never
 * makes the page itself scroll sideways.
 */

export interface Colonne {
  /** Header text. */
  titre: string;
  /** Right-align the cells — for quantities and money. */
  num?: boolean;
  className?: string;
}

export default function DataTable<T>({
  colonnes,
  lignes,
  cle,
  rendu,
  chargement,
  messageVide,
  largeurMin = 720,
  page,
  pages,
  onPage,
}: {
  colonnes: Colonne[];
  lignes: T[];
  /**
   * Row key. The INDEX is provided as a fallback dimension: several list
   * screens have rows that are legitimately identical on every business field
   * — the same article twice on one bon, two stock rows of the same article —
   * and those are different rows, not one row rendered twice.
   */
  cle: (l: T, index: number) => string | number;
  rendu: (l: T) => ReactNode;
  chargement?: boolean;
  messageVide: string;
  /** Below this the table scrolls rather than squashing its columns. */
  largeurMin?: number;
  page?: number;
  pages?: number;
  onPage?: (p: number) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse text-sm"
          style={{ minWidth: `${largeurMin}px` }}
        >
          <thead>
            <tr style={{ background: HEADER_NAVY }} className="text-white">
              {colonnes.map((c, i) => (
                <th
                  key={i}
                  className={[
                    "whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider",
                    c.num ? "text-right" : "text-left",
                    c.className ?? "",
                  ].join(" ")}
                >
                  {c.titre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chargement && (
              <tr>
                <td colSpan={colonnes.length} className="px-4 py-10 text-center text-slate-500">
                  <Loader2 size={16} className="mr-2 inline animate-spin" />
                  Chargement…
                </td>
              </tr>
            )}

            {!chargement && lignes.length === 0 && (
              <tr>
                <td
                  colSpan={colonnes.length}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  {messageVide}
                </td>
              </tr>
            )}

            {!chargement &&
              lignes.map((l, i) => {
                // A key that came back null/undefined is a caller bug, but it
                // must not degrade into React silently reusing DOM between
                // unrelated rows — fall back to the index.
                const k = cle(l, i);
                return (
                  <Ligne key={k === null || k === undefined ? i : k}>{rendu(l)}</Ligne>
                );
              })}
          </tbody>
        </table>
      </div>

      {page !== undefined && pages !== undefined && pages > 1 && onPage && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <span className="text-xs text-slate-500">
            Page {page} / {pages}
          </span>
          <div className="flex gap-2">
            <Pager disabled={page <= 1} onClick={() => onPage(page - 1)}>
              Précédent
            </Pager>
            <Pager disabled={page >= pages} onClick={() => onPage(page + 1)}>
              Suivant
            </Pager>
          </div>
        </div>
      )}
    </section>
  );
}

function Ligne({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">{children}</tr>
  );
}

/** A body cell. Exported so a page can compose its own row markup. */
export function Td({
  children,
  num,
  className = "",
}: {
  children: ReactNode;
  num?: boolean;
  className?: string;
}) {
  return (
    <td
      className={[
        "px-4 py-3 align-middle text-slate-700",
        num ? "text-right tabular-nums" : "",
        className,
      ].join(" ")}
    >
      {children}
    </td>
  );
}

/** The Actif / Inactif chip every list shows in its Statut column. */
export function ChipStatut({ actif, libelles }: { actif: number; libelles?: [string, string] }) {
  const [oui, non] = libelles ?? ["Actif", "Inactif"];
  return (
    <span
      className={
        actif
          ? "rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
          : "rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500"
      }
    >
      {actif ? oui : non}
    </span>
  );
}

function Pager({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
