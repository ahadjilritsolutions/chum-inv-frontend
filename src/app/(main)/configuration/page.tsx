"use client";

import { useState } from "react";
import { DoorOpen, Settings, Shield, Tags, Users, type LucideIcon } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import AccessPending from "@/components/ui/AccessPending";
import SectionRoles from "@/components/modules/config/SectionRoles";
import SectionCatalogue from "@/components/modules/config/SectionCatalogue";
import SectionLocalisations from "@/components/modules/config/SectionLocalisations";
import SectionComptes from "@/components/modules/config/SectionComptes";
import { useRequireAccess } from "@/lib/auth/useRequireAccess";
import { useAccess } from "@/lib/auth/AccessProvider";
import { ACCESS, type AccessCode } from "@/lib/access";
import { cn } from "@/lib/utils";

/**
 * CONFIGURATION — les référentiels sur lesquels le reste est bâti.
 *
 * La barre d'onglets est celle des Paramètres du magasin, à l'identique : une
 * grille dans une carte blanche arrondie, onglet actif blanc souligné de cyan,
 * inactifs sur `slate-50/70`. Les trois applications se ressemblent parce que
 * les mêmes agents passent de l'une à l'autre dans la même journée.
 *
 * Chaque section charge SES données. Changer d'onglet ne peut donc pas laisser
 * les lignes de l'un s'afficher dans le tableau de l'autre — c'est la raison
 * que le magasin donne, et elle vaut ici aussi.
 *
 * Un onglet n'apparaît que si la session peut en faire quelque chose : la
 * barre montre ce qu'on peut ouvrir, pas ce qui existe.
 */

type Cle = "comptes" | "roles" | "catalogue" | "localisations";

const ONGLETS: ReadonlyArray<{
  cle: Cle; libelle: string; icon: LucideIcon; access: AccessCode;
}> = [
  // Les comptes en premier : donner l'accès à quelqu'un est le geste le plus
  // fréquent, et c'est aussi par là qu'on reprend les comptes de l'ancienne
  // plateforme après une migration.
  { cle: "comptes", libelle: "Comptes", icon: Users, access: ACCESS.CONFIG_COMPTES_VOIR },
  { cle: "roles", libelle: "Rôles et accès", icon: Shield, access: ACCESS.CONFIG_ROLES_VOIR },
  { cle: "catalogue", libelle: "Catalogue", icon: Tags, access: ACCESS.CONFIG_CATALOGUE_VOIR },
  { cle: "localisations", libelle: "Localisations", icon: DoorOpen, access: ACCESS.CONFIG_STRUCTURE_VOIR },
];

export default function ConfigurationPage() {
  // La page s'ouvre dès qu'UN de ses onglets est permis. L'exiger sur les rôles
  // fermerait la configuration du catalogue à qui ne configure pas les rôles.
  const { allowed, loading: gating } = useRequireAccess(
    ACCESS.CONFIG_COMPTES_VOIR,
    ACCESS.CONFIG_ROLES_VOIR,
    ACCESS.CONFIG_CATALOGUE_VOIR,
    ACCESS.CONFIG_STRUCTURE_VOIR,
  );
  const { can } = useAccess();

  const visibles = ONGLETS.filter((o) => can(o.access));
  const [onglet, setOnglet] = useState<Cle | null>(null);

  if (gating || !allowed) return <AccessPending />;

  const actif = onglet ?? visibles[0]?.cle ?? "comptes";

  return (
    <div className="space-y-4">
      <PageHero title="Configuration" icon={Settings} />

      {visibles.length > 1 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${visibles.length}, minmax(0, 1fr))` }}
          >
            {visibles.map((o) => {
              const estActif = o.cle === actif;
              const Icon = o.icon;
              return (
                <button
                  key={o.cle}
                  type="button"
                  aria-current={estActif ? "page" : undefined}
                  onClick={() => setOnglet(o.cle)}
                  className={cn(
                    "flex cursor-pointer items-center justify-center gap-1.5 border-b-2 px-2 py-3",
                    "text-[12.5px] font-semibold transition-colors sm:px-3 sm:py-3.5 sm:text-[13px]",
                    estActif
                      ? "border-cyan-600 bg-white text-cyan-700"
                      : "border-transparent bg-slate-50/70 text-slate-500 hover:bg-slate-50",
                  )}
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="truncate">{o.libelle}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {actif === "comptes" && can(ACCESS.CONFIG_COMPTES_VOIR) && <SectionComptes />}
      {actif === "roles" && can(ACCESS.CONFIG_ROLES_VOIR) && <SectionRoles />}
      {actif === "catalogue" && can(ACCESS.CONFIG_CATALOGUE_VOIR) && <SectionCatalogue />}
      {actif === "localisations" && can(ACCESS.CONFIG_STRUCTURE_VOIR) && <SectionLocalisations />}
    </div>
  );
}
