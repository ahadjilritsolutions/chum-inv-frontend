"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeftRight, ArrowRight } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import ListToolbar from "@/components/ui/ListToolbar";
import DataTable, { Td } from "@/components/ui/DataTable";
import { Banner, Select } from "@/components/ui/Form";
import AccessPending from "@/components/ui/AccessPending";
import { useRequireAccess } from "@/lib/auth/useRequireAccess";
import { ACCESS } from "@/lib/access";
import { listMouvements } from "@/services/inv/mouvements";
import { getFamilles, getReference, getSousFamilles } from "@/services/inv/reference";
import { mouvementChip, chipStyle } from "@/lib/inv/theme";
import { formatDate } from "@/components/modules/articles/ArticleDetailModal";
import type { MouvementRow } from "@/types/inv/mouvement";
import type { Lookup, ReferenceFeed } from "@/types/inv/reference";

const TAILLE = 25;

/**
 * Transferts — l'historique des mouvements.
 *
 * Ce que l'ancienne plateforme ne pouvait pas montrer : `ltmobilier.php`
 * listait les ARTICLES dont l'état valait quelque chose, jamais les mouvements.
 * « Qu'est-ce qui a bougé ce mois-ci, et d'où vers où » n'avait pas de réponse.
 *
 * Une ligne = un déplacement, avec ses DEUX bouts. C'est la colonne qui compte :
 * un transfert dont on ne voit qu'une extrémité ne dit rien.
 */
export default function TransfertsPage() {
  const { allowed, loading: gating } = useRequireAccess(ACCESS.MOUVEMENTS_VOIR);

  const [lignes, setLignes] = useState<MouvementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [recherche, setRecherche] = useState("");
  const [type, setType] = useState("transfert");
  const [service, setService] = useState("");
  const [categorie, setCategorie] = useState("");
  const [famille, setFamille] = useState("");
  const [sousFamille, setSousFamille] = useState("");
  const [du, setDu] = useState("");
  const [au, setAu] = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ref, setRef] = useState<ReferenceFeed | null>(null);
  const [familles, setFamilles] = useState<Lookup[]>([]);
  const [sousFamilles, setSousFamilles] = useState<Lookup[]>([]);

  useEffect(() => {
    void getReference().then(setRef).catch(() => setRef(null));
  }, []);

  // Le catalogue est hiérarchique : choisir une catégorie restreint les
  // familles, choisir une famille restreint les sous-familles. Remonter d'un
  // niveau efface ce qui n'a plus de sens en dessous.
  useEffect(() => {
    if (!categorie) { setFamilles([]); setFamille(""); return; }
    void getFamilles(Number(categorie)).then(setFamilles).catch(() => setFamilles([]));
  }, [categorie]);

  useEffect(() => {
    if (!famille) { setSousFamilles([]); setSousFamille(""); return; }
    void getSousFamilles(Number(famille)).then(setSousFamilles).catch(() => setSousFamilles([]));
  }, [famille]);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const d = await listMouvements({
        q: recherche || undefined,
        type: type || undefined,
        service: service ? Number(service) : undefined,
        categorie: categorie ? Number(categorie) : undefined,
        famille: famille ? Number(famille) : undefined,
        sous_famille: sousFamille ? Number(sousFamille) : undefined,
        du: du || undefined,
        au: au || undefined,
        page,
        limit: TAILLE,
      });
      setLignes(d.mouvements);
      setTotal(d.total);
      setPages(d.pages);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setChargement(false);
    }
  }, [recherche, type, service, categorie, famille, sousFamille, du, au, page]);

  useEffect(() => { void charger(); }, [charger]);

  const filtrer = (fn: () => void) => { fn(); setPage(1); };

  if (gating || !allowed) return <AccessPending />;

  return (
    <div className="space-y-4">
      <PageHero
        title="Transferts"
        icon={ArrowLeftRight}
      />

      {erreur && <Banner type="error">{erreur}</Banner>}

      <ListToolbar
        recherche={recherche}
        onRecherche={(v) => filtrer(() => setRecherche(v))}
        placeholder="N° d'inventaire ou désignation…"
        total={total}
        filters={
          <>
            <Select
              value={type}
              onChange={(e) => filtrer(() => setType(e.target.value))}
              className="w-auto min-w-[160px]"
            >
              <option value="transfert">Transferts</option>
              <option value="">Tous les mouvements</option>
              <option value="proposition_reforme">Propositions de réforme</option>
              <option value="reforme">Réformes</option>
              <option value="creation">Créations</option>
            </Select>
            <Select
              value={service}
              onChange={(e) => filtrer(() => setService(e.target.value))}
              className="w-auto min-w-[150px]"
            >
              <option value="">Tous les services</option>
              {(ref?.services ?? []).map((s) => (
                <option key={s.id_service} value={s.id_service}>{s.lib_service}</option>
              ))}
            </Select>
            <Select
              value={categorie}
              onChange={(e) => filtrer(() => setCategorie(e.target.value))}
              className="w-auto min-w-[150px]"
            >
              <option value="">Toutes catégories</option>
              {(ref?.categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.libelle}</option>
              ))}
            </Select>
            <Select
              value={famille}
              onChange={(e) => filtrer(() => setFamille(e.target.value))}
              disabled={familles.length === 0}
              className="w-auto min-w-[150px]"
            >
              <option value="">Toutes familles</option>
              {familles.map((f) => (
                <option key={f.id} value={f.id}>{f.libelle}</option>
              ))}
            </Select>
            <Select
              value={sousFamille}
              onChange={(e) => filtrer(() => setSousFamille(e.target.value))}
              disabled={sousFamilles.length === 0}
              className="w-auto min-w-[160px]"
            >
              <option value="">Toutes sous-familles</option>
              {sousFamilles.map((f) => (
                <option key={f.id} value={f.id}>{f.libelle}</option>
              ))}
            </Select>
            <input
              type="date"
              value={du}
              onChange={(e) => filtrer(() => setDu(e.target.value))}
              title="Du"
              className="h-10 rounded-lg border border-slate-200 px-2.5 text-[13px] text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
            />
            <input
              type="date"
              value={au}
              onChange={(e) => filtrer(() => setAu(e.target.value))}
              title="Au"
              className="h-10 rounded-lg border border-slate-200 px-2.5 text-[13px] text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
            />
          </>
        }
      />

      <DataTable
        colonnes={[
          { titre: "Date" },
          { titre: "Type" },
          { titre: "N° inventaire" },
          { titre: "Désignation" },
          { titre: "De → Vers" },
          { titre: "Document" },
          { titre: "Motif" },
        ]}
        lignes={lignes}
        cle={(m) => m.id_mouvement}
        chargement={chargement}
        messageVide="Aucun mouvement ne correspond à ces critères."
        largeurMin={1120}
        page={page}
        pages={pages}
        onPage={setPage}
        rendu={(m) => {
          const c = mouvementChip(m.type);
          return (
            <>
              <Td className="whitespace-nowrap text-slate-600">
                {formatDate(m.date_mouvement)}
              </Td>
              <Td>
                <span
                  className="whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold"
                  style={chipStyle(c)}
                >
                  {c.label}
                </span>
              </Td>
              <Td className="font-mono text-[12.5px] font-medium text-slate-700">
                {m.num_inventaire}
              </Td>
              <Td className="font-medium text-slate-800">{m.designation}</Td>
              <Td>
                {/* Les deux bouts, toujours — c'est la colonne qui justifie
                    l'écran. Un mouvement sans origine ni destination (une
                    réforme, une création) le dit plutôt que d'afficher du vide
                    trompeur. */}
                {m.loc_avant || m.loc_apres ? (
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-[12.5px]">
                    <span className="text-slate-600">{m.loc_avant ?? "—"}</span>
                    <ArrowRight size={13} className="shrink-0 text-slate-400" />
                    <span className="font-medium text-slate-800">{m.loc_apres ?? "—"}</span>
                  </span>
                ) : (
                  <span className="text-[12px] italic text-slate-400">
                    sans déplacement
                  </span>
                )}
              </Td>
              <Td className="font-mono text-[12px] text-slate-500">
                {m.num_document ?? "—"}
              </Td>
              <Td className="max-w-[220px] truncate text-[12.5px] text-slate-500">
                {m.commentaire ?? "—"}
              </Td>
            </>
          );
        }}
      />
    </div>
  );
}
