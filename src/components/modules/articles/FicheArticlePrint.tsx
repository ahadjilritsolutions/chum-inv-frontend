"use client";

import { useEffect, useState, type ReactNode } from "react";
import FeuilleImpression from "@/components/ui/FeuilleImpression";
import { getArticle, getHistorique } from "@/services/inv/articles";
import { getReference } from "@/services/inv/reference";
import type { ArticleDetail, HistoriqueLigne } from "@/types/inv/article";

/**
 * LA FICHE D'ARTICLE À IMPRIMER — le « Information-Mobilier » du legacy, dans
 * la feuille de magasin-migration.
 *
 * Le contenu est celui de `sortie/hmobilier.php`, bloc pour bloc, parce que
 * c'est ce que les agents ont l'habitude de lire et de classer :
 *
 *   ① le bien              — n°, libellé, catégorie/famille/sous-famille,
 *                            statut, description, modèle, n° de série, dates,
 *                            facture, valeur, pays
 *   ② le fournisseur       — avec ses coordonnées
 *   ③ le fabricant         — avec ses coordonnées
 *   ④ la localisation      — libellé, description, code et libellé du service
 *   ⑤ les modifications    — date et utilisateur
 *
 * Les blocs ② et ③ portent des téléphones et des e-mails parce qu'une fiche
 * sert à APPELER quelqu'un — le vendeur pour faire jouer une garantie, le
 * fabricant pour commander une pièce. Les retirer ferait une fiche qu'il faut
 * compléter à l'écran avant de pouvoir s'en servir.
 *
 * ── CE COMPOSANT N'EST PAS UN ÉCRAN ─────────────────────────────────────────
 * Il ne rend QUE le document, et il est monté hors champ dans le conteneur
 * `#print-ticket` de la page — le même montage que le magasin. La version
 * précédente ouvrait un aperçu plein écran avant d'imprimer : une étape pour
 * rien, puisqu'on n'y modifiait rien et que l'aperçu du navigateur affichait
 * la même chose juste après.
 *
 * `onPret` prévient quand les données ET le QR sont peints. Sans ce signal,
 * `window.print()` sortirait une feuille vide ou la précédente.
 */
export default function FicheArticlePrint({
  id, onPret,
}: {
  id: number;
  /** Appelé à true quand le document est peint et imprimable. */
  onPret?: (pret: boolean) => void;
}) {
  const [detail, setDetail] = useState<ArticleDetail | null>(null);
  const [historique, setHistorique] = useState<HistoriqueLigne[]>([]);
  const [service, setService] = useState<{ lib: string; cod: string | null } | null>(null);

  useEffect(() => {
    let annule = false;
    onPret?.(false);
    setDetail(null);

    void Promise.all([
      getArticle(id),
      // L'historique est accessoire : une fiche reste imprimable si le droit
      // sur l'historique manque, elle est seulement plus courte.
      getHistorique(id).catch(() => [] as HistoriqueLigne[]),
      getReference().catch(() => null),
    ])
      .then(([a, h, ref]) => {
        if (annule) return;
        setDetail(a);
        setHistorique(h);
        const sv = ref?.services.find((x) => x.id_service === a.id_service);
        setService(sv ? { lib: sv.lib_service, cod: sv.cod_service } : null);
        onPret?.(true);
      })
      .catch(() => { if (!annule) onPret?.(true); });

    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!detail) return null;

  return (
<FeuilleImpression
  titre="FICHE D'ARTICLE"
  numero={detail.num_inventaire}
  // Pour un article du registre, le numéro du cahier papier est
  // rappelé ici quand il diffère — la feuille doit permettre de
  // rapprocher les deux sans retourner à l'écran.
  numeroLegacy={
    detail.num_registre && detail.num_registre !== detail.num_inventaire
      ? detail.num_registre
      : null
  }
  date={formatDate(detail.date_inventaire) || formatDate(detail.date_creation) || "—"}
  service={service?.lib ?? null}
  localisation={detail.localisation ?? null}
  correspondant={
    <>
      <div className="bon-partie-titre">Identification</div>
      <Ligne k="Désignation" v={detail.designation} />
      <Ligne k="Catégorie" v={detail.categorie} />
      <Ligne k="Famille" v={detail.famille} />
      <Ligne k="Sous-famille" v={detail.sous_famille} />
      <Ligne
        k="Voie"
        v={detail.est_registre ? "Registre (numéro saisi)" : "Physique (numéro attribué)"}
      />
    </>
  }
  complement={
    <>
      <div className="bon-partie-titre">Situation</div>
      <Ligne k="Statut" v={detail.statut} />
      <Ligne k="État" v={detail.etat} />
      <Ligne k="Présence" v={detail.presence} />
      <Ligne k="Valeur" v={formatValeur(detail.valeur)} />
    </>
  }
  signatures={["Le responsable du service", "Le bureau d'inventaire"]}
>
  <Bloc titre="Information article">
    <Grille>
      <Ligne k="N° d'inventaire" v={detail.num_inventaire} />
      <Ligne k="N° au registre" v={detail.num_registre} />
      <Ligne k="Modèle" v={detail.modele} />
      <Ligne k="Marque" v={detail.marque} />
      <Ligne k="N° de série" v={detail.num_serie} />
      <Ligne k="Pays d'origine" v={detail.pays_origine} />
      <Ligne k="Mise en service" v={formatDate(detail.date_mise_service)} />
      <Ligne k="Dernier inventaire" v={formatDate(detail.date_inventaire)} />
      <Ligne k="N° de facture" v={detail.num_facture} />
      <Ligne k="Date de facture" v={formatDate(detail.date_facture)} />
      <Ligne k="Document de réception" v={detail.num_doc_reception} />
      <Ligne k="Valeur" v={formatValeur(detail.valeur)} />
    </Grille>
    {detail.observation && (
      <p className="mt-2 text-[11px]">
        <b>Observation :</b> {detail.observation}
      </p>
    )}
  </Bloc>

  <Bloc titre="Fournisseur">
    {detail.fournisseur || detail.fournisseur_texte_legacy ? (
      <Grille>
        <Ligne k="Raison sociale" v={detail.fournisseur ?? detail.fournisseur_texte_legacy} />
        <Ligne k="Adresse" v={detail.fournisseur_adresse} />
        <Ligne
          k="Contact"
          v={joindre(detail.fournisseur_prenom, detail.fournisseur_nom)}
        />
        <Ligne k="Téléphone" v={detail.fournisseur_telephone} />
        <Ligne k="E-mail" v={detail.fournisseur_email} />
      </Grille>
    ) : (
      <Vide>Aucun fournisseur renseigné.</Vide>
    )}
  </Bloc>

  <Bloc titre="Fabricant">
    {detail.fabricant || detail.fabricant_texte_legacy ? (
      <Grille>
        <Ligne k="Raison sociale" v={detail.fabricant ?? detail.fabricant_texte_legacy} />
        <Ligne k="Adresse" v={detail.fabricant_adresse} />
        <Ligne k="Pays" v={detail.fabricant_pays} />
        <Ligne
          k="Contact"
          v={joindre(detail.fabricant_prenom, detail.fabricant_nom)}
        />
        <Ligne k="Téléphone" v={detail.fabricant_telephone} />
        <Ligne k="E-mail" v={detail.fabricant_email} />
      </Grille>
    ) : (
      <Vide>Aucun fabricant renseigné.</Vide>
    )}
  </Bloc>

  <Bloc titre="Localisation">
    <Grille>
      <Ligne k="Libellé" v={detail.localisation} />
      <Ligne k="Code" v={detail.localisation_code} />
      <Ligne k="Description" v={detail.localisation_description} />
      <Ligne k="Étage / n°" v={joindre(detail.localisation_etage, detail.localisation_numero)} />
      <Ligne k="Code service" v={service?.cod ?? null} />
      <Ligne k="Service" v={service?.lib ?? null} />
    </Grille>
  </Bloc>

  {historique.length > 0 && (
    <Bloc titre="Modifications effectuées">
      <table className="bon-table">
        <thead>
          <tr>
            <th style={{ width: "26%" }}>Date</th>
            <th style={{ width: "24%" }}>Champ</th>
            <th>Ancienne valeur</th>
            <th>Nouvelle valeur</th>
          </tr>
        </thead>
        <tbody>
          {historique.slice(0, 18).map((h) => (
            <tr key={h.id_historique}>
              <td>{formatDate(h.date_modification)}</td>
              <td>{h.champ}</td>
              <td>{h.ancienne_valeur ?? "—"}</td>
              <td>{h.nouvelle_valeur ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {historique.length > 18 && (
        <p className="mt-1 text-[10px] italic">
          {historique.length - 18} modification(s) antérieure(s) non imprimée(s).
        </p>
      )}
    </Bloc>
  )}
</FeuilleImpression>
  );
}

// ── Petites briques de mise en page ─────────────────────────────────────────

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="print-label" style={{ marginBottom: "4mm" }}>
      <h3
        style={{
          fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
          borderBottom: "1px solid #000", paddingBottom: "1mm", marginBottom: "2mm",
        }}
      >
        {titre}
      </h3>
      {children}
    </section>
  );
}

function Grille({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 6mm" }}>
      {children}
    </div>
  );
}

/** Une ligne « libellé : valeur ». Un champ vide s'imprime « — », jamais rien :
 *  une case blanche se lit comme un oubli, un tiret comme une absence connue. */
function Ligne({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <p style={{ fontSize: "11px", margin: "0.6mm 0" }}>
      {/* paddingRight et non un simple espace : quand le libelle depasse la
          largeur minimale, le texte colle a la valeur (« Statut :En service »).
          Une marge tient dans les deux cas. */}
      <span
        style={{
          display: "inline-block", minWidth: "34mm", paddingRight: "2mm", color: "#333",
        }}
      >
        {k} :
      </span>
      <b>{v && String(v).trim() !== "" ? v : "—"}</b>
    </p>
  );
}

function Vide({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: "11px", fontStyle: "italic" }}>{children}</p>;
}

function joindre(a: string | null | undefined, b: string | null | undefined): string | null {
  const t = [a, b].filter((x) => x && String(x).trim() !== "").join(" ");
  return t === "" ? null : t;
}

function formatValeur(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `${n.toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} DA`;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  const s = String(d).slice(0, 10);
  const [a, m, j] = s.split("-");
  return a && m && j ? `${j}/${m}/${a}` : s;
}
