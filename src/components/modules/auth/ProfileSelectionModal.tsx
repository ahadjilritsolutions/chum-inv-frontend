"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck, UserCog } from "lucide-react";
import type { ProfileSelectionResponse } from "@/types/auth/auth";

interface Props {
  data: ProfileSelectionResponse | null;
  busy: boolean;
  onCancel: () => void;
  /** `id_role: null` means "as System itself" — see SYSTEM_OPTION below. */
  onConfirm: (id_role: number | null, id_service: number | null) => void;
}

/**
 * The "act as nobody" choice.
 *
 * NOT cosmetic: no inv_role holds an `admin.*` code, so Administration and the
 * data migration belong to System-as-itself and to nothing else. Without this
 * entry an administrator can only ever act as someone, and those screens are
 * reachable by no one at all.
 */
const SYSTEM_OPTION = -1;

/**
 * SYSTEM ONLY — role and service, in one screen.
 *
 * Asked as a single question rather than a chain of modals, because for an
 * administrator the two ARE one decision: which desk am I sitting at today.
 * Walking them through two sequential dialogs asks the same thing twice.
 *
 * The role chosen here is a real change of authority, not a label: the backend
 * resolves the acted-as role's access codes AND its service scope, so acting
 * as a "gestionnaire de service" genuinely shows one ward's articles. That is
 * the property that makes this switcher useful for checking what a role sees.
 */
export default function ProfileSelectionModal({
  data,
  busy,
  onCancel,
  onConfirm,
}: Props) {
  const [role, setRole] = useState<number | null>(null);
  const [service, setService] = useState<number | null>(null);
  const [filter, setFilter] = useState("");

  // Pre-select the server's suggestion whenever the dialog opens with fresh
  // options, rather than on every render.
  useEffect(() => {
    if (!data) return;
    // Defaults to System itself, which is what an administrator signing in
    // most often wants — and it is the only profile from which they can reach
    // Administration.
    setRole(SYSTEM_OPTION);
    setService(data.services[0]?.id_service ?? null);
    setFilter("");
  }, [data]);

  const services = useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return data.services;
    return data.services.filter(
      (s) =>
        s.lib_service.toLowerCase().includes(q) ||
        (s.cod_service ?? "").toLowerCase().includes(q),
    );
  }, [data, filter]);

  if (!data) return null;

  const chosenRole = data.roles.find((r) => r.id_role === role);
  const isSelf = role === SYSTEM_OPTION;
  // A service is asked for EXACTLY ONE reason: simulating a role that only
  // sees its own ward is meaningless until you say which ward. The inventory
  // is one hospital-wide register, so nothing else needs the question — this
  // is the main way the app differs from the DEP and the LIS, where staff
  // really do belong to several services.
  const besoinService = !isSelf && chosenRole?.portee === "propres_services";

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[88vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header
          className="flex items-center gap-3 px-5 py-4 text-white"
          style={{ background: "var(--gradient-brand)" }}
        >
          <UserCog size={20} />
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold">Choisir un profil</h2>
            <p className="text-[11.5px] text-white/70">
              Compte système — sous quel rôle travaillez-vous ?
            </p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Rôle
          </label>
          <div className="mb-1 grid gap-1.5">
            <button
              type="button"
              onClick={() => setRole(SYSTEM_OPTION)}
              className={[
                "flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                role === SYSTEM_OPTION
                  ? "border-cyan-500 bg-cyan-50 text-slate-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              <span className="font-medium">Système — tous les accès</span>
              <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[10.5px] font-semibold text-white">
                Administration
              </span>
            </button>
            <p className="mb-1 text-[11px] leading-relaxed text-slate-400">
              Les rôles ci-dessous sont une <em>simulation fidèle</em> : vous
              voyez exactement ce que voit ce rôle, y compris ses limites de
              périmètre. L&apos;administration n&apos;est accessible qu&apos;en
              « Système ».
            </p>
            {data.roles.map((r) => (
              <button
                key={r.id_role}
                type="button"
                onClick={() => setRole(r.id_role)}
                className={[
                  "flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                  role === r.id_role
                    ? "border-cyan-500 bg-cyan-50 text-slate-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                <span className="font-medium">{r.lib_role}</span>
                {/* The perimeter is the consequential half of the choice, so
                    it is shown next to the name rather than discovered after
                    signing in. */}
                <span
                  className={[
                    "shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                    r.portee === "tous_services"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800",
                  ].join(" ")}
                >
                  {r.portee === "tous_services"
                    ? "Tous les services"
                    : "Service choisi"}
                </span>
              </button>
            ))}
          </div>

          <p className="mb-5 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-slate-500">
            <ShieldCheck size={13} className="mt-0.5 shrink-0" />
            Sous un rôle simulé vous gardez de quoi revenir (Administration et
            le changement de profil), mais pas les pouvoirs
            d&apos;administration eux-mêmes — comptes système, rôles, migration.
            Repassez en « Système » pour les retrouver.
          </p>

          {!besoinService ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11.5px] leading-relaxed text-slate-500">
              Ce profil couvre <strong>tout l&apos;établissement</strong> :
              aucun service à choisir. L&apos;inventaire est un registre unique
              — le service est une caractéristique de l&apos;emplacement de
              l&apos;article, pas de votre session.
            </p>
          ) : (
            <>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Service à simuler
          </label>
          <p className="mb-2 text-[11px] leading-relaxed text-slate-400">
            Ce rôle ne voit que son propre service : indiquez lequel pour que la
            simulation ait un sens.
          </p>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Rechercher un service…"
            className="mb-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
          />
          <div className="max-h-[210px] overflow-y-auto rounded-xl border border-slate-200 scroll-visible">
            {services.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-400">
                Aucun service ne correspond.
              </p>
            ) : (
              services.map((s) => (
                <button
                  key={s.id_service}
                  type="button"
                  onClick={() => setService(s.id_service)}
                  className={[
                    "flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-[13px] last:border-0 transition-colors",
                    service === s.id_service
                      ? "bg-cyan-50 font-medium text-slate-900"
                      : "text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {s.cod_service && (
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10.5px] text-slate-500">
                      {s.cod_service}
                    </span>
                  )}
                  <span className="truncate">{s.lib_service}</span>
                </button>
              ))
            )}
          </div>
            </>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={busy || role === null || (besoinService && service === null)}
            onClick={() =>
              role !== null &&
              onConfirm(
                role === SYSTEM_OPTION ? null : role,
                besoinService ? service : null,
              )
            }
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--gradient-brand)" }}
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            Continuer
          </button>
        </footer>
      </div>
    </div>
  );
}
