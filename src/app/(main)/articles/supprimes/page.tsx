"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, PackageX, RotateCcw } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import ListToolbar from "@/components/ui/ListToolbar";
import DataTable, { Td } from "@/components/ui/DataTable";
import IconAction from "@/components/ui/IconAction";
import { Banner } from "@/components/ui/Form";
import AccessPending from "@/components/ui/AccessPending";
import ArticleFormModal from "@/components/modules/articles/ArticleFormModal";
import ArticleDetailModal from "@/components/modules/articles/ArticleDetailModal";
import { useRequireAccess } from "@/lib/auth/useRequireAccess";
import { useAccess } from "@/lib/auth/AccessProvider";
import { ACCESS } from "@/lib/access";
import { listArticles } from "@/services/inv/articles";
import { getReference } from "@/services/inv/reference";
import { formatDate } from "@/components/modules/articles/ArticleDetailModal";
import type { ArticleRow } from "@/types/inv/article";
import type { ReferenceFeed } from "@/types/inv/reference";

const TAILLE = 25;

/**
 * ARTICLES SUPPRIMÉS — la corbeille du registre, et le vivier de numéros.
 *
 * ── POURQUOI UN ÉCRAN À PART ────────────────────────────────────────────────
 * La suppression est LOGIQUE : la ligne reste, datée et signée, avec tout son
 * historique. Un filtre « supprimés » dans la liste principale suffisait à les
 * voir, mais pas à en faire quelque chose — on y arrivait par hasard, au
 * milieu des 2 932 autres, sans que rien ne dise que ces lignes-là appellent
 * une décision.
 *
 * ── RESTAURER, C'EST SURTOUT RÉEMPLOYER UN NUMÉRO ───────────────────────────
 * Le geste n'est presque jamais « j'ai supprimé par erreur ». C'est : le bien
 * d'origine est parti, l'étiquette collée sur le meuble est encore lisible, et
 * un autre bien prend sa place. La restauration ouvre donc le FORMULAIRE
 * D'ARTICLE pré-rempli : on garde le numéro, on corrige tout le reste.
 *
 * Le numéro n'y est pas modifiable — c'est précisément ce qu'on vient
 * conserver. Et l'historique n'est pas effacé : on lit, des années après, que
 * ce numéro a servi deux fois et à quoi.
 */
export default function ArticlesSupprimesPage() {
  const { allowed, loading: gating } = useRequireAccess(ACCESS.ARTICLES_VOIR_SUPPRIMES);
  const { can } = useAccess();

  const [lignes, setLignes] = useState<ArticleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [recherche, setRecherche] = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [ref, setRef] = useState<ReferenceFeed | null>(null);
  const [detail, setDetail] = useState<number | null>(null);
  /** L'article qu'on restaure — ouvre le formulaire pré-rempli. */
  const [aRestaurer, setARestaurer] = useState<number | null>(null);

  useEffect(() => {
    void getReference().then(setRef).catch(() => setRef(null));
  }, []);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const d = await listArticles({
        q: recherche || undefined,
        // `seuls` : cet écran ne montre QUE les supprimés. Mélanger les actifs
        // ferait proposer « restaurer » sur un article qui n'est pas parti.
        supprimes: "seuls",
        page,
        limit: TAILLE,
      });
      setLignes(d.articles);
      setTotal(d.total);
      setPages(d.pages);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setChargement(false);
    }
  }, [recherche, page]);

  useEffect(() => { void charger(); }, [charger]);

  if (gating || !allowed) return <AccessPending />;

  const nomService = (id: number | null) =>
    id === null
      ? null
      : ref?.services.find((s) => s.id_service === id)?.lib_service ?? null;

  return (
    <div className="space-y-4">
      <PageHero title="Articles supprimés" icon={PackageX} />

      <Link
        href="/articles"
        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-cyan-700 no-underline hover:underline"
      >
        <ArrowLeft size={14} />
        Retour au registre
      </Link>

      {erreur && <Banner type="error">{erreur}</Banner>}
      {info && <Banner type="ok">{info}</Banner>}

      <ListToolbar
        recherche={recherche}
        onRecherche={(v) => { setRecherche(v); setPage(1); }}
        placeholder="N° d'inventaire, désignation, n° de série, marque…"
        total={total}
      />

      <DataTable
        colonnes={[
          { titre: "N° inventaire" },
          { titre: "Désignation" },
          { titre: "Localisation" },
          { titre: "Supprimé le" },
          { titre: "Motif" },
          { titre: "Actions", className: "text-right" },
        ]}
        lignes={lignes}
        cle={(a) => a.id_article}
        chargement={chargement}
        messageVide="Aucun article supprimé."
        largeurMin={1000}
        page={page}
        pages={pages}
        onPage={setPage}
        rendu={(a) => (
          <>
            <Td className="whitespace-nowrap font-mono text-[12.5px] font-medium text-slate-700">
              {a.num_inventaire}
            </Td>
            <Td className="font-medium text-slate-800">{a.designation}</Td>
            <Td>
              <span className="block leading-tight">
                <span className="block truncate text-[12.5px] font-medium text-slate-700">
                  {nomService(a.id_service) ?? "—"}
                </span>
                <span className="block truncate text-[11.5px] text-slate-500">
                  {a.localisation ?? "—"}
                </span>
              </span>
            </Td>
            <Td className="whitespace-nowrap text-[12.5px] text-slate-600">
              {a.date_suppression ? formatDate(a.date_suppression) : "—"}
            </Td>
            <Td className="max-w-[240px] truncate text-[12.5px] text-slate-500">
              {a.motif_suppression ?? "—"}
            </Td>
            <Td>
              <div className="flex items-center justify-end gap-1.5">
                <IconAction title="Détails" tone="view" onClick={() => setDetail(a.id_article)}>
                  <Eye size={14} />
                </IconAction>
                {can(ACCESS.ARTICLES_RESTAURER) && (
                  <IconAction
                    title="Restaurer — le numéro est conservé, les informations se réécrivent"
                    tone="edit"
                    onClick={() => setARestaurer(a.id_article)}
                  >
                    <RotateCcw size={14} />
                  </IconAction>
                )}
              </div>
            </Td>
          </>
        )}
      />

      <ArticleDetailModal id={detail} onClose={() => setDetail(null)} />

      {/* Le formulaire d'article, en mode restauration : même écran, même
          validation, numéro verrouillé. */}
      <ArticleFormModal
        mode={aRestaurer !== null ? "restaurer" : null}
        id={aRestaurer}
        ref={ref}
        onClose={() => setARestaurer(null)}
        onSaved={(msg) => {
          setInfo(msg);
          setARestaurer(null);
          void charger();
        }}
      />
    </div>
  );
}
