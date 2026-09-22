"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Banner, Field, FormActions, Select, TextInput } from "@/components/ui/Form";
import { creerRole, modifierRole, type RoleRow } from "@/services/inv/roles";

/**
 * Créer ou modifier un rôle.
 *
 * Le CODE ne se modifie pas après la création. C'est l'identifiant stable par
 * lequel db-script.sql retrouve la ligne d'un serveur à l'autre : les grants
 * par défaut sont résolus par `WHERE r.code = 'agent_inventaire'` et non par
 * id, précisément parce que les auto-increment diffèrent entre le test et la
 * production. Renommer un code ferait que le seed ne retrouverait plus rien —
 * en silence, puisqu'un INSERT … SELECT qui ne matche rien n'est pas une
 * erreur. D'où un champ affiché mais verrouillé en modification.
 *
 * La PORTÉE n'est pas un accès, c'est un périmètre de données : elle décide si
 * le rôle voit tout l'établissement ou seulement ses propres services. Les deux
 * se combinent — un accès de lecture dit CE QU'ON PEUT FAIRE, la portée dit SUR
 * QUOI. C'est pourquoi elle vit ici, sur le rôle, et non dans la matrice.
 */
export default function RoleFormModal({
  mode, role, onClose, onSaved,
}: {
  mode: "creer" | "modifier" | null;
  role: RoleRow | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [code, setCode] = useState("");
  const [lib, setLib] = useState("");
  const [portee, setPortee] = useState("tous_services");
  const [spRole, setSpRole] = useState("");
  const [actif, setActif] = useState(1);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!mode) return;
    setErreur(null); setBusy(false);
    if (mode === "modifier" && role) {
      setCode(role.code);
      setLib(role.lib_role);
      setPortee(role.portee);
      setSpRole(role.santeplus_role_id === null ? "" : String(role.santeplus_role_id));
      setActif(role.actif);
    } else {
      setCode(""); setLib(""); setPortee("tous_services"); setSpRole(""); setActif(1);
    }
  }, [mode, role]);

  if (!mode) return null;

  async function enregistrer() {
    setBusy(true); setErreur(null);
    try {
      const commun = {
        lib_role: lib.trim(),
        portee,
        santeplus_role_id: spRole.trim() === "" ? null : Number(spRole),
      };
      if (mode === "modifier" && role) {
        await modifierRole(role.id_role, { ...commun, actif });
        onSaved(`Rôle « ${commun.lib_role} » modifié.`);
      } else {
        await creerRole({ ...commun, code: code.trim() });
        onSaved(`Rôle « ${commun.lib_role} » créé — attribuez-lui ses accès.`);
      }
      onClose();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
      setBusy(false);
    }
  }

  return (
    <Modal
      open onClose={onClose}
      title={mode === "modifier" ? "Modifier le rôle" : "Nouveau rôle"}
      icon={<Shield size={18} />}
      width={560}
      footer={
        <FormActions
          onCancel={onClose}
          onSubmit={() => void enregistrer()}
          submitLabel="Enregistrer"
          submitting={busy}
          disabled={!lib.trim() || (mode === "creer" && !code.trim())}
        />
      }
    >
      <div className="space-y-4 p-5">
        {erreur && <Banner type="error">{erreur}</Banner>}

        <Field
          label="Code"
          required={mode === "creer"}
          hint={
            mode === "modifier"
              ? "Non modifiable : db-script.sql retrouve le rôle par ce code"
              : "Sans espace ni accent — ex. agent_inventaire"
          }
        >
          <TextInput
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={mode === "modifier"}
            placeholder="agent_inventaire"
          />
        </Field>

        <Field label="Libellé" required hint="Ce que lisent les utilisateurs">
          <TextInput
            value={lib}
            onChange={(e) => setLib(e.target.value)}
            placeholder="Agent d'inventaire"
          />
        </Field>

        <Field
          label="Portée"
          required
          hint="Sur quelles données — indépendant des accès, qui disent quoi faire"
        >
          <Select value={portee} onChange={(e) => setPortee(e.target.value)}>
            <option value="tous_services">Tous les services de l&apos;établissement</option>
            <option value="propres_services">Seulement ses propres services</option>
          </Select>
        </Field>

        <Field
          label="Rôle santeplus associé"
          hint="Facultatif — pour proposer ce profil aux comptes portant ce rôle"
        >
          <TextInput
            value={spRole}
            onChange={(e) => setSpRole(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="60"
          />
        </Field>

        {mode === "modifier" && (
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
            <input
              type="checkbox"
              checked={actif === 1}
              onChange={(e) => setActif(e.target.checked ? 1 : 0)}
              className="h-4 w-4 rounded border-slate-300 accent-cyan-600"
            />
            Rôle actif
          </label>
        )}

        {mode === "modifier" && actif === 0 && (
          <Banner type="error">
            Désactiver un rôle retire TOUS ses accès à ceux qui le portent — la
            résolution des droits ne joint que les rôles actifs.
          </Banner>
        )}
      </div>
    </Modal>
  );
}
