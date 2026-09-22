"use client";

import { useEffect, useState } from "react";
import { Layers, Loader2 } from "lucide-react";
import type { ServiceSelectionResponse } from "@/types/auth/auth";

interface Props {
  data: ServiceSelectionResponse | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (id_service: number) => void;
}

/**
 * Asked only when the account is assigned to SEVERAL services.
 *
 * The legacy could not pose this question at all: `utilisateur.id_service` is
 * a single column, so a technician covering three wards needed three accounts.
 * `inv_user_service` replaced it, and this is the dialog that choice needs.
 */
export default function ServiceSelectionModal({
  data,
  busy,
  onCancel,
  onConfirm,
}: Props) {
  const [service, setService] = useState<number | null>(null);

  useEffect(() => {
    if (data) setService(data.services[0]?.id_service ?? null);
  }, [data]);

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[88vh] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header
          className="flex items-center gap-3 px-5 py-4 text-white"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Layers size={20} />
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold">Choisir un service</h2>
            <p className="text-[11.5px] text-white/70">
              Votre compte couvre plusieurs services
            </p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid gap-1.5">
            {data.services.map((s) => (
              <button
                key={s.id_service}
                type="button"
                onClick={() => setService(s.id_service)}
                className={[
                  "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                  service === s.id_service
                    ? "border-cyan-500 bg-cyan-50 text-slate-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                {s.cod_service && (
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10.5px] text-slate-500">
                    {s.cod_service}
                  </span>
                )}
                <span className="truncate font-medium">{s.lib_service}</span>
              </button>
            ))}
          </div>
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
            disabled={busy || service === null}
            onClick={() => service !== null && onConfirm(service)}
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
