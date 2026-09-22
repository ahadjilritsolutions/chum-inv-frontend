"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CircleUser, Search, ShieldCheck, TriangleAlert, UserMinus, UserPlus, Users, X,
} from "lucide-react";
import ListToolbar from "@/components/ui/ListToolbar";
import DataTable, { Td } from "@/components/ui/DataTable";
import { Banner, Select } from "@/components/ui/Form";
import { useAccess } from "@/lib/auth/AccessProvider";
import { ACCESS } from "@/lib/access";
import {
  attribuerRole, cloreReprise, listComptes, listReprise, listRolesAssignables,
  type CompteRow, type LigneReprise,
} from "@/services/inv/comptes";
import CompteFormModal from "@/components/modules/config/CompteFormModal";
import MigrationComptesModal from "@/components/modules/config/MigrationComptesModal";

/**
 * CONFIGURATION ▸ COMPTES — qui a accès à l'inventaire, et sous quel rôle.
 *
 * ── DEUX CHOSES : L'IDENTITÉ ET LE DROIT ────────────────────────────────────
 * L'identité vit dans `santeplus`, l'annuaire partagé par la DEP, le LIS, le
 * RIS, le magasin et l'inventaire : un agent y existe UNE fois pour tout
 * l'hôpital. Le droit de travailler ici est le RÔLE INVENTAIRE. Sans rôle, un
 * compte parfaitement valide se connecte et ne voit rien — c'est voulu, pas une
 * panne.
 *
 * On peut CRÉER un compte depuis ici, parce que cinq personnes de l'ancienne
 * plateforme n'en ont aucun dans l'annuaire et que la migration les laisserait
 * dehors sans cela. Ce qui reste impossible, c'est de DÉSACTIVER un compte :
 * `utilisateur.compte` vaut pour tout l'hôpital, le basculer couperait à
 * quelqu'un l'accès à la DEP et au LIS sans que personne y voie de rapport.
 * Pour fermer l'accès à l'INVENTAIRE, on retire le rôle.
 *
 * ── DEUX LISTES, DEUX QUESTIONS ─────────────────────────────────────────────
 * Par défaut, seuls les comptes QUI ONT UN RÔLE — « qui a accès ? ». Les 1 434
 * comptes de l'annuaire noieraient les quelques-uns qui comptent. Dès qu'on
 * tape une recherche, on cherche dans tout l'annuaire — « je veux donner accès
 * à cette personne ».
 *
 * ── LA REPRISE ──────────────────────────────────────────────────────────────
 * L'onglet du bas liste les comptes de l'ANCIENNE plateforme que la migration
 * n'a pas su rattacher. Ce ne sont pas des erreurs : ce sont les cas où la
 * machine a refusé de deviner (personne absente de l'annuaire, ou homonyme).
 * Les deux se règlent du même geste — chercher la bonne personne et lui donner
 * son rôle — d'où cette liste ici, et non dans un journal que personne n'ouvre.
 */
export default function SectionComptes() {
  const { can } = useAccess();
  const peutModifier = can(ACCESS.CONFIG_COMPTES_MODIFIER);

  const [comptes, setComptes] = useState<CompteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [recherche, setRecherche] = useState("");
  const [enRecherche, setEnRecherche] = useState(false);
  const [filtreRole, setFiltreRole] = useState("");
  const [roles, setRoles] = useState<
    Array<{ id_role: number; code: string; lib_role: string; portee: string; nb: number }>
  >([]);
  const [reprise, setReprise] = useState<LigneReprise[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [occupe, setOccupe] = useState<number | null>(null);
  const [creation, setCreation] = useState<{ reprise: LigneReprise | null } | null>(null);
  const [migration, setMigration] = useState(false);

  useEffect(() => {
    void listRolesAssignables().then((d) => setRoles(d.roles)).catch(() => setRoles([]));
    void listReprise().then((d) => setReprise(d.lignes)).catch(() => setReprise([]));
  }, []);

  const rechargerReprise = useCallback(() => {
    void listReprise().then((d) => setReprise(d.lignes)).catch(() => setReprise([]));
  }, []);

  const charger = useCallback(async () => {
    setChargement(true); setErreur(null);
    try {
      const d = await listComptes({
        q: recherche || undefined,
        role: filtreRole ? Number(filtreRole) : undefined,
      });
      setComptes(d.comptes);
      setTotal(d.total);
      setEnRecherche(d.recherche);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setChargement(false);
    }
  }, [recherche, filtreRole]);

  useEffect(() => { void charger(); }, [charger]);

  /** Clore une ligne sans créer : la personne a quitté l'hôpital. */
  async function ignorerReprise(l: LigneReprise) {
    const qui = l.nom ?? `le compte n° ${l.id_legacy}`;
    if (!window.confirm(`Clore la reprise de ${qui} sans créer de compte ?`)) return;
    setErreur(null); setInfo(null);
    try {
      await cloreReprise(l.id_legacy, "clos à la main, sans création de compte");
      setInfo(`Reprise de ${qui} close.`);
      rechargerReprise();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de clore la ligne.");
    }
  }

  async function changerRole(c: CompteRow, id_role: number | null) {
    setOccupe(c.id_user); setErreur(null); setInfo(null);
    try {
      await attribuerRole(c.id_user, id_role);
      const nom = `${c.prenom_user ?? ""} ${c.nom_user ?? ""}`.trim() || c.login;
      setInfo(
        id_role === null
          ? `Accès à l'inventaire retiré à ${nom}.`
          : `${nom} : rôle « ${roles.find((r) => r.id_role === id_role)?.lib_role} » attribué.`,
      );
      await charger();
      void listRolesAssignables().then((d) => setRoles(d.roles)).catch(() => {});
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Attribution impossible.");
    } finally {
      setOccupe(null);
    }
  }

  const avecRole = roles.reduce((n, r) => n + r.nb, 0);

  return (
    <div className="space-y-4">
      {erreur && <Banner type="error">{erreur}</Banner>}
      {info && <Banner type="ok">{info}</Banner>}

      <Banner type="ok">
        Les comptes vivent dans l&apos;annuaire <strong>santeplus</strong>, partagé avec
        la DEP, le LIS et le magasin : une personne y existe une seule fois pour
        tout l&apos;hôpital. Ce que vous attribuez ici est le{" "}
        <strong>rôle inventaire</strong> — sans rôle, elle se connecte et ne voit
        rien. Retirer le rôle ferme l&apos;accès à cette application seule, sans
        désactiver son compte.
      </Banner>

      <ListToolbar
        recherche={recherche}
        onRecherche={setRecherche}
        placeholder="Chercher dans tout l'annuaire : nom, prénom, login, e-mail…"
        total={total}
        onAdd={
          can(ACCESS.CONFIG_COMPTES_CREER)
            ? () => setCreation({ reprise: null })
            : undefined
        }
        addLabel="Nouveau compte"
        filters={
          <Select
            value={filtreRole}
            onChange={(e) => setFiltreRole(e.target.value)}
            className="w-auto min-w-[200px]"
          >
            <option value="">Tous les rôles</option>
            {roles.map((r) => (
              <option key={r.id_role} value={r.id_role}>
                {r.lib_role} ({r.nb})
              </option>
            ))}
          </Select>
        }
      />

      {/* Dire QUELLE liste on regarde : sans cela, « 1 résultat » après une
          recherche et « 1 résultat » sans recherche se ressemblent trop. */}
      <p className="flex items-center gap-1.5 px-1 text-[12px] text-slate-500">
        {enRecherche ? <Search size={13} /> : <ShieldCheck size={13} />}
        {enRecherche
          ? "Résultats dans tout l'annuaire — attribuez un rôle pour donner l'accès."
          : `${avecRole} compte${avecRole > 1 ? "s ont" : " a"} accès à l'inventaire. Cherchez un nom pour en ajouter.`}
      </p>

      <DataTable
        colonnes={[
          { titre: "Personne" },
          { titre: "Identifiant" },
          { titre: "Service (annuaire)" },
          { titre: "Compte" },
          { titre: "Rôle inventaire", className: "text-right" },
        ]}
        lignes={comptes}
        cle={(c) => c.id_user}
        chargement={chargement}
        messageVide={
          enRecherche ? "Aucun compte ne correspond." : "Aucun compte n'a encore de rôle."
        }
        largeurMin={1020}
        rendu={(c) => (
          <>
            <Td className="font-medium text-slate-800">
              {`${c.prenom_user ?? ""} ${c.nom_user ?? ""}`.trim() || "—"}
              {c.mail_user && (
                <span className="block text-[11px] font-normal text-slate-400">
                  {c.mail_user}
                </span>
              )}
            </Td>
            <Td className="font-mono text-[12px] text-slate-500">{c.login}</Td>
            <Td className="text-slate-600">{c.lib_service ?? "—"}</Td>
            <Td>
              {/* L'état du compte PARTAGÉ, en lecture seule : on l'affiche parce
                  qu'un compte désactivé ne se connectera pas, quel que soit le
                  rôle qu'on lui donne ici. */}
              <span
                className={
                  "rounded-md px-2 py-0.5 text-[11px] font-semibold " +
                  (c.compte === "A"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500")
                }
                title={
                  c.compte === "A"
                    ? "Compte actif dans l'annuaire"
                    : "Compte désactivé dans l'annuaire — se gère hors de l'inventaire"
                }
              >
                {c.compte === "A" ? "Actif" : "Désactivé"}
              </span>
            </Td>
            <Td>
              <div className="flex items-center justify-end gap-1.5">
                {/* Un compte système n'a pas de rôle inventaire et n'en prend
                    pas : il détient déjà tout par construction. Lui en
                    attribuer un le RESTREINDRAIT, ce qui n'est pas ce qu'on
                    croit faire en cliquant. */}
                {c.role_santeplus === 100 ? (
                  <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                    Système — tous les accès
                  </span>
                ) : peutModifier ? (
                  <>
                    <Select
                      value={c.id_role === null ? "" : String(c.id_role)}
                      disabled={occupe !== null}
                      onChange={(e) =>
                        void changerRole(c, e.target.value ? Number(e.target.value) : null)
                      }
                      className="w-auto min-w-[190px]"
                    >
                      <option value="">— aucun accès —</option>
                      {roles.map((r) => (
                        <option key={r.id_role} value={r.id_role}>{r.lib_role}</option>
                      ))}
                    </Select>
                    {c.id_role !== null && (
                      <button
                        type="button"
                        title="Retirer l'accès à l'inventaire"
                        disabled={occupe !== null}
                        onClick={() => void changerRole(c, null)}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100 disabled:opacity-40"
                      >
                        <UserMinus size={14} />
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-[12px] text-slate-600">{c.lib_role ?? "—"}</span>
                )}
              </div>
            </Td>
          </>
        )}
      />

      {/* ── La reprise des comptes de l'ancienne plateforme ───────────────── */}
      {reprise.length > 0 && (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <header className="mb-3">
            <h3 className="flex items-center gap-1.5 text-[13.5px] font-semibold text-slate-800">
              <TriangleAlert size={14} className="text-amber-500" />
              Comptes de l&apos;ancienne plateforme à reprendre ({reprise.length})
            </h3>
            <p className="text-[11.5px] text-slate-400">
              La migration a refusé de deviner. Reprenez-les toutes d&apos;un coup,
              ou traitez-les une par une ci-dessous.
            </p>
          </header>

          {/* Le geste principal : tout reprendre. Les boutons par ligne
              restent pour les cas que le lot laisse de côté — un homonyme
              se tranche à la main, et c'est très bien ainsi. */}
          {can(ACCESS.CONFIG_COMPTES_CREER) && (
            <button
              type="button"
              onClick={() => setMigration(true)}
              className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-cyan-700"
            >
              <Users size={15} />
              Reprendre les {reprise.length} comptes
            </button>
          )}

          <ul className="space-y-1.5">
            {reprise.map((l) => (
              <li
                key={l.id_log}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-slate-800">
                    <CircleUser size={13} className="shrink-0 text-amber-600" />
                    {l.nom ?? `Compte legacy #${l.id_legacy}`}
                  </span>
                  <span className="block text-[11px] text-slate-500">{l.message}</span>
                  {/* Le drapeau Paramètres du legacy : affiché, jamais appliqué.
                      Les 8 comptes de production le portent, donc en faire une
                      promotion automatique aurait fait de six personnes des
                      administrateurs sans que personne l'ait décidé. */}
                  {l.legacy?.avait_parametres && (
                    <span className="mt-0.5 inline-block rounded bg-amber-200/60 px-1.5 py-px text-[10.5px] font-semibold text-amber-900">
                      avait le menu Paramètres — à promouvoir à la main si nécessaire
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {/* Trois issues, dans l'ordre où on les essaie :
                      chercher (la personne est peut-être déjà là sous un autre
                      nom), créer (elle n'y est pas), clore (elle est partie). */}
                  <button
                    type="button"
                    onClick={() => setRecherche(l.nom ?? l.mail ?? "")}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-amber-800 transition-colors hover:bg-amber-100"
                  >
                    <Search size={13} />
                    Chercher
                  </button>
                  {can(ACCESS.CONFIG_COMPTES_CREER) && l.legacy && (
                    <button
                      type="button"
                      onClick={() => setCreation({ reprise: l })}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-cyan-600 px-2.5 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-cyan-700"
                    >
                      <UserPlus size={13} />
                      Créer le compte
                    </button>
                  )}
                  {peutModifier && (
                    <button
                      type="button"
                      title="La personne a quitté l'hôpital — clore sans créer"
                      onClick={() => void ignorerReprise(l)}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-white text-amber-700 transition-colors hover:bg-amber-100"
                    >
                      <X size={13} />
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <MigrationComptesModal
        ouvert={migration}
        nbLignes={reprise.length}
        onClose={() => setMigration(false)}
        onTermine={(m) => {
          setInfo(m);
          void charger();
          rechargerReprise();
        }}
      />

      <CompteFormModal
        ouvert={creation !== null}
        reprise={creation?.reprise ?? null}
        roles={roles}
        onClose={() => setCreation(null)}
        onCree={(m) => {
          setInfo(m);
          void charger();
          rechargerReprise();
        }}
      />
    </div>
  );
}
