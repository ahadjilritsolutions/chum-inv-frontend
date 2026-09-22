"use client";

import { useEffect, useState } from "react";
import { KeyRound, UserPlus } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Banner, Field, FormActions, Select, TextInput } from "@/components/ui/Form";
import { creerCompte, type LigneReprise } from "@/services/inv/comptes";
import { getReference } from "@/services/inv/reference";
import type { ReferenceFeed } from "@/types/inv/reference";

/**
 * CRÉER UN COMPTE DANS L'ANNUAIRE.
 *
 * ── POURQUOI CET ÉCRAN EXISTE ───────────────────────────────────────────────
 * L'ancienne plateforme avait sa propre table de comptes. Cinq des huit
 * personnes qui s'en servaient n'ont AUCUN compte santeplus — ni en test, ni en
 * production. Sans création possible, la migration les laisserait dehors et
 * « migré » serait faux. Le LIS crée déjà des comptes de la même façon.
 *
 * ── PRÉ-REMPLI DEPUIS LE DOSSIER LEGACY ─────────────────────────────────────
 * Ouvert depuis une ligne de reprise, le formulaire arrive rempli : nom,
 * prénom, e-mail, téléphone, et le rôle que `cat_acc` désignait. Recopier cela
 * à la main pour cinq personnes, dans un annuaire que quatre applications
 * partagent, c'est se garantir une faute de frappe.
 *
 * L'identifiant de connexion est proposé à partir de l'e-mail, mais reste
 * MODIFIABLE : c'est la seule donnée qui doit être unique pour tout l'hôpital,
 * et c'est celle que la personne tapera tous les matins.
 *
 * ── LE MOT DE PASSE DU LEGACY N'EST PAS REPRIS ──────────────────────────────
 * L'ancienne table le stockait en SHA1 non salé. Le transporter ferait entrer
 * un secret déjà faible dans l'annuaire partagé — et le rendrait valable sur la
 * DEP et le LIS par la même occasion. La personne repart d'un mot de passe
 * initial, affiché une fois ici, qu'elle changera.
 */
export default function CompteFormModal({
  ouvert, reprise, roles, onClose, onCree,
}: {
  ouvert: boolean;
  /** La ligne de reprise d'où l'on vient, s'il y en a une. */
  reprise: LigneReprise | null;
  roles: Array<{ id_role: number; code: string; lib_role: string }>;
  onClose: () => void;
  onCree: (message: string) => void;
}) {
  const [f, setF] = useState<Record<string, string>>({});
  const [ref, setRef] = useState<ReferenceFeed | null>(null);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [cree, setCree] = useState<{ login: string; mot_de_passe: string } | null>(null);

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!ouvert) return;
    void getReference().then(setRef).catch(() => setRef(null));
    const l = reprise?.legacy;
    const roleSuggere = l?.code_role_suggere
      ? roles.find((r) => r.code === l.code_role_suggere)
      : undefined;
    setF({
      login: l?.mail_user ?? "",
      nom_user: l?.nom_user ?? "",
      prenom_user: l?.prenom_user ?? "",
      mail_user: l?.mail_user ?? "",
      tel_user: l?.tel_user ?? "",
      post_user: "",
      id_service: "",
      id_role: roleSuggere ? String(roleSuggere.id_role) : "",
    });
    setErreur(null); setBusy(false); setCree(null);
  }, [ouvert, reprise, roles]);

  if (!ouvert) return null;

  async function valider() {
    setBusy(true); setErreur(null);
    try {
      const r = await creerCompte({
        login: f.login.trim(),
        nom_user: f.nom_user.trim(),
        prenom_user: f.prenom_user.trim(),
        mail_user: f.mail_user?.trim() || null,
        tel_user: f.tel_user?.trim() || null,
        post_user: f.post_user?.trim() || null,
        id_service: Number(f.id_service),
        id_role: Number(f.id_role),
        ...(reprise ? { id_legacy: reprise.id_legacy } : {}),
      });
      // On n'enchaîne pas sur la fermeture : le mot de passe initial ne
      // s'affiche qu'une fois, et il faut le temps de le noter.
      setCree({ login: r.login, mot_de_passe: r.mot_de_passe });
      setBusy(false);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Création impossible.");
      setBusy(false);
    }
  }

  const valide =
    Boolean(f.login?.trim()) && Boolean(f.nom_user?.trim()) &&
    Boolean(f.prenom_user?.trim()) && Boolean(f.id_service) && Boolean(f.id_role);

  // ── Une fois créé : les identifiants, et rien d'autre ─────────────────────
  if (cree) {
    return (
      <Modal open onClose={onClose} title="Compte créé" icon={<KeyRound size={18} />} width={520}>
        <div className="space-y-4 p-5">
          <Banner type="ok">
            Notez ces identifiants maintenant : le mot de passe ne sera plus
            affiché. La base n&apos;en garde qu&apos;une empreinte.
          </Banner>

          <dl className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-baseline justify-between gap-3 py-1">
              <dt className="text-[12px] text-slate-500">Identifiant</dt>
              <dd className="font-mono text-[13.5px] font-semibold text-slate-800">
                {cree.login}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-slate-200 py-1">
              <dt className="text-[12px] text-slate-500">Mot de passe initial</dt>
              <dd className="font-mono text-[15px] font-bold text-slate-900">
                {cree.mot_de_passe}
              </dd>
            </div>
          </dl>

          <p className="text-[12px] text-slate-500">
            À changer à la première connexion, depuis « Mon compte ».
          </p>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                onCree(`Compte « ${cree.login} » créé.`);
                onClose();
              }}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-cyan-700"
            >
              J&apos;ai noté
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open onClose={onClose}
      title={reprise ? "Reprendre un compte de l'ancienne plateforme" : "Nouveau compte"}
      icon={<UserPlus size={18} />}
      width={640}
      footer={
        <FormActions
          onCancel={onClose}
          onSubmit={() => void valider()}
          submitLabel="Créer le compte"
          submitting={busy}
          disabled={!valide}
        />
      }
    >
      <div className="space-y-4 p-5">
        {erreur && <Banner type="error">{erreur}</Banner>}

        {reprise && (
          <Banner type="ok">
            Pré-rempli depuis le compte n° {reprise.id_legacy} de l&apos;ancienne
            plateforme. Le compte sera créé dans l&apos;annuaire partagé et la ligne
            de reprise sera close.
          </Banner>
        )}

        {/* Le fait est montré, le rôle n'est pas promu pour autant : les huit
            comptes de l'ancienne plateforme portaient ce drapeau, donc le suivre
            ferait de six personnes des administrateurs d'un coup. */}
        {reprise?.legacy?.avait_parametres && (
          <Banner type="error">
            Ce compte avait le <strong>menu Paramètres</strong> dans l&apos;ancienne
            plateforme. Le rôle proposé ci-dessous ne le promeut pas pour autant :
            les huit comptes portaient ce drapeau. Choisissez
            « Administrateur inventaire » si cette personne doit réellement l&apos;être.
          </Banner>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" required>
            <TextInput value={f.nom_user ?? ""} onChange={(e) => set("nom_user", e.target.value)} />
          </Field>
          <Field label="Prénom" required>
            <TextInput value={f.prenom_user ?? ""} onChange={(e) => set("prenom_user", e.target.value)} />
          </Field>

          <div className="sm:col-span-2">
            <Field
              label="Identifiant de connexion"
              required
              hint="Ce que la personne tapera — unique pour tout l'hôpital"
            >
              <TextInput
                value={f.login ?? ""}
                onChange={(e) => set("login", e.target.value)}
                placeholder="prenom.nom@chum.dz"
              />
            </Field>
          </div>

          <Field label="E-mail">
            <TextInput value={f.mail_user ?? ""} onChange={(e) => set("mail_user", e.target.value)} />
          </Field>
          <Field label="Téléphone">
            <TextInput value={f.tel_user ?? ""} onChange={(e) => set("tel_user", e.target.value)} />
          </Field>

          <Field label="Fonction">
            <TextInput
              value={f.post_user ?? ""}
              onChange={(e) => set("post_user", e.target.value)}
              placeholder="Ex. agent d'inventaire"
            />
          </Field>

          <Field label="Service d'affectation" required hint="Son service dans l'annuaire">
            <Select value={f.id_service ?? ""} onChange={(e) => set("id_service", e.target.value)}>
              <option value="">— choisir —</option>
              {(ref?.services ?? []).map((s) => (
                <option key={s.id_service} value={s.id_service}>{s.lib_service}</option>
              ))}
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <Field
              label="Rôle inventaire"
              required
              hint={
                reprise?.legacy?.code_role_suggere
                  ? "Proposé d'après son ancien niveau d'accès — modifiable"
                  : "Ce qu'il pourra faire dans cette application"
              }
            >
              <Select value={f.id_role ?? ""} onChange={(e) => set("id_role", e.target.value)}>
                <option value="">— choisir —</option>
                {roles.map((r) => (
                  <option key={r.id_role} value={r.id_role}>{r.lib_role}</option>
                ))}
              </Select>
            </Field>
          </div>
        </div>

        <p className="text-[11.5px] leading-snug text-slate-500">
          Le compte sera créé <strong>actif</strong>, avec un mot de passe initial
          affiché une fois à l&apos;écran. Le mot de passe de l&apos;ancienne plateforme
          n&apos;est pas repris : il y était stocké en SHA1 non salé, et le
          transporter ferait entrer un secret faible dans l&apos;annuaire que la DEP
          et le LIS partagent.
        </p>
      </div>
    </Modal>
  );
}
