"use client";

import { useEffect, useState } from "react";
import FeuilleImpression from "@/components/ui/FeuilleImpression";
import { getFicheTransfert } from "@/services/inv/mouvements";
import { formatDate } from "@/components/modules/articles/ArticleDetailModal";
import type { FicheTransfertResponse } from "@/types/inv/mouvement";

/**
 * LA FICHE DE TRANSFERT À IMPRIMER — le papier que le service signe.
 *
 * Le document existait depuis le premier transfert accompagné d'une fiche : il
 * était numéroté (FT-AAAA-nnnnn), enregistré, et affiché dans la colonne
 * « Document » de l'écran Transferts. Mais rien ne savait le RELIRE — le numéro
 * ne menait nulle part. Or c'est exactement ce numéro que l'on cherche quand un
 * meuble est contesté six mois plus tard.
 *
 * ── CE QUE PORTE LA FICHE ───────────────────────────────────────────────────
 * Les DEUX bouts en tête (service et local de départ, service et local
 * d'arrivée), puis la liste des biens, puis deux signatures. Le tableau donne
 * le n° d'inventaire, la désignation, la marque, le n° de série et l'état :
 * assez pour qu'on puisse, le papier en main, vérifier que ce qui est arrivé
 * est bien ce qui est parti.
 *
 * ── LES DEUX SIGNATURES SONT LE POINT ───────────────────────────────────────
 * Une fiche de transfert n'est pas un reçu : elle constate un TRANSFERT DE
 * RESPONSABILITÉ entre deux services. Celui qui cède et celui qui reçoit
 * signent tous les deux, sinon le papier ne prouve rien et le bien reste
 * comptablement chez le premier.
 *
 * ── CE COMPOSANT N'EST PAS UN ÉCRAN ─────────────────────────────────────────
 * Il ne rend QUE le document, monté hors champ dans le `#print-ticket` de la
 * page — même montage que la fiche d'article et que le magasin. `onPret`
 * prévient quand les données sont peintes : sans ce signal, `window.print()`
 * sortirait une feuille vide.
 */
export default function FicheTransfertPrint({
  id, onPret,
}: {
  id: number;
  onPret?: (pret: boolean) => void;
}) {
  const [data, setData] = useState<FicheTransfertResponse | null>(null);

  useEffect(() => {
    let annule = false;
    onPret?.(false);
    setData(null);

    void getFicheTransfert(id)
      .then((d) => {
        if (annule) return;
        setData(d);
        onPret?.(true);
      })
      // Une fiche illisible ne doit pas bloquer l'écran : on débloque
      // l'impression, le navigateur sortira une feuille vide et l'utilisateur
      // verra l'erreur à l'écran.
      .catch(() => { if (!annule) onPret?.(true); });

    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!data) return null;

  const d = data.document;

  return (
    <FeuilleImpression
      titre={(d.type_libelle ?? "FICHE DE TRANSFERT").toUpperCase()}
      numero={d.numero}
      date={d.date_document ? formatDate(d.date_document) : "—"}
      service={d.service_source}
      localisation={d.loc_source}
      correspondant={
        <Bloc
          titre="Cédé par"
          service={d.service_source}
          local={d.loc_source}
        />
      }
      complement={
        <Bloc
          titre="Reçu par"
          service={d.service_destination}
          local={d.loc_destination}
        />
      }
      signatures={["Le service cédant", "Le service bénéficiaire"]}
    >
      <table className="bon-table">
        <thead>
          <tr>
            <th style={{ width: "18%" }}>N° inventaire</th>
            <th>Désignation</th>
            <th style={{ width: "16%" }}>Marque</th>
            <th style={{ width: "16%" }}>N° série</th>
            <th style={{ width: "14%" }}>État</th>
          </tr>
        </thead>
        <tbody>
          {data.lignes.map((l) => (
            <tr key={l.id_article}>
              <td style={{ fontFamily: "monospace" }}>{l.num_inventaire}</td>
              <td>{l.designation}</td>
              <td>{l.marque ?? "—"}</td>
              <td>{l.num_serie ?? "—"}</td>
              <td>{l.etat ?? "—"}</td>
            </tr>
          ))}
          {data.lignes.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", fontStyle: "italic" }}>
                Aucun bien rattaché à cette fiche.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} style={{ fontWeight: 700 }}>
              {data.lignes.length} bien{data.lignes.length > 1 ? "s" : ""} transféré
              {data.lignes.length > 1 ? "s" : ""}
            </td>
          </tr>
        </tfoot>
      </table>

      {(d.motif || d.observation) && (
        <div style={{ marginTop: "4mm", fontSize: "11px" }}>
          {d.motif && (
            <p style={{ margin: "0 0 1mm" }}>
              <b>Motif :</b> {d.motif}
            </p>
          )}
          {d.observation && (
            <p style={{ margin: 0 }}>
              <b>Observation :</b> {d.observation}
            </p>
          )}
        </div>
      )}
    </FeuilleImpression>
  );
}

/** Un des deux bouts du transfert, en tête de fiche. */
function Bloc({
  titre, service, local,
}: { titre: string; service: string | null; local: string | null }) {
  return (
    <>
      <div style={{ fontWeight: 700, marginBottom: "1mm" }}>{titre}</div>
      <div>
        <b>Service :</b> {service ?? "—"}
      </div>
      <div>
        <b>Local :</b> {local ?? "—"}
      </div>
    </>
  );
}
