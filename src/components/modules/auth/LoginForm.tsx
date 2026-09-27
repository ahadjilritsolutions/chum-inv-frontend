"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Boxes, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { withBasePath } from "@/lib/basePath";
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

/** L'identifiant retenu d'une session à l'autre. JAMAIS le mot de passe. */
const CLE_DERNIER_LOGIN = "inv_last_login";
const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://192.168.254.10";

/**
 * Connexion — l'écran du magasin, panneau pour panneau.
 *
 * Les deux applications ouvrent sur la même porte : écusson et identité de
 * l'établissement à gauche, formulaire à droite, dans une même carte de
 * 620 px de haut. Les mêmes agents se connectent aux deux dans la journée, et
 * deux pages d'accueil différentes leur feraient croire à deux systèmes sans
 * rapport. Seule la pastille change de nom — « Bureau des inventaires » là où
 * le magasin écrit « MAGASINS ».
 *
 * Le panneau de gauche est `hidden lg:flex` : sur un téléphone il ne reste que
 * le formulaire, plein cadre. Une colonne de marque qui mange la moitié d'un
 * écran de 390 px repousse le mot de passe sous la ligne de flottaison.
 *
 * ── CE QUE CET ÉCRAN GARDE EN PROPRE ────────────────────────────────────────
 * La logique de connexion n'est PAS celle du magasin, et ne peut pas l'être :
 *
 *   • Tout le parcours tient dans UN endpoint appelé jusqu'à deux fois. On
 *     poste les identifiants ; si le serveur a besoin d'un choix, il dit
 *     lequel, l'utilisateur répond, et la MÊME requête repart avec la réponse.
 *     Aucun état d'assistant ne vit sur le serveur, donc une connexion
 *     abandonnée est simplement une connexion qui n'a jamais abouti.
 *   • Le choix est un RÔLE ET UN SERVICE pour une session Système (les deux ne
 *     font qu'une décision : à quel bureau suis-je assis aujourd'hui), ou un
 *     service seul pour les autres. Le magasin, lui, ne demande qu'un magasin.
 *   • Le bandeau ambre explique POURQUOI on est revenu ici. Une session
 *     déplacée (quelqu'un s'est connecté ailleurs avec le même compte) et une
 *     session expirée ne sont pas le même événement, et ne pas le dire fait
 *     passer un système qui fonctionne pour un système cassé.
 *
 * Où la session ATTERRIT se déduit des accès reçus — jamais un /dashboard
 * figé, qui renverrait tout rôle sans `dashboard.voir` droit sur un refus.
 * Voir lib/auth/landing.ts.
 */
export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [mail, setMail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [retenir, setRetenir] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [profileChoice, setProfileChoice] =
    useState<ProfileSelectionResponse | null>(null);
  const [serviceChoice, setServiceChoice] =
    useState<ServiceSelectionResponse | null>(null);

  useEffect(() => {
    const garde = localStorage.getItem(CLE_DERNIER_LOGIN);
    if (garde) {
      setMail(garde);
      setRetenir(true);
    }
  }, []);

  // Pourquoi l'utilisateur est de retour ici.
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
        // L'identifiant n'est retenu qu'une fois la connexion RÉUSSIE : garder
        // une saisie qui vient d'être refusée la représenterait à la prochaine
        // ouverture comme si elle était bonne.
        if (retenir) localStorage.setItem(CLE_DERNIER_LOGIN, mail.trim());
        else localStorage.removeItem(CLE_DERNIER_LOGIN);

        saveAuthSession({ user: res.user, token: res.token });
        // Une navigation dure, et non router.push : chaque provider de l'arbre
        // lit la session une fois au montage, donc la coquille doit être
        // reconstruite à neuf.
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

  const inputCls = cn(
    "h-13 w-full rounded-xl border-2 bg-white pl-12 pr-4 outline-none transition text-slate-800 text-sm",
    "border-slate-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10",
  );

  return (
    <>
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl shadow-2xl">
        <div className="grid min-h-[620px] grid-cols-1 lg:grid-cols-2">
          {/* ── Gauche : l'établissement ──────────────────────────────────── */}
          <div
            className="relative hidden flex-col items-center justify-center p-10 text-white lg:flex"
            style={{ background: "var(--gradient-sidebar)" }}
          >
            <a
              href={PORTAL_URL}
              className="absolute left-6 top-6 flex items-center gap-2 rounded-full border border-white/15
                bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm
                transition-all hover:bg-white/20"
            >
              <ArrowLeft size={15} />
              Retour
            </a>

            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6 h-40 w-40">
                {/* withBasePath : l'optimiseur de next/image ne préfixe PAS le
                    paramètre `url` du basePath, alors qu'il est lui-même monté
                    dessous. Sans cela, derrière nginx, il va chercher
                    /chu_logo_new.png à la racine du serveur — qui appartient à
                    une autre application — et rend un 400. */}
                <Image
                  src={withBasePath("/chu_logo_new.png")}
                  alt="CHU Mustapha"
                  fill
                  priority
                  className="object-contain drop-shadow-2xl"
                />
              </div>

              <h1 className="text-3xl font-bold">CHU Mustapha</h1>
              <h2 className="mt-1 text-xl font-semibold opacity-80" dir="rtl">
                المركز الاستشفائي الجامعي مصطفى
              </h2>
              <p className="mt-3 text-sm text-white/70">
                Gestion de l&apos;inventaire
              </p>

              <div
                className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold shadow-lg"
                style={{ background: "linear-gradient(135deg,#0891b2,#06b6d4)" }}
              >
                <Boxes size={14} />
                Bureau des inventaires
              </div>

              <div className="mt-10 flex gap-2 opacity-30">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="h-2 w-2 rounded-full bg-white" />
                ))}
              </div>
            </div>
          </div>

          {/* ── Droite : le formulaire ────────────────────────────────────── */}
          <div className="flex flex-col justify-center bg-white p-8 sm:p-12">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-slate-800">Connexion</h2>
              <p className="mt-1 text-sm text-slate-500">
                Identifiez-vous avec vos identifiants Santeplus
              </p>
            </div>

            {notice && (
              <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
                {notice}
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
              className="space-y-4"
              noValidate
            >
              <div>
                <div className="relative">
                  <input
                    id="mail"
                    type="text"
                    placeholder="Identifiant"
                    autoComplete="username"
                    value={mail}
                    onChange={(e) => setMail(e.target.value)}
                    className={inputCls}
                  />
                  <Mail
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <input
                    id="pass"
                    type={showPass ? "text" : "password"}
                    placeholder="Mot de passe"
                    autoComplete="current-password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    className={cn(inputCls, "pr-12")}
                  />
                  <Lock
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={
                      showPass ? "Masquer le mot de passe" : "Afficher le mot de passe"
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center pt-1">
                <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={retenir}
                    onChange={(e) => setRetenir(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-cyan-600"
                  />
                  Se souvenir de moi
                </label>
              </div>

              <button
                type="submit"
                disabled={busy || !mail || !pass}
                className="mt-2 h-12 w-full rounded-xl text-sm font-semibold text-white
                  transition-all hover:opacity-90 active:scale-[0.98]
                  disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: "var(--gradient-brand)" }}
              >
                {busy ? "Connexion en cours..." : "Se Connecter"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Une session Système choisit rôle ET service sur un seul écran : pour
          elle, les deux ne font qu'une décision — à quel bureau suis-je
          aujourd'hui. */}
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
