"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, BarChart3, Boxes, Building2, DoorOpen, Loader2, Wallet,
} from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import { Banner } from "@/components/ui/Form";
import AccessPending from "@/components/ui/AccessPending";
import {
  Barres, Carte, SerieMensuelle, Tuile,
} from "@/components/modules/statistiques/Graphiques";
import { useRequireAccess } from "@/lib/auth/useRequireAccess";
import { ACCESS } from "@/lib/access";
import { getStatistiques, type Statistiques } from "@/services/inv/statistiques";

/**
 * STATISTIQUES — ce que le parc dit de lui-même.
 *
 * Quatre familles de chiffres, dans l'ordre où elles servent :
 *
 *   ① COMBIEN ET COMBIEN ÇA VAUT — la direction.
 *   ② CE QUI CLOCHE — tout le monde, et c'est le plus utile de la page. Un
 *      article sans localisation ou dont la présence n'a jamais été confirmée
 *      n'est pas une statistique : c'est du travail à faire. Ce bloc est placé
 *      HAUT, avant les jolies répartitions, parce que c'est lui qu'on doit voir.
 *      Le legacy n'avait aucun écran pour ces trous, donc personne ne les
 *      voyait.
 *   ③ COMMENT ÇA SE RÉPARTIT — état, statut, catégorie, service.
 *   ④ CE QUI BOUGE — transferts et réformes sur douze mois.
 *
 * Tout est calculé SOUS LE PÉRIMÈTRE de la session. Un chiffre global affiché à
 * côté d'un tableau restreint serait pire qu'aucun chiffre : on le croirait.
 *
 * Les MONTANTS n'apparaissent qu'avec `statistiques.valorisation` — et le
 * serveur les retire de la réponse plutôt que de compter sur cet écran pour les
 * cacher. Ce que le navigateur reçoit est divulgué, quoi qu'en fasse le CSS.
 *
 * Mode clair assumé : ni cette application ni ses sœurs (DEP, LIS, magasin) n'ont
 * de thème sombre. Un graphique à demi sombre dans une interface claire serait
 * une incohérence, pas une option.
 */
export default function StatistiquesPage() {
  const { allowed, loading: gating } = useRequireAccess(ACCESS.STATISTIQUES_VOIR);

  const [s, setS] = useState<Statistiques | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    getStatistiques()
      .then(setS)
      .catch((e: unknown) =>
        setErreur(e instanceof Error ? e.message : "Chargement impossible."))
      .finally(() => setChargement(false));
  }, []);

  /** Les mouvements arrivent à plat (mois × type) ; le graphique veut un mois par colonne. */
  const mouvements = useMemo(() => {
    if (!s) return [];
    const index = new Map<string, { mois: string; transfert: number; reforme: number }>();
    for (const m of s.mouvements) {
      const e = index.get(m.mois) ?? { mois: m.mois, transfert: 0, reforme: 0 };
      if (m.type === "transfert") e.transfert += m.n;
      // Une proposition n'est pas encore une réforme, mais elle appartient au
      // même mouvement de fond : on les compte ensemble.
      else if (m.type === "reforme" || m.type === "proposition_reforme") e.reforme += m.n;
      index.set(m.mois, e);
    }
    return [...index.values()].sort((a, b) => a.mois.localeCompare(b.mois));
  }, [s]);

  if (gating || !allowed) return <AccessPending />;

  // Afficher une colonne de montants tous à « 0 DA » à côté de chaque barre
  // n''informe personne : c''est du bruit répété autant de fois qu''il y a de
  // lignes. La colonne ne s''affiche donc que s''il y a RÉELLEMENT des montants —
  // pas seulement le droit de les voir. Le registre migré n''en porte aucun.
  const montantsUtiles = s !== null && s.valorisation && s.totaux.valeur > 0;

  const da = (v: number) =>
    `${Math.round(v).toLocaleString("fr-DZ")} DA`;

  const alertes = s
    ? [
        { l: "Sans localisation", n: s.qualite.sans_localisation },
        { l: "Présence jamais vérifiée", n: s.qualite.presence_non_verifiee },
        { l: "Sans date d'inventaire", n: s.qualite.sans_date_inventaire },
        { l: "Sans catégorie", n: s.qualite.sans_categorie },
        { l: "Sans valeur", n: s.qualite.sans_valeur },
        { l: "Sans n° de série", n: s.qualite.sans_numero_serie },
        { l: "Sans fournisseur", n: s.qualite.sans_fournisseur },
      ]
    : [];

  return (
    <div className="space-y-4">
      <PageHero title="Statistiques" icon={BarChart3} />

      {erreur && <Banner type="error">{erreur}</Banner>}

      {chargement && (
        <p className="py-16 text-center text-slate-400">
          <Loader2 size={22} className="mx-auto animate-spin" />
        </p>
      )}

      {s && (
        <>
          {/* ── ① Les totaux ─────────────────────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tuile
              libelle="Articles au registre"
              valeur={s.totaux.articles.toLocaleString("fr-DZ")}
              icone={<Boxes size={13} />}
            />
            {s.valorisation && (
              <Tuile
                libelle="Valeur du patrimoine"
                valeur={da(s.totaux.valeur)}
                // Un « 0 DA » sans explication se lit comme une panne. Il ne
                // l'est pas : le registre migré ne porte AUCUN montant — le
                // legacy ne les saisissait pas. Le dire vaut mieux que laisser
                // croire que le calcul a échoué.
                detail={
                  s.totaux.valeur > 0
                    ? `moyenne ${da(s.totaux.valeur_moyenne)} par article`
                    : "aucun montant saisi au registre"
                }
                icone={<Wallet size={13} />}
              />
            )}
            <Tuile
              libelle="Localisations occupées"
              valeur={s.totaux.localisations.toLocaleString("fr-DZ")}
              icone={<DoorOpen size={13} />}
            />
            <Tuile
              libelle="Services concernés"
              valeur={s.totaux.services.toLocaleString("fr-DZ")}
              icone={<Building2 size={13} />}
            />
          </div>

          {/* ── ② Ce qui cloche — haut de page, à dessein ────────────────── */}
          <Carte
            titre="Qualité du registre"
            sous_titre="Ce ne sont pas des statistiques : c'est du travail en attente"
          >
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {alertes.map((a) => (
                <div
                  key={a.l}
                  className={
                    "rounded-xl border px-3 py-2.5 " +
                    (a.n > 0 ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50")
                  }
                >
                  <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-slate-600">
                    {/* Icône + libellé : une couleur de statut ne porte jamais
                        le sens toute seule. */}
                    {a.n > 0 && <AlertTriangle size={12} className="shrink-0 text-[#d03b3b]" />}
                    {a.l}
                  </p>
                  <p
                    className={
                      "mt-0.5 text-[19px] font-bold tabular-nums " +
                      (a.n > 0 ? "text-[#d03b3b]" : "text-slate-400")
                    }
                  >
                    {a.n.toLocaleString("fr-DZ")}
                  </p>
                </div>
              ))}
            </div>
          </Carte>

          {/* ── ③ Les répartitions ──────────────────────────────────────── */}
          <div className="grid gap-3 lg:grid-cols-2">
            <Carte titre="Par statut" sous_titre="Où en sont les biens dans leur vie">
              <Barres lignes={s.par_statut} montants={montantsUtiles} />
            </Carte>

            <Carte titre="Par état matériel" sous_titre="Dans quel état ils sont">
              <Barres lignes={s.par_etat} montants={montantsUtiles} />
            </Carte>

            <Carte titre="Par catégorie" sous_titre="De quoi le parc est fait">
              <Barres lignes={s.par_categorie} montants={montantsUtiles} />
            </Carte>

            <Carte titre="Par service" sous_titre="Les vingt premiers">
              <Barres lignes={s.par_service} montants={montantsUtiles} />
            </Carte>

            <Carte titre="Localisations les plus chargées" sous_titre="Les quinze premières">
              <Barres lignes={s.par_localisation} montants={montantsUtiles} />
            </Carte>

            <div className="space-y-3">
              <Carte
                titre="Présence physique"
                sous_titre="Ce que la dernière tournée a confirmé"
              >
                <Barres lignes={s.par_presence} />
              </Carte>

              <Carte
                titre="Voie de numérotation"
                sous_titre="Numéro attribué par le compteur, ou transcrit du registre"
              >
                <Barres lignes={s.par_voie} />
              </Carte>
            </div>
          </div>

          {/* ── ④ Ce qui bouge ──────────────────────────────────────────── */}
          <Carte
            titre="Mouvements des douze derniers mois"
            sous_titre="Transferts et réformes, mois par mois"
          >
            <SerieMensuelle mois={mouvements} />
          </Carte>

          {s.par_annee.length > 0 && (
            <Carte
              titre="Âge du parc"
              sous_titre="Par année de mise en service, ou à défaut d'inventaire"
            >
              <Barres
                lignes={s.par_annee.map((a) => ({
                  libelle: String(a.annee),
                  n: a.n,
                  valeur: a.valeur,
                }))}
                montants={montantsUtiles}
              />
            </Carte>
          )}

          {s.valorisation && s.plus_chers.length > 0 && (
            <Carte titre="Les dix biens les plus chers" sous_titre="Ce qu'il faut surveiller en premier">
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="py-1.5 pr-3 font-semibold">N° inventaire</th>
                      <th className="py-1.5 pr-3 font-semibold">Désignation</th>
                      <th className="py-1.5 pr-3 font-semibold">Localisation</th>
                      <th className="py-1.5 text-right font-semibold">Valeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.plus_chers.map((a) => (
                      <tr key={a.num_inventaire} className="border-b border-slate-100 last:border-0">
                        <td className="py-1.5 pr-3 font-mono text-[12px] text-slate-500">
                          {a.num_inventaire}
                        </td>
                        <td className="py-1.5 pr-3 font-medium text-slate-800">{a.designation}</td>
                        <td className="py-1.5 pr-3 text-slate-500">{a.localisation}</td>
                        <td className="py-1.5 text-right font-semibold tabular-nums text-slate-800">
                          {da(a.valeur)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Carte>
          )}
        </>
      )}
    </div>
  );
}
