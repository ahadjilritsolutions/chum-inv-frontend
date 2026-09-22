"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Pencil } from "lucide-react";
import ListToolbar from "@/components/ui/ListToolbar";
import DataTable, { Td } from "@/components/ui/DataTable";
import IconAction from "@/components/ui/IconAction";
import { Banner } from "@/components/ui/Form";
import RoleAccessModal from "@/components/modules/config/RoleAccessModal";
import RoleFormModal from "@/components/modules/config/RoleFormModal";
import { useAccess } from "@/lib/auth/AccessProvider";
import { ACCESS } from "@/lib/access";
import { listRoles, type RoleRow } from "@/services/inv/roles";

/**
 * CONFIGURATION ▸ RÔLES ET ACCÈS.
 *
 * C'est la section qui rend le registre d'accès utilisable par autre chose
 * qu'un développeur : `config/access.ts` déclare les droits, db-script.sql les
 * sème, et c'est ici qu'on décide qui les détient — sans redéployer.
 *
 * Le legacy n'avait pas d'équivalent, et pas par oubli : son modèle ne pouvait
 * pas en avoir. L'autorité y était le dossier PHP dans lequel la connexion vous
 * redirigeait (`utilisateur.cat_acc`), plus un drapeau `param` non documenté.
 * Accorder UN écran à UNE personne exigeait de la déplacer dans une autre
 * application — d'où le même CRUD « Bureaux » en double sur le disque.
 *
 * La section charge ses propres données, comme les sections du magasin : passer
 * d'un onglet à l'autre ne peut pas laisser les lignes de l'un dans le tableau
 * de l'autre.
 */
export default function SectionRoles() {
  const { can } = useAccess();

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [recherche, setRecherche] = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [form, setForm] = useState<"creer" | "modifier" | null>(null);
  const [cible, setCible] = useState<RoleRow | null>(null);
  const [acces, setAcces] = useState<RoleRow | null>(null);

  const charger = useCallback(async () => {
    setChargement(true); setErreur(null);
    try {
      setRoles((await listRoles()).roles);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { void charger(); }, [charger]);

  const q = recherche.trim().toLowerCase();
  const filtres = roles.filter(
    (r) => !q || r.lib_role.toLowerCase().includes(q) || r.code.toLowerCase().includes(q),
  );

  return (
    <div className="space-y-4">
      {erreur && <Banner type="error">{erreur}</Banner>}
      {info && <Banner type="ok">{info}</Banner>}

      <ListToolbar
        recherche={recherche}
        onRecherche={setRecherche}
        placeholder="Libellé ou code du rôle…"
        total={filtres.length}
        onAdd={
          can(ACCESS.CONFIG_ROLES_CREER)
            ? () => { setCible(null); setForm("creer"); }
            : undefined
        }
        addLabel="Nouveau rôle"
      />

      <DataTable
        colonnes={[
          { titre: "Rôle" },
          { titre: "Code" },
          { titre: "Portée" },
          { titre: "Accès" },
          { titre: "Comptes" },
          { titre: "État" },
          { titre: "Actions", className: "text-right" },
        ]}
        lignes={filtres}
        cle={(r) => r.id_role}
        chargement={chargement}
        messageVide="Aucun rôle."
        largeurMin={940}
        rendu={(r) => (
          <>
            <Td className="font-medium text-slate-800">{r.lib_role}</Td>
            <Td className="font-mono text-[12px] text-slate-500">{r.code}</Td>
            <Td>
              {/* La portée figure dans la liste parce qu'elle change ce que les
                  accès signifient : le même « consulter les articles » ne
                  couvre pas la même chose selon qu'elle vaut tout ou propre. */}
              <span
                className={
                  "rounded-md px-2 py-0.5 text-[11px] font-semibold " +
                  (r.portee === "tous_services"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-amber-50 text-amber-700")
                }
              >
                {r.portee === "tous_services" ? "Tous les services" : "Propres services"}
              </span>
            </Td>
            <Td className="text-slate-600">{r.nb_acces}</Td>
            <Td className="text-slate-600">{r.nb_utilisateurs}</Td>
            <Td>
              <span
                className={
                  "rounded-md px-2 py-0.5 text-[11px] font-semibold " +
                  (r.actif ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")
                }
              >
                {r.actif ? "Actif" : "Inactif"}
              </span>
            </Td>
            <Td>
              <div className="flex items-center justify-end gap-1.5">
                {can(ACCESS.CONFIG_ROLES_ACCES) && (
                  <IconAction title="Attribuer les accès" tone="print" onClick={() => setAcces(r)}>
                    <KeyRound size={14} />
                  </IconAction>
                )}
                {can(ACCESS.CONFIG_ROLES_MODIFIER) && (
                  <IconAction
                    title="Modifier le rôle"
                    tone="edit"
                    onClick={() => { setCible(r); setForm("modifier"); }}
                  >
                    <Pencil size={14} />
                  </IconAction>
                )}
              </div>
            </Td>
          </>
        )}
      />

      <RoleFormModal
        mode={form}
        role={cible}
        onClose={() => setForm(null)}
        onSaved={(m) => { setInfo(m); void charger(); }}
      />
      <RoleAccessModal
        role={acces}
        onClose={() => setAcces(null)}
        onSaved={(m) => { setInfo(m); void charger(); }}
      />
    </div>
  );
}
