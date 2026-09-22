"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Layers, Maximize, Menu, MessageSquare, UserCog } from "lucide-react";
import {
  clearAuthSession,
  isMultiServiceSession,
  scopeLabel,
} from "@/lib/auth/auth-client";
import { logout } from "@/services/auth/auth";
import { getContextOptions } from "@/services/context/context";
import ContextSwitcherModal from "@/components/modules/context/ContextSwitcherModal";
import { isRealSystem } from "@/lib/roles";
import { useAccess } from "@/lib/auth/AccessProvider";
import { ACCESS } from "@/lib/access";
import type { AuthUser } from "@/types/auth/auth";

interface NavbarProps {
  user: AuthUser;
  onToggleSidebar?: () => void;
}

/**
 * Fixed top bar — the DEP frontend's navbar, with this app's identity strip.
 *
 * ── CE QUE LA BARRE N'AFFICHE PLUS, ET POURQUOI ─────────────────────────────
 *
 * Elle montrait le SERVICE SANTEPLUS du compte (« LABORATOIRE BIOCHIMIE ») à
 * côté d'un périmètre « Tous les services ». Les deux étaient faux ou inutiles
 * ici :
 *
 *   • Le service santeplus dit dans quel service la personne est EMPLOYÉE. Il
 *     ne dit rien sur ce qu'elle voit dans l'inventaire — le service d'un bien
 *     est une propriété de l'ENDROIT où il se tient, pas de celui qui regarde.
 *     Un agent du laboratoire de biochimie affecté au bureau d'inventaire
 *     travaille sur tout l'établissement ; afficher « LABORATOIRE BIOCHIMIE »
 *     laissait croire le contraire.
 *   • « Tous les services », c'est-à-dire tout : une étiquette qui ne
 *     distingue rien n'informe pas.
 *
 * À la place, la barre nomme le SERVICE QUI TIENT LE REGISTRE. C'est la même
 * réponse pour tout le monde, et c'est la bonne : on est dans l'application du
 * bureau des inventaires.
 *
 * Le périmètre ne réapparaît QUE lorsqu'il restreint réellement — un rôle en
 * portée « propres services » ne voit qu'une partie du parc, et le lui cacher
 * transformerait un registre incomplet en registre qui semble complet.
 */
export default function Navbar({ user, onToggleSidebar }: NavbarProps) {
  const router = useRouter();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // `admin` decides WHICH switcher this is — role + service, or service alone.
  // That is a question about identity, not permission, so it reads the REAL
  // role: an administrator acting as a technician must keep the way back.
  const admin = isRealSystem(user);
  const { can } = useAccess();
  const maySwitch = can(ACCESS.COMPTE_CHANGER_CONTEXTE);

  // For a non-admin, whether there is anything to switch BETWEEN is something
  // only the server knows (it reads inv_user_service). So we ask once, and
  // show nothing until it answers rather than flashing a button that may not
  // apply.
  const [userCanSwitch, setUserCanSwitch] = useState(false);
  useEffect(() => {
    if (admin || !maySwitch) return;
    let cancelled = false;
    void getContextOptions()
      .then((opts) => {
        if (!cancelled) setUserCanSwitch(opts.services.length > 1);
      })
      .catch(() => {
        /* Leave the button hidden — it is a convenience, not a necessity. */
      });
    return () => {
      cancelled = true;
    };
  }, [admin, maySwitch]);

  // Both must hold: the access says they may switch at all, and for a normal
  // user the server says there is more than one service to switch between.
  const canSwitchContext = maySwitch && (admin || userCanSwitch);
  const switcherTitle = admin
    ? "Changer de rôle ou de service"
    : "Changer de service";

  const initials =
    ((user.prenom?.[0] ?? "") + (user.nom?.[0] ?? "")).toUpperCase() || "?";

  async function handleLogout() {
    // End it on the server FIRST: the local wipe only hides the token, while
    // the session row is what keeps the user "connected" for everyone else.
    await logout();
    clearAuthSession();
    router.replace("/login");
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }

  // A perimeter wider than one service is flagged in amber because it is the
  // broader, less usual case — a single service reads as green, the same way
  // the DEP marks an active box.
  const wideScope =
    user.est_systeme ||
    user.role_inv?.portee === "tous_services" ||
    isMultiServiceSession(user);

  return (
    <header className="fixed top-0 left-0 right-0 h-[57px] z-[1040] flex items-center justify-between px-3 sm:px-4 gap-2 sm:gap-3 [background:var(--gradient-brand)] shadow-md">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        {/* Hamburger — mobile only */}
        <button
          type="button"
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors border-0 bg-transparent shrink-0"
          onClick={onToggleSidebar}
          aria-label="Menu"
        >
          <Menu size={20} />
        </button>

        <span className="hidden sm:inline text-white font-bold text-[14px] sm:text-[15px] tracking-wide whitespace-nowrap">
          CHU Mustapha — Inventaire
        </span>

        <span className="text-white/30 font-light text-lg leading-none hidden sm:inline">
          |
        </span>
        <span className="hidden truncate text-sm font-medium text-white/80 sm:block">
          Bureau des inventaires
        </span>

        {/* Le périmètre ne s'affiche que s'il RESTREINT. Pour une session qui
            voit tout, « Tous les services » ne distingue rien ; pour une session
            limitée, c'est au contraire l'information la plus importante de la
            page — elle explique pourquoi le registre paraît court. */}
        {!wideScope && (
          <>
            <span className="text-white/30 font-light text-lg leading-none hidden sm:inline">
              |
            </span>
            <span
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap text-green-300"
              title="Votre session ne voit que ce périmètre"
            >
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {scopeLabel(user)}
            </span>
          </>
        )}

        {/* The acted-as role, named. An administrator standing in for someone
            else must be able to see that at a glance — otherwise a screen that
            is missing a button reads as a bug rather than as the role's
            actual limits. */}
        {admin && user.role_inv && (
          <>
            <span className="text-white/30 font-light text-lg leading-none hidden md:inline shrink-0">
              |
            </span>
            {/* min-w-0 + truncate, not whitespace-nowrap: a long role name next
                to a long service name overflowed the left group and slid under
                the action buttons on the right. The chip is the least important
                of the three, so it is the one that gives way. */}
            <span
              className="hidden md:block min-w-0 max-w-[170px] truncate rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/90"
              title={`Vous agissez sous le rôle « ${user.role_inv.lib_role} »`}
            >
              {user.role_inv.lib_role}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Change of desk, FIRST — the same position the DEP and LIS navbars
            put their switcher, so the three applications read alike.

            The icon distinguishes the two audiences: UserCog is the DEP's
            "changer de profil" (role + service), Layers is a plain change of
            service, so an administrator and an ordinary user never mistake one
            button for the other. */}
        {canSwitchContext && (
          <IconBtn
            aria-label={admin ? "Changer de profil" : "Changer de service"}
            title={switcherTitle}
            onClick={() => setSwitcherOpen(true)}
          >
            {admin ? <UserCog size={17} /> : <Layers size={17} />}
          </IconBtn>
        )}

        {/* Messagerie sits next to the bell — the two notification surfaces
            belong together, as in the DEP. No unread badge yet: the count
            comes from chum-comun-backend, which is not deployed on the test
            VM, and a permanently-zero badge is worse than none. */}
        <Link
          href="/messages"
          aria-label="Messagerie"
          title="Messagerie"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <MessageSquare size={17} />
        </Link>

        <IconBtn
          aria-label="Notifications"
          disabled
          title="Notifications — bientôt disponible"
        >
          <Bell size={17} />
        </IconBtn>

        {/* Fullscreen — hidden on touch devices */}
        <span className="hidden md:contents">
          <IconBtn aria-label="Plein écran" onClick={toggleFullscreen}>
            <Maximize size={17} />
          </IconBtn>
        </span>

        <IconBtn
          aria-label="Déconnexion"
          onClick={handleLogout}
          className="!text-red-400 hover:!text-red-300"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
            <line x1="12" y1="2" x2="12" y2="12" />
          </svg>
        </IconBtn>

        <div className="w-px h-5 bg-white/20 mx-1 hidden sm:block" />

        {/* The name in the top bar IS the way into "Mon compte" — the same
            affordance the DEP and LIS navbars carry, so the habit transfers. */}
        <Link
          href="/mon-compte"
          title="Mon compte"
          className="flex items-center gap-2 text-white pl-1 pr-1.5 py-0.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer no-underline"
        >
          <span className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-bold text-xs shrink-0">
            {initials}
          </span>
          <span className="text-sm font-medium whitespace-nowrap hidden md:block">
            {user.prenom} {user.nom}
          </span>
        </Link>
      </div>

      <ContextSwitcherModal
        open={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
      />
    </header>
  );
}

/** Navbar icon button — identical metrics to the DEP navbar's. */
function IconBtn({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={[
        "w-8 h-8 flex items-center justify-center rounded-lg",
        "text-white/75 hover:text-white hover:bg-white/10",
        "transition-colors cursor-pointer border-0 bg-transparent",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

export { IconBtn };
