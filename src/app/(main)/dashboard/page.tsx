"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Boxes, Building2, Home, Recycle, ScanLine, ShieldCheck, Wrench,
} from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import AccessPending from "@/components/ui/AccessPending";
import { useAccess } from "@/lib/auth/AccessProvider";
import { useRequireAccess } from "@/lib/auth/useRequireAccess";
import { ACCESS } from "@/lib/access";
import { getArticleStats } from "@/services/inv/articles";
import type { ArticleStats } from "@/types/inv/article";

/**
 * Tableau de bord.
 *
 * Deliberately NOT the legacy dashboard. `dinventaire.php` opens with nine
 * COUNT(*) tiles — categories, families, sub-families, bureaux, suppliers,
 * manufacturers — which counts the CONFIGURATION rather than the inventory and
 * tells nobody anything about their day.
 *
 * These count things somebody has to act on, and every tile is a link into the
 * register already filtered to what it counted. A number you cannot click is a
 * number you have to go and re-find by hand.
 *
 * Every figure is computed under the session's own service scope, so a ward
 * sees its ward — the tiles and the register can never disagree.
 */
export default function DashboardPage() {
  const { allowed, loading } = useRequireAccess(ACCESS.DASHBOARD_VOIR);
  const { user, role, can } = useAccess();
  const [stats, setStats] = useState<ArticleStats | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed || !can(ACCESS.ARTICLES_VOIR)) return;
    void getArticleStats()
      .then(setStats)
      .catch((e: unknown) =>
        setErreur(e instanceof Error ? e.message : "Statistiques indisponibles."),
      );
  }, [allowed, can]);

  if (loading || !allowed) return <AccessPending />;

  const nf = (n: number) => n.toLocaleString("fr-FR");

  return (
    <div className="space-y-4">
      <PageHero
        title={`Bonjour ${user?.prenom ?? ""}`}
        icon={Home}
      />

      {erreur && (
        <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {erreur}
        </div>
      )}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tuile
            href="/articles"
            icon={<Boxes size={18} />}
            label="Articles"
            valeur={nf(stats.total)}
            note="dans votre périmètre"
            couleur="#0891b2"
          />
          <Tuile
            href="/articles?etat=en_panne"
            icon={<Wrench size={18} />}
            label="Hors service"
            valeur={nf(stats.hors_service)}
            note="en panne ou en maintenance"
            couleur="#ef4444"
          />
          <Tuile
            href="/articles?statut=propose_reforme"
            icon={<Recycle size={18} />}
            label="Proposés à la réforme"
            valeur={nf(stats.a_reformer)}
            note="en attente de PV"
            couleur="#f59e0b"
          />
          <Tuile
            href="/articles?presence=non_verifie"
            icon={<ScanLine size={18} />}
            label="Présence à vérifier"
            valeur={nf(stats.presence_non_verifiee)}
            note="jamais confirmés physiquement"
            couleur="#64748b"
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Breakdown by category — the register's real shape. */}
        {stats && stats.par_categorie.length > 0 && (
          <section className="rounded-2xl bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-4 text-[14px] font-semibold text-slate-800">
              Répartition par catégorie
            </h2>
            <ul className="space-y-2.5">
              {stats.par_categorie.map((c) => {
                const n = Number(c.n);
                const pct = stats.total > 0 ? (n / stats.total) * 100 : 0;
                return (
                  <li key={c.libelle ?? "—"}>
                    <Link
                      href="/articles"
                      className="group flex items-center gap-3 text-[12.5px] no-underline"
                    >
                      <span className="w-[210px] shrink-0 truncate text-slate-600 group-hover:text-slate-900">
                        {c.libelle ?? "Sans catégorie"}
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <span
                          className="block h-full rounded-full bg-cyan-500"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </span>
                      <span className="w-[70px] shrink-0 text-right font-medium text-slate-700">
                        {nf(n)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* The session's own context — genuinely useful during the rollout:
            "why can't I see the réforme menu" is answered here rather than by
            a support call. */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-[14px] font-semibold text-slate-800">Votre session</h2>
          <dl className="space-y-3 text-[13px]">
            <Info
              icon={<ShieldCheck size={14} />}
              label="Rôle"
              value={role?.lib_role ?? (user?.est_systeme ? "Système" : "Aucun")}
              note={
                role
                  ? role.portee === "tous_services"
                    ? "tout l'établissement"
                    : "services assignés"
                  : user?.est_systeme
                    ? "tous les accès"
                    : "aucun rôle attribué"
              }
            />
            <Info
              icon={<Building2 size={14} />}
              label="Localisations"
              value={stats ? nf(stats.localisations) : "—"}
              note="emplacements actifs"
            />
            <Info
              icon={<Boxes size={18} />}
              label="Accès"
              value={String(user?.acces.length ?? 0)}
              note={
                can(ACCESS.ARTICLES_CREER)
                  ? "création d'articles autorisée"
                  : "consultation seule"
              }
            />
          </dl>
        </section>
      </div>
    </div>
  );
}

function Tuile({
  href, icon, label, valeur, note, couleur,
}: {
  href: string; icon: React.ReactNode; label: string;
  valeur: string; note: string; couleur: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl bg-white p-5 no-underline shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-2" style={{ color: couleur }}>
        {icon}
        <span className="text-[11.5px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-[26px] font-bold leading-none text-slate-800">{valeur}</p>
      <p className="mt-1.5 text-[11.5px] text-slate-500">{note}</p>
    </Link>
  );
}

function Info({
  icon, label, value, note,
}: { icon: React.ReactNode; label: string; value: string; note?: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-slate-500">{label}</dt>
        <dd className="truncate font-medium text-slate-800">{value}</dd>
        {note && <p className="text-[11px] text-slate-400">{note}</p>}
      </div>
    </div>
  );
}
