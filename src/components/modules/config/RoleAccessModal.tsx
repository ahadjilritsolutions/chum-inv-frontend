"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { KeyRound, Loader2, Minus } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Banner, FormActions } from "@/components/ui/Form";
import {
  getCatalogueAcces, getRoleAcces, setRoleAcces,
  type AccesCatalogue, type RoleRow,
} from "@/services/inv/roles";

/**
 * Attribuer ses accès à un rôle.
 *
 * ── CE QUI EST ENVOYÉ : L'ENSEMBLE, PAS UN DELTA ───────────────────────────
 * Le formulaire poste la liste COMPLÈTE des codes cochés. Envoyer « +ceci,
 * −cela » ferait dépendre le résultat de ce que cet écran croyait voir au
 * chargement : deux administrateurs travaillant en même temps sur le même rôle
 * s'écraseraient à moitié, et personne ne saurait ce qui reste. Avec
 * l'ensemble, le dernier qui enregistre gagne — entièrement, et cela se lit.
 *
 * ── POURQUOI DES CASES À TROIS ÉTATS ───────────────────────────────────────
 * Un module compte jusqu'à vingt accès. La case du module dit d'un coup d'œil
 * s'il est accordé en entier, pas du tout, ou en partie — et la cocher agit
 * sur tout le groupe. Sans elle, « donner les articles à ce rôle » se fait en
 * quinze clics et une distraction suffit à en oublier un, ce qui produit
 * exactement le genre de droit manquant qu'on ne découvre qu'à la plainte.
 *
 * L'état intermédiaire n'existe pas en HTML : `indeterminate` est une propriété
 * du DOM, pas un attribut. D'où la ref ci-dessous — React ne la pose pas seul.
 */
export default function RoleAccessModal({
  role, onClose, onSaved,
}: {
  role: RoleRow | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [catalogue, setCatalogue] = useState<AccesCatalogue | null>(null);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [chargement, setChargement] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!role) return;
    setChargement(true); setErreur(null); setBusy(false);
    void Promise.all([getCatalogueAcces(), getRoleAcces(role.id_role)])
      .then(([cat, det]) => {
        setCatalogue(cat);
        setCoches(new Set(det.codes));
        setInitial(new Set(det.codes));
      })
      .catch((e: unknown) =>
        setErreur(e instanceof Error ? e.message : "Chargement impossible."))
      .finally(() => setChargement(false));
  }, [role]);

  const modifie = useMemo(() => {
    if (coches.size !== initial.size) return true;
    for (const c of coches) if (!initial.has(c)) return true;
    return false;
  }, [coches, initial]);

  if (!role) return null;
  const r = role;

  function basculer(code: string) {
    setCoches((p) => {
      const n = new Set(p);
      if (n.has(code)) n.delete(code); else n.add(code);
      return n;
    });
  }

  function basculerModule(codes: string[], tout: boolean) {
    setCoches((p) => {
      const n = new Set(p);
      for (const c of codes) { if (tout) n.add(c); else n.delete(c); }
      return n;
    });
  }

  async function enregistrer() {
    setBusy(true); setErreur(null);
    try {
      const res = await setRoleAcces(r.id_role, [...coches]);
      onSaved(
        `${res.codes.length} accès enregistré(s) pour « ${r.lib_role} ».`,
      );
      onClose();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
      setBusy(false);
    }
  }

  return (
    <Modal
      open onClose={onClose}
      title={`Accès — ${r.lib_role}`}
      icon={<KeyRound size={18} />}
      width={760}
      footer={
        <FormActions
          onCancel={onClose}
          onSubmit={() => void enregistrer()}
          submitLabel={`Enregistrer (${coches.size})`}
          submitting={busy}
          disabled={chargement || !modifie}
        />
      }
    >
      <div className="space-y-3 p-5">
        {erreur && <Banner type="error">{erreur}</Banner>}

        {r.portee === "propres_services" && (
          <Banner type="ok">
            Ce rôle est limité à ses propres services : même avec un accès de
            lecture, il ne verra que les articles qui s&apos;y trouvent.
          </Banner>
        )}

        {chargement && (
          <p className="py-10 text-center text-slate-400">
            <Loader2 size={20} className="mx-auto animate-spin" />
          </p>
        )}

        {!chargement && catalogue?.modules.map((m) => {
          const codes = m.acces.map((a) => a.code);
          const pris = codes.filter((c) => coches.has(c)).length;
          const tout = pris === codes.length;
          const partiel = pris > 0 && !tout;

          return (
            <section key={m.code} className="rounded-xl border border-slate-200">
              <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <CaseTriEtat
                    coche={tout}
                    partiel={partiel}
                    onChange={() => basculerModule(codes, !tout)}
                  />
                  <span className="text-[13px] font-semibold text-slate-800">
                    {m.libelle}
                  </span>
                </label>
                <span className="text-[11.5px] text-slate-500">
                  {pris} / {codes.length}
                </span>
              </header>

              <div className="grid gap-x-4 gap-y-1 p-3 sm:grid-cols-2">
                {m.acces.map((a) => (
                  <label
                    key={a.code}
                    className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={coches.has(a.code)}
                      onChange={() => basculer(a.code)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-cyan-600"
                    />
                    <span className="min-w-0">
                      <span className="block text-[12.5px] text-slate-700">{a.libelle}</span>
                      {/* Le code est montré parce que c'est lui qui apparaît
                          dans un refus (403 « accès manquant : … ») : pouvoir
                          le retrouver ici évite de fouiller le code source. */}
                      <span className="block font-mono text-[10.5px] text-slate-400">
                        {a.code}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </Modal>
  );
}

/**
 * Une case à cocher qui sait dire « en partie ».
 *
 * `indeterminate` ne s'écrit pas en JSX : c'est une propriété du nœud DOM et
 * non un attribut HTML, donc React ne la pose jamais. Il faut l'affecter à la
 * main à chaque rendu, sans quoi un groupe partiellement coché s'afficherait
 * comme entièrement décoché — c'est-à-dire mentirait.
 */
function CaseTriEtat({
  coche, partiel, onChange,
}: {
  coche: boolean; partiel: boolean; onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = partiel;
  }, [partiel, coche]);

  return (
    <span className="relative inline-flex">
      <input
        ref={ref}
        type="checkbox"
        checked={coche}
        onChange={onChange}
        className="h-4 w-4 rounded border-slate-300 accent-cyan-600"
      />
      {partiel && (
        <Minus
          size={12}
          className="pointer-events-none absolute left-0.5 top-0.5 text-white"
        />
      )}
    </span>
  );
}
