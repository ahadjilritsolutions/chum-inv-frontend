"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, UserCog } from "lucide-react";
import { getContextOptions, switchContext } from "@/services/context/context";
import { storeContext } from "@/lib/auth/auth-client";
import { withBasePath } from "@/lib/basePath";
import { landingPathFor } from "@/lib/auth/landing";
import type { ContextOptions } from "@/types/auth/auth";

/** Sentinel for "act as System itself" — the API takes id_role: null. */
const SYSTEM_OPTION = -1;

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Change service, or — for a System account — the role being acted as.
 *
 * The options are fetched when the dialog opens rather than held by the
 * navbar: they depend on assignments that an administrator may have changed
 * since login, and a stale list here would offer a service the server then
 * refuses.
 *
 * On success the app is RELOADED into the new context's landing page instead
 * of re-rendering in place. Every provider in the tree reads the session once
 * on mount, and the accesses, the service scope and the sidebar all change at
 * once — patching that live would leave half the app describing the old desk.
 */
export default function ContextSwitcherModal({ open, onClose }: Props) {
  const [opts, setOpts] = useState<ContextOptions | null>(null);
  const [role, setRole] = useState<number | null>(null);
  const [service, setService] = useState<number | null>(null);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setOpts(null);
    // Belt and braces on top of the fix in confirm(): whatever state a previous
    // open left behind, a freshly opened dialog is never mid-submit.
    setBusy(false);
    void getContextOptions()
      .then((o) => {
        if (cancelled) return;
        setOpts(o);
        setRole(o.id_role ?? SYSTEM_OPTION);
        setService(o.id_service);
        setFilter("");
      })
      .catch((e: unknown) =>
        setError(
          e instanceof Error ? e.message : "Impossible de charger les options.",
        ),
      );
    return () => {
      cancelled = true;
    };
  }, [open]);

  const services = useMemo(() => {
    if (!opts) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return opts.services;
    return opts.services.filter(
      (s) =>
        s.lib_service.toLowerCase().includes(q) ||
        (s.cod_service ?? "").toLowerCase().includes(q),
    );
  }, [opts, filter]);

  async function confirm() {
    if (!opts) return;
    setBusy(true);
    setError(null);
    try {
      const body: { id_service?: number; id_role?: number | null } = {};
      if (service !== null && service !== opts.id_service) body.id_service = service;
      if (opts.est_systeme && role !== null) {
        const current = opts.id_role ?? SYSTEM_OPTION;
        if (role !== current) {
          // null is the explicit "stop acting as anyone" answer; the backend
          // tells it apart from "not specified". See switch-context.controller.
          body.id_role = role === SYSTEM_OPTION ? null : role;
        }
      }
      // Nothing changed — closing is the honest answer, not a pointless
      // round trip that re-issues the token for no reason.
      //
      // `busy` MUST be cleared here. Every other exit from this function either
      // navigates away (success) or clears it in the catch; this one returns
      // with the component still mounted, so leaving it true left "Appliquer"
      // disabled for the rest of the session — the modal reopened looking
      // normal and simply refused to do anything.
      if (Object.keys(body).length === 0) {
        setBusy(false);
        onClose();
        return;
      }

      const res = await switchContext(body);

      // The token comes back re-issued on the SAME session row; the stored
      // copy has to follow it or every subsequent request carries the old one.
      localStorage.setItem("inv_token", res.token);
      storeContext(res);

      // Hard navigation — see the note in the component comment.
      window.location.href = withBasePath(landingPathFor(res.acces));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le changement a échoué.");
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[88vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header
          className="flex items-center gap-3 px-5 py-4 text-white"
          style={{ background: "var(--gradient-brand)" }}
        >
          <UserCog size={20} />
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold">
              {opts?.est_systeme ? "Changer de profil" : "Changer de service"}
            </h2>
            <p className="text-[11.5px] text-white/70">
              {opts?.est_systeme
                ? "Rôle et service de travail"
                : "Service de travail"}
            </p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] text-red-800"
            >
              {error}
            </div>
          )}

          {!opts ? (
            <p className="py-6 text-center text-sm text-slate-500">Chargement…</p>
          ) : (
            <>
              {opts.est_systeme && opts.roles.length > 0 && (
                <>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    Rôle
                  </label>
                  <div className="mb-5 grid gap-1.5">
                    {/* The way back to being the administrator. Without it a
                        System user who picks a role can never recover the
                        admin.* codes, because no inv_role holds any. */}
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
                    {opts.roles.map((r) => (
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
                </>
              )}

              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Service
              </label>
              {opts.services.length > 8 && (
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Rechercher un service…"
                  className="mb-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                />
              )}
              <div className="max-h-[220px] overflow-y-auto rounded-xl border border-slate-200 scroll-visible">
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
            onClick={onClose}
            disabled={busy}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={busy || !opts}
            onClick={() => void confirm()}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--gradient-brand)" }}
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            Appliquer
          </button>
        </footer>
      </div>
    </div>
  );
}
