"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowLeftRight, Boxes, Coins, Loader2, PlusSquare,
  Recycle, ScanLine, Wrench,
} from "lucide-react";
import { Banner } from "@/components/ui/Form";
import ServiceCard from "@/components/ui/ServiceCard";
import AccessPending from "@/components/ui/AccessPending";
import DashboardHeader from "@/components/modules/dashboard/DashboardHeader";
import { useAccess } from "@/lib/auth/AccessProvider";
import { useRequireAccess } from "@/lib/auth/useRequireAccess";
import { ACCESS } from "@/lib/access";
import { getArticleStats } from "@/services/inv/articles";
import type { ArticleStats } from "@/types/inv/article";

/**
 * Une valeur de parc assez courte pour une carte large d'un quart de rangée.
 *
 * La notation compacte d'`Intl` n'est pas utilisable : elle rend
 * 1 534 431 251 637 en « 1,5 Bn » même en fr-FR — une abréviation anglaise dans
 * une interface française. Les seuils et les suffixes sont donc écrits.
 */
function montantCompact(n: number): string {
  const abs = Math.abs(n);
  const f = (v: number, s: string) =>
    `${v.toLocaleString("fr-DZ", { maximumFractionDigits: 1 })} ${s}`;
  if (abs >= 1e9) return f(n / 1e9, "Md");
  if (abs >= 1e6) return f(n / 1e6, "M");
  if (abs >= 1e3) return f(n / 1e3, "k");
  return n.toLocaleString("fr-DZ", { maximumFractionDigits: 0 });
}

/**
 * Accueil — la mise en page du magasin, groupe pour groupe.
 *
 * DEUX groupes de quatre, parce que les chiffres répondent à deux questions
 * différentes et que les mélanger ne rend lisible ni l'une ni l'autre :
 *
 *   LE PARC   — ce qui existe et dans quel état. C'est le registre.
 *   À TRAITER — ce qui a bougé ou attend un geste. Les teintes y retombent au
 *               gris quand il n'y a rien à faire, pour qu'un parc à jour n'ait
 *               pas l'air d'appeler à l'aide.
 *
 * ── PAS DE GROUPE « RÉFÉRENTIEL » ───────────────────────────────────────────
 * Il a existé, et il comptait les catégories, les familles, les sous-familles
 * et les services. C'est-à-dire exactement ce que comptait le tableau de bord
 * du legacy (`dinventaire.php` et ses neuf COUNT(*)) : la CONFIGURATION. Ces
 * nombres ne bougent pas, on n'agit pas dessus, et leur seule destination était
 * l'écran Configuration — qui les affiche déjà, à sa place. Une rangée entière
 * de liens vers un autre écran n'est pas un tableau de bord.
 *
 * Chaque tuile est un lien vers la liste déjà filtrée sur ce qu'elle compte :
 * un nombre sur lequel on ne peut pas cliquer est un nombre qu'il faut aller
 * retrouver à la main.
 *
 * Tous les chiffres sont calculés sous le périmètre de la session, donc les
 * tuiles et le registre ne peuvent jamais se contredire.
 */
export default function DashboardPage() {
  const { allowed, loading } = useRequireAccess(ACCESS.DASHBOARD_VOIR);
  const { user, can } = useAccess();
  const [stats, setStats] = useState<ArticleStats | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!allowed || !can(ACCESS.ARTICLES_VOIR)) { setChargement(false); return; }
    let vivant = true;
    void getArticleStats()
      .then((d) => { if (vivant) setStats(d); })
      .catch((e: unknown) => {
        if (vivant) {
          setErreur(e instanceof Error ? e.message : "Indicateurs indisponibles.");
        }
      })
      .finally(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
  }, [allowed, can]);

  if (loading || !allowed) return <AccessPending />;

  const enService = Math.max(
    0,
    stats ? stats.total - stats.a_reformer - stats.hors_service : 0,
  );
  const valeur = Number(stats?.valeur_totale ?? 0);
  // Les biens réformés, pris sur le statut et NON sur le journal des
  // mouvements : ce dernier compte une ligne par décision (une réforme reprise
  // puis re-prononcée en ferait deux), alors que la carte annonce un nombre de
  // BIENS actuellement sortis du parc.
  const reformes = Number(
    stats?.par_statut.find((x) => x.code === "reforme")?.n ?? 0,
  );

  return (
    <div className="space-y-5">
      <DashboardHeader user={user ?? null} stats={stats} />

      {erreur && (
        <Banner type="error">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle size={14} />
            {erreur}
          </span>
        </Banner>
      )}

      {chargement && !stats && (
        <div className="flex items-center justify-center rounded-2xl bg-white py-12 text-sm text-slate-500 shadow-sm">
          <Loader2 size={16} className="mr-2 animate-spin" />
          Chargement des indicateurs…
        </div>
      )}

      {stats && (
        <>
          {/* ── 1. Le parc ─────────────────────────────────────────────── */}
          <Groupe titre="Le parc" accent="parc">
            <ServiceCard
              icon={Boxes}
              {...TONES.blue}
              mainValue={stats.total}
              title="Articles"
              subText="Dans votre périmètre"
              href="/articles"
            />
            <ServiceCard
              icon={Boxes}
              {...TONES.emerald}
              mainValue={enService}
              title="En service"
              subText="Ni réformés ni en panne"
              href="/articles?statut=en_service"
            />
            <ServiceCard
              icon={Wrench}
              {...(stats.hors_service > 0 ? TONES.red : TONES.slate)}
              mainValue={stats.hors_service}
              title="Hors service"
              subText="En panne ou en maintenance"
              href="/articles?etat=en_panne"
            />
            {/* La valorisation est VIDE sur le parc repris : l'ancienne
                plateforme ne saisissait aucun montant. La carte le dit plutôt
                que d'afficher « 0 DA » comme si c'était un résultat. */}
            <ServiceCard
              icon={Coins}
              {...(valeur > 0 ? TONES.violet : TONES.slate)}
              mainValue={valeur > 0 ? montantCompact(valeur) : "—"}
              title="Valeur du parc (DA)"
              subText={valeur > 0 ? "Somme des valeurs saisies" : "Aucun montant saisi"}
            />
          </Groupe>

          {/* ── 2. À traiter ───────────────────────────────────────────── */}
          <Groupe titre="À traiter" accent="traiter">
            {/* UNE carte de réforme, et elle compte les biens RÉFORMÉS — ceux
                qui sont sortis du parc. Il y en avait deux, « à instruire » et
                « prononcées », qui séparaient une file d'attente d'un total
                cumulé : deux grandeurs différentes sous le même mot, côte à
                côte. Ce qu'on vient voir ici, c'est combien de biens sont
                sortis ; la file d'attente se lit dans le bandeau, en haut. */}
            <ServiceCard
              icon={Recycle}
              {...(reformes > 0 ? TONES.amber : TONES.slate)}
              mainValue={reformes}
              title="Réformes"
              subText="Biens sortis du parc"
              href="/reformes"
            />
            <ServiceCard
              icon={ScanLine}
              {...(stats.presence_non_verifiee > 0 ? TONES.orange : TONES.slate)}
              mainValue={stats.presence_non_verifiee}
              title="Présence à vérifier"
              subText="Jamais confirmés physiquement"
              href="/articles?presence=non_verifie"
            />
            <ServiceCard
              icon={ArrowLeftRight}
              {...TONES.indigo}
              mainValue={stats.mouvements.transferts}
              title="Transferts"
              subText="Déplacements enregistrés"
              href="/transferts"
            />
            <ServiceCard
              icon={PlusSquare}
              {...TONES.emerald}
              mainValue={stats.mouvements.creations}
              title="Créations"
              subText="Biens entrés au registre"
              href="/articles"
            />
          </Groupe>

          {/* ── La forme réelle du registre ────────────────────────────── */}
          {stats.par_categorie.length > 0 && (
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-[14px] font-semibold text-slate-800">
                Répartition par catégorie
              </h2>
              <ul className="list-none space-y-2.5 p-0">
                {stats.par_categorie.map((c) => {
                  const n = Number(c.n);
                  const pct = stats.total > 0 ? (n / stats.total) * 100 : 0;
                  return (
                    <li key={c.libelle ?? "—"}>
                      <Link
                        href="/articles"
                        className="group flex items-center gap-3 text-[12.5px] no-underline"
                      >
                        <span className="w-[140px] shrink-0 truncate text-slate-600 group-hover:text-slate-900 sm:w-[210px]">
                          {c.libelle ?? "Sans catégorie"}
                        </span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          {/* Une seule teinte : ces barres mesurent LA MÊME
                              grandeur pour des catégories différentes. Les
                              colorer une à une inviterait à y lire un sens
                              qu'elles n'ont pas. */}
                          <span
                            className="block h-full rounded-full bg-cyan-500"
                            style={{ width: `${Math.max(pct, 1)}%` }}
                          />
                        </span>
                        <span className="w-[60px] shrink-0 text-right font-medium tabular-nums text-slate-700 sm:w-[70px]">
                          {n.toLocaleString("fr-DZ")}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ── Les briques ────────────────────────────────────────────────────────────

// La palette de la DEP, valeur pour valeur (chum-dep-frontend ServiceGrid.tsx).
//
// Un lavis à 12 % d'alpha de la PROPRE couleur de l'icône derrière un glyphe
// saturé, et une nuance plus sombre pour le chiffre. Et non un aplat plein avec
// une icône blanche : c'est ce qui faisait lire cinq tuiles d'affilée comme un
// bandeau d'alerte. Le lavis garde la teinte lisible comme une catégorie tout
// en laissant le nombre être ce qu'il y a de plus fort sur la carte.
const TONES = {
  blue:    { iconBg: "rgba(59,130,246,0.12)",  iconColor: "#3b82f6", valueColor: "#1d4ed8" },
  emerald: { iconBg: "rgba(16,185,129,0.12)",  iconColor: "#10b981", valueColor: "#059669" },
  cyan:    { iconBg: "rgba(6,182,212,0.12)",   iconColor: "#06b6d4", valueColor: "#0891b2" },
  amber:   { iconBg: "rgba(245,158,11,0.12)",  iconColor: "#f59e0b", valueColor: "#d97706" },
  orange:  { iconBg: "rgba(249,115,22,0.12)",  iconColor: "#f97316", valueColor: "#ea580c" },
  indigo:  { iconBg: "rgba(99,102,241,0.12)",  iconColor: "#6366f1", valueColor: "#4f46e5" },
  red:     { iconBg: "rgba(239,68,68,0.12)",   iconColor: "#ef4444", valueColor: "#dc2626" },
  violet:  { iconBg: "rgba(139,92,246,0.12)",  iconColor: "#8b5cf6", valueColor: "#7c3aed" },
  slate:   { iconBg: "rgba(100,116,139,0.12)", iconColor: "#64748b", valueColor: "#475569" },
} as const;

/** Le filet d'accent devant le libellé d'un groupe, de la même famille. */
const ACCENTS = {
  parc: "#06b6d4",
  traiter: "#f59e0b",
} as const;

function Groupe({
  titre, accent, children,
}: {
  titre: string;
  accent: keyof typeof ACCENTS;
  children: React.ReactNode;
}) {
  return (
    <section>
      {/* Filet d'accent + petit libellé capitales, comme sur la DEP. Le libellé
          seul se perdait contre la page ; le filet donne à chaque groupe une
          couleur sur laquelle l'œil peut revenir. */}
      <div className="mb-2.5 flex items-center gap-2 px-0.5">
        <span
          className="h-3.5 w-[3px] shrink-0 rounded-full"
          style={{ backgroundColor: ACCENTS[accent] }}
          aria-hidden
        />
        <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
          {titre}
        </h2>
      </div>
      {/* QUATRE de front sur un écran large, donc chaque groupe fait exactement
          une rangée — ils comptent tous quatre cartes. La grille descend d'une
          colonne à la fois plutôt que de sauter : une carte a besoin d'environ
          200 px pour que son chiffre reste lisible. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {children}
      </div>
    </section>
  );
}
