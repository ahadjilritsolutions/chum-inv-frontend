"use client";

import {
  ArrowLeftRight, BarChart3, Boxes, Home, Power, Printer, Recycle, Settings,
  HelpCircle, type LucideIcon,
} from "lucide-react";
import { ACCESS, type AccessCode } from "@/lib/access";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  /** Access required to see this entry. Absent = any signed-in session. */
  access?: AccessCode;
  children?: NavItem[];
}

/**
 * Sidebar icon-chip palette — the exact one the DEP, LIS and magasin use.
 * Pastel foreground on a 14%-alpha wash of itself, which keeps the chips
 * legible on the dark gradient without any of them shouting.
 */
const palette = {
  white:  { iconColor: "#ffffff", iconBg: "rgba(255,255,255,0.14)" },
  green:  { iconColor: "#86efac", iconBg: "rgba(134,239,172,0.14)" },
  purple: { iconColor: "#a5b4fc", iconBg: "rgba(165,180,252,0.14)" },
  red:    { iconColor: "#fca5a5", iconBg: "rgba(252,165,165,0.14)" },
  slate:  { iconColor: "#cbd5e1", iconBg: "rgba(203,213,225,0.14)" },
  amber:  { iconColor: "#fcd34d", iconBg: "rgba(252,211,77,0.14)" },
  violet: { iconColor: "#c4b5fd", iconBg: "rgba(196,181,253,0.14)" },
  cyan:   { iconColor: "#67e8f9", iconBg: "rgba(103,232,249,0.14)" },
} as const;

/**
 * La navigation — quatre entrées, et RIEN qui ne mène nulle part.
 *
 * Les écrans « en cours de construction » ont été retirés : une entrée de menu
 * qui ouvre une page vide coûte plus qu'elle ne promet, et elle apprend à
 * l'utilisateur à ne pas cliquer.
 *
 * Il n'y a PLUS d'entrée par statut d'article. Les sept écrans du legacy
 * (`lmobilier`, `lmobilierp`, `lmobilierr`, `lpmobilier`, `lrmobilier`,
 * `ltmobilier`, `ldmobilier`) ne différaient que par un `WHERE` ; les rejouer
 * dans la barre latérale aurait reproduit le défaut plutôt que la fonction.
 * Le statut est un FILTRE dans la page Articles.
 *
 * Configuration est arrivée : les rôles et leurs accès s'y règlent sans
 * redéploiement. Reviendront ensuite, quand ils existeront vraiment :
 * Administration, Interventions, Rapports, Personnel et Messagerie.
 */
export const navItems: readonly NavItem[] = [
  { label: "Accueil", href: "/dashboard", icon: Home, ...palette.white, access: ACCESS.DASHBOARD_VOIR },
  { label: "Articles", href: "/articles", icon: Boxes, ...palette.green, access: ACCESS.ARTICLES_VOIR },
  { label: "Transferts", href: "/transferts", icon: ArrowLeftRight, ...palette.purple, access: ACCESS.MOUVEMENTS_VOIR },
  { label: "Réformes", href: "/reformes", icon: Recycle, ...palette.red, access: ACCESS.REFORME_VOIR },
  // Gardée par config.roles.voir et non par config.voir : l'entrée ne doit
  // apparaître que pour qui peut réellement en faire quelque chose, et le seul
  // écran derrière elle aujourd'hui est celui des rôles.
  { label: "Impressions", href: "/impression", icon: Printer, ...palette.violet, access: ACCESS.IMPRESSION_VOIR },
  { label: "Statistiques", href: "/statistiques", icon: BarChart3, ...palette.cyan, access: ACCESS.STATISTIQUES_VOIR },
  // Gardée par config.structure.voir et non config.roles.voir : la page s'ouvre
  // dès qu'UN de ses onglets est permis, et régler le catalogue ou les locaux
  // n'oblige pas à régler les rôles.
  {
    label: "Configuration", href: "/configuration", icon: Settings,
    // Le droit le plus large des quatre onglets : la page s''ouvre dès qu''un
    // seul est permis, et gérer les comptes n''oblige pas à gérer les locaux.
    ...palette.amber, access: ACCESS.CONFIG_COMPTES_VOIR,
  },
];

/**
 * The rail as one session sees it.
 *
 * `can` comes from useAccess. A System user acting as someone else keeps
 * `admin.voir` (see ADMIN_ALWAYS in the backend access service), so the way
 * back is never hidden from them.
 */
export function visibleNavItems(
  can: (...codes: AccessCode[]) => boolean,
): NavItem[] {
  return navItems.filter((i) => i.access === undefined || can(i.access));
}

/** External help portal, pinned above the logout row (as in the DEP). */
export const aideFaqNavItem = {
  label: "Aide et FAQ",
  href: process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://192.168.254.10",
  icon: HelpCircle,
  ...palette.slate,
};

export const logoutNavItem = {
  label: "Déconnexion",
  icon: Power,
  ...palette.red,
};
