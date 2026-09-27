"use client";

import { Recycle, ScanLine, type LucideIcon } from "lucide-react";
import { GRADIENT_BRAND } from "@/lib/inv/theme";
import type { AuthUser } from "@/types/auth/auth";
import type { ArticleStats } from "@/types/inv/article";

/**
 * Le bandeau du tableau de bord — celui du magasin, élément pour élément.
 *
 * Il nomme le PÉRIMÈTRE, pas le module : sur le magasin c'est le magasin de
 * travail, ici c'est l'étendue du registre qu'on tient. Un bandeau qui dirait
 * « Inventaire » serait vrai de toutes les sessions et n'apprendrait rien.
 *
 * Les deux pastilles sont l'ACTUEL — ce sur quoi il faut agir aujourd'hui — et
 * non une redite des cartes en dessous. D'où la réforme en attente et la
 * présence non vérifiée : les deux seules files d'attente de la plateforme.
 */
export default function DashboardHeader({
  user, stats,
}: {
  user: AuthUser | null;
  stats: ArticleStats | null;
}) {
  const initiales =
    ((user?.prenom?.[0] ?? "") + (user?.nom?.[0] ?? "")).toUpperCase() || "?";

  // Le service QUI TIENT LE REGISTRE, et non l'étendue de ce qu'on voit.
  //
  // « Tout l'établissement » décrivait une portée — vrai, mais ce n'est pas une
  // identité : on ne travaille pas « dans tout l'établissement », on travaille
  // au bureau des inventaires, qui tient le registre de tout l'établissement.
  // Même correction que dans la barre du haut, pour la même raison.
  //
  // Une session restreinte garde le nom de SON service : là, le périmètre EST
  // l'identité, et le taire ferait passer un registre partiel pour complet.
  const portee =
    user?.est_systeme || user?.role_inv?.portee === "tous_services"
      ? "Bureau des inventaires"
      : user?.lib_service ?? "Votre périmètre";

  return (
    <header
      className="relative overflow-hidden rounded-2xl px-4 py-4 sm:px-6 sm:py-5"
      style={{ background: GRADIENT_BRAND }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* ── Identité ──────────────────────────────────────────────────── */}
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/55">
            Tableau de bord
          </p>
          <h1 className="mt-0.5 truncate text-[20px] font-bold leading-tight text-white sm:text-[24px]">
            {portee}
          </h1>
          <p className="mt-0.5 text-[12.5px] text-white/65 sm:text-[13.5px]">
            {dateDuJour()}
            {stats ? ` · ${stats.localisations.toLocaleString("fr-DZ")} localisations` : ""}
          </p>
        </div>

        {/* ── L'actuel ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <Chip
            icon={Recycle}
            valeur={stats ? stats.a_reformer : null}
            libelle="À instruire"
            // Le seul chiffre du bandeau qui soit un PROBLÈME et non un fait :
            // une demande de réforme attend une décision humaine.
            alerte={!!stats && stats.a_reformer > 0}
          />
          <Chip
            icon={ScanLine}
            valeur={stats ? stats.presence_non_verifiee : null}
            libelle="Présence à vérifier"
          />

          <span className="hidden h-9 w-px bg-white/20 sm:block" aria-hidden />

          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15 text-[12px] font-bold text-white">
              {initiales}
            </span>
            <span className="hidden text-[13.5px] font-semibold text-white sm:inline">
              {user?.prenom} {user?.nom}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

/** Une statistique du bandeau : le chiffre au-dessus de son libellé. */
function Chip({
  icon: Icon, valeur, libelle, alerte,
}: {
  icon: LucideIcon;
  /** null pendant le chargement — la tuile garde sa taille, le bandeau ne saute pas. */
  valeur: number | null;
  libelle: string;
  alerte?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center gap-2.5 rounded-xl border px-3 py-2",
        alerte ? "border-amber-300/40 bg-amber-400/20" : "border-white/25 bg-white/10",
      ].join(" ")}
      title={libelle}
    >
      <Icon
        size={17}
        className={alerte ? "shrink-0 text-amber-200" : "shrink-0 text-cyan-200"}
      />
      <div className="min-w-0 text-center">
        <div className="text-[17px] font-bold leading-none tabular-nums text-white">
          {valeur === null ? "—" : valeur.toLocaleString("fr-DZ")}
        </div>
        <div className="mt-0.5 whitespace-nowrap text-[10.5px] text-white/60">
          {libelle}
        </div>
      </div>
    </div>
  );
}

/**
 * « Mercredi 23 Septembre 2026 ».
 *
 * La date du LECTEUR, prise de son navigateur — cette ligne répond à « quel
 * jour sommes-nous pour moi », pas à « quel jour croit-on être sur le serveur ».
 * Intl rend le français en minuscules ; le jour et le mois sont donc remis en
 * capitale pour s'aligner sur le bandeau de la DEP.
 */
function dateDuJour(): string {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(new Date());

  return parts
    .map((p) =>
      p.type === "weekday" || p.type === "month"
        ? p.value.charAt(0).toUpperCase() + p.value.slice(1)
        : p.value,
    )
    .join("");
}
