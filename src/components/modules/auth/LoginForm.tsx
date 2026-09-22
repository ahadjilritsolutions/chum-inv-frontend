"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Boxes, Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { login } from "@/services/auth/auth";
import { saveAuthSession } from "@/lib/auth/auth-client";
import { landingPathFor } from "@/lib/auth/landing";
import {
  isAuthenticated,
  isProfileSelection,
  isServiceSelection,
  type LoginRequest,
  type ProfileSelectionResponse,
  type ServiceSelectionResponse,
} from "@/types/auth/auth";
import ProfileSelectionModal from "./ProfileSelectionModal";
import ServiceSelectionModal from "./ServiceSelectionModal";

/**
 * Sign-in.
 *
 * The whole flow is ONE endpoint answered up to twice: post the credentials,
 * and if the server needs a choice it says which, the user answers, and the
 * same request is re-sent with the answer attached. No wizard state lives on
 * the server, so a half-finished login is simply a login that never completed.
 *
 * Where the session LANDS is resolved from the accesses it came back with —
 * never a fixed /dashboard, which would bounce any role without
 * `dashboard.voir` straight into a refusal. See lib/auth/landing.ts.
 */
export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [mail, setMail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [profileChoice, setProfileChoice] =
    useState<ProfileSelectionResponse | null>(null);
  const [serviceChoice, setServiceChoice] =
    useState<ServiceSelectionResponse | null>(null);

  // Why the user is back here. A displaced session is a very different message
  // from an expired one, and without saying so a working system reads as a
  // broken one.
  useEffect(() => {
    const reason = params.get("reason");
    if (reason === "superseded") {
      setNotice(
        "Votre session a été fermée : quelqu'un s'est connecté avec votre compte ailleurs.",
      );
    } else if (reason === "expired") {
      setNotice("Votre session a expiré. Veuillez vous reconnecter.");
    }
  }, [params]);

  async function submit(extra: Partial<LoginRequest> = {}) {
    setBusy(true);
    setError(null);
    try {
      const res = await login({ mail: mail.trim(), pass, ...extra });

      if (isProfileSelection(res)) {
        setProfileChoice(res);
        return;
      }
      if (isServiceSelection(res)) {
        setServiceChoice(res);
        return;
      }
      if (isAuthenticated(res)) {
        saveAuthSession({ user: res.user, token: res.token });
        // A hard navigation, not router.push: every provider in the tree reads
        // the session once on mount, so the shell has to be built fresh.
        router.replace(landingPathFor(res.user.acces));
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la connexion");
      setProfileChoice(null);
      setServiceChoice(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="w-full max-w-[400px]">
        {/* Brand */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Boxes size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">CHU Mustapha</h1>
          <p className="mt-1 text-sm text-white/70">
            Gestion de l&apos;inventaire
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="rounded-2xl bg-white p-6 shadow-xl"
        >
          <h2 className="mb-1 text-[15px] font-semibold text-slate-800">
            Connexion
          </h2>
          <p className="mb-5 text-xs text-slate-500">
            Utilisez vos identifiants Santeplus.
          </p>

          {notice && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] leading-relaxed text-amber-900">
              {notice}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] leading-relaxed text-red-800"
            >
              {error}
            </div>
          )}

          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Identifiant
          </label>
          <input
            type="text"
            autoComplete="username"
            value={mail}
            onChange={(e) => setMail(e.target.value)}
            required
            className="mb-4 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            placeholder="prenom.nom@chum.dz"
          />

          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Mot de passe
          </label>
          <div className="relative mb-5">
            <input
              type={showPass ? "text" : "password"}
              autoComplete="current-password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 pr-10 text-sm outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              aria-label={
                showPass ? "Masquer le mot de passe" : "Afficher le mot de passe"
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={busy || !mail || !pass}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--gradient-brand)" }}
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LogIn size={16} />
            )}
            {busy ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] text-white/50">
          L&amp;R Corporation
        </p>
      </div>

      {/* A System user picks role AND service in one screen: for them the two
          are a single decision — which desk am I at today. */}
      <ProfileSelectionModal
        data={profileChoice}
        busy={busy}
        onCancel={() => setProfileChoice(null)}
        onConfirm={(id_role, id_service) =>
          void submit(
            id_service === null ? { id_role } : { id_role, id_service },
          )
        }
      />

      <ServiceSelectionModal
        data={serviceChoice}
        busy={busy}
        onCancel={() => setServiceChoice(null)}
        onConfirm={(id_service) => void submit({ id_service })}
      />
    </>
  );
}
