"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Check,
  IdCard,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { changeMyPassword, getMe, updateMe } from "@/services/inv/me";
import { useAccess } from "@/lib/auth/AccessProvider";
import type { MyProfile } from "@/types/auth/auth";

/**
 * Mon compte — the comun section, matching the DEP and LIS screens.
 *
 * What it replaces: FOUR identical copies of profile.php / password.php /
 * upprofil.php / uppassword.php, one per legacy PHP space (admin/,
 * inventaire/, service/, prest/). Same screen, four files, four places to fix
 * a bug.
 *
 * Never access-gated. It is where a user reads their own profile and changes
 * their own password, so it has to stay reachable for an account that has been
 * created but not yet given a role — which, given the accounts migration
 * leaves unmatched users on a worklist, will be a common state.
 *
 * The editable fields are deliberately just email and telephone. Name, role,
 * grade and service are decisions someone else makes; the legacy
 * `upprofil.php` lets a user rewrite their own `nom_user`, which quietly
 * breaks the hospital directory.
 */
export default function MyAccountView() {
  const { role } = useAccess();

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [infoErr, setInfoErr] = useState<string | null>(null);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passErr, setPassErr] = useState<string | null>(null);

  useEffect(() => {
    void getMe()
      .then((p) => {
        setProfile(p);
        setEmail(p.email ?? "");
        setTelephone(p.telephone ?? "");
      })
      .catch((e: unknown) =>
        setLoadError(
          e instanceof Error ? e.message : "Impossible de charger le profil.",
        ),
      );
  }, []);

  async function saveInfo() {
    setSavingInfo(true);
    setInfoMsg(null);
    setInfoErr(null);
    try {
      const p = await updateMe({ email, telephone });
      setProfile(p);
      setInfoMsg("Informations enregistrées.");
    } catch (e) {
      setInfoErr(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSavingInfo(false);
    }
  }

  async function savePassword() {
    setPassMsg(null);
    setPassErr(null);
    // Checked here as well as server-side: a mismatch is the user's typo, and
    // making them wait for a round trip to hear about it is needless.
    if (next !== confirm) {
      setPassErr("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSavingPass(true);
    try {
      await changeMyPassword({
        mot_de_passe_actuel: current,
        nouveau_mot_de_passe: next,
      });
      setPassMsg("Mot de passe modifié.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      setPassErr(e instanceof Error ? e.message : "Modification impossible.");
    } finally {
      setSavingPass(false);
    }
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-5 text-sm text-red-800">
        {loadError}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        Chargement…
      </div>
    );
  }

  const initials =
    ((profile.prenom?.[0] ?? "") + (profile.nom?.[0] ?? "")).toUpperCase() || "?";

  return (
    <div className="space-y-4">
      {/* Identity header */}
      <div
        className="flex items-center gap-4 rounded-2xl px-5 py-4 text-white shadow-sm"
        style={{ background: "var(--gradient-brand)" }}
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/20 text-lg font-bold">
          {initials}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-semibold">
            {profile.prenom} {profile.nom}
          </h1>
          <p className="truncate text-[12.5px] text-white/75">
            {profile.poste || "Poste non renseigné"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Read-only facts */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-slate-800">
            <IdCard size={16} className="text-slate-400" />
            Identité
          </h2>
          <dl className="space-y-3 text-[13px]">
            <Row icon={<UserRound size={14} />} label="Identifiant">
              <span className="font-mono text-[12.5px]">{profile.login}</span>
            </Row>
            <Row icon={<Building2 size={14} />} label="Service">
              {profile.service?.lib_service ?? "—"}
            </Row>
            <Row icon={<ShieldCheck size={14} />} label="Rôle inventaire">
              {/* profile.role_inv comes from /api/me; `role` from the access
                  provider is the same row but refreshed. Prefer the fresher
                  one so a role change shows without a re-login. */}
              {role?.lib_role ?? profile.role_inv?.lib_role ?? (
                <span className="text-amber-700">Aucun rôle attribué</span>
              )}
            </Row>
            {profile.grade && (
              <Row icon={<ShieldCheck size={14} />} label="Grade">
                {profile.grade.lib_grade}
              </Row>
            )}
            {profile.services.length > 1 && (
              <Row icon={<Building2 size={14} />} label="Services couverts">
                <span className="text-slate-600">
                  {profile.services.map((s) => s.lib_service).join(", ")}
                </span>
              </Row>
            )}
          </dl>
          <p className="mt-4 border-t border-slate-100 pt-3 text-[11.5px] leading-relaxed text-slate-500">
            Nom, rôle, grade et service sont gérés par un administrateur. Pour
            les modifier, contactez le bureau d&apos;inventaire.
          </p>
        </section>

        {/* Editable contact details */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-slate-800">
            <Mail size={16} className="text-slate-400" />
            Coordonnées
          </h2>

          {infoMsg && <Ok>{infoMsg}</Ok>}
          {infoErr && <Err>{infoErr}</Err>}

          <Field label="Adresse e-mail" icon={<Mail size={14} />}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="prenom.nom@chum.dz"
            />
          </Field>

          <Field label="Téléphone" icon={<Phone size={14} />}>
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className={inputCls}
              placeholder="0X XX XX XX XX"
            />
          </Field>

          <button
            type="button"
            onClick={() => void saveInfo()}
            disabled={savingInfo}
            className={btnCls}
            style={{ background: "var(--gradient-brand)" }}
          >
            {savingInfo ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Check size={15} />
            )}
            Enregistrer
          </button>
        </section>

        {/* Password */}
        <section className="rounded-2xl bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-1 flex items-center gap-2 text-[14px] font-semibold text-slate-800">
            <KeyRound size={16} className="text-slate-400" />
            Mot de passe
          </h2>
          <p className="mb-4 text-[11.5px] leading-relaxed text-slate-500">
            Le nouveau mot de passe remplace celui utilisé sur toutes les
            applications Santeplus (DEP, LIS, inventaire) — le compte est le
            même partout.
          </p>

          {passMsg && <Ok>{passMsg}</Ok>}
          {passErr && <Err>{passErr}</Err>}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Mot de passe actuel">
              <input
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Nouveau mot de passe">
              <input
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Confirmer">
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <button
            type="button"
            onClick={() => void savePassword()}
            disabled={savingPass || !current || !next || !confirm}
            className={btnCls}
            style={{ background: "var(--gradient-brand)" }}
          >
            {savingPass ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <KeyRound size={15} />
            )}
            Modifier le mot de passe
          </button>
        </section>
      </div>
    </div>
  );
}

// ── Small presentational helpers ────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const btnCls =
  "mt-4 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50";

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
      <dt className="w-[130px] shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium text-slate-800">{children}</dd>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
        {icon && <span className="text-slate-400">{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  );
}

const Ok = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">
    {children}
  </div>
);

const Err = ({ children }: { children: React.ReactNode }) => (
  <div
    role="alert"
    className="mb-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] text-red-800"
  >
    {children}
  </div>
);
