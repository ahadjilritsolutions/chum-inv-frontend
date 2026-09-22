"use client";

import { useEffect, useState, type ReactNode } from "react";
import QRCode from "qrcode";

/**
 * La feuille A4 de TOUT document imprimé du module — fiche d'article, fiche de
 * transfert, PV de réforme.
 *
 * Reprise de magasin-migration, qui la tenait du PrintTemplate de la DEP :
 * même géométrie (210×297 mm, marge 12 mm), même bandeau (écusson à gauche,
 * les trois lignes de la République au centre, QR à droite), même
 * titre-filet-« N° / Alger le : », même corps sans-serif 12 px. Les agents
 * classent une fiche d'article et un bon de sortie dans le même dossier.
 *
 * Ce qui change tient aux deux lignes de contexte : un document d'inventaire
 * nomme un SERVICE et une LOCALISATION là où le magasin nommait un magasin et
 * un dépôt. Le reste est identique, volontairement.
 *
 * Le QR encode la référence du document — pour une fiche d'article, son numéro
 * d'inventaire. Une feuille retrouvée dans un classeur se rouvre en la scannant
 * au lieu de retaper un numéro qu'il faut d'abord déchiffrer. C'est le même
 * code que celui collé sur le bien : les deux se répondent.
 *
 * `signatures` est facultatif : un bon s'émarge, une fiche d'article non, et
 * régler deux lignes de signature sous un état inviterait à parapher un
 * document qui n'engage à rien.
 */

export interface FeuilleImpressionProps {
  /** « FICHE D'ARTICLE », « PV DE RÉFORME » — le grand titre centré. */
  titre: string;
  numero: string;
  /**
   * Imprimé à côté du numéro quand la ligne migrée en portait un autre.
   *
   * Pour un article du registre, c'est là que s'affiche le numéro du registre
   * papier quand il diffère — la feuille doit permettre de rapprocher les deux
   * sans aller le chercher à l'écran.
   */
  numeroLegacy?: string | null;
  /** Overrides the "N° :" label — a report says "Famille :", not "N° :". */
  labelNumero?: string;
  /** « 06/09/2026 » — la date du document, pas celle du jour. */
  date: string;
  /** Le service concerné, imprimé sous l'établissement. */
  service?: string | null;
  /** La localisation précise, sous le service. */
  localisation?: string | null;
  /** Ce que le document concerne — pour une fiche, l'identification du bien. */
  correspondant?: ReactNode;
  /** Bloc de droite face au précédent : provenance, valeur, observations… */
  complement?: ReactNode;
  /** Légendes des deux signatures. Omises sur une fiche de consultation. */
  signatures?: [string, string];
  children: ReactNode;
}

// The logo has to be inline as a data-URL: the sheet is printed straight from
// the page, and an <img> still fetching over HTTP when print() fires comes out
// blank. Cached at module level so it is read once per session.
let logoCache: string | null = null;
let logoPromise: Promise<string | null> | null = null;

async function chargerLogo(): Promise<string | null> {
  if (logoCache) return logoCache;
  if (logoPromise) return logoPromise;
  if (typeof window === "undefined") return null;

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  logoPromise = fetch(`${window.location.origin}${base}/chu_logo_new.png`)
    .then((r) => {
      if (!r.ok) throw new Error(`logo HTTP ${r.status}`);
      return r.blob();
    })
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        }),
    )
    .then((d) => {
      logoCache = d;
      return d;
    })
    .catch(() => null);
  return logoPromise;
}

export default function FeuilleImpression({
  titre,
  numero,
  numeroLegacy,
  labelNumero = "N°",
  date,
  service,
  localisation,
  correspondant,
  complement,
  signatures,
  children,
}: FeuilleImpressionProps) {
  const [logo, setLogo] = useState<string | null>(logoCache);
  useEffect(() => {
    if (logo) return;
    let annule = false;
    void chargerLogo().then((d) => {
      if (!annule) setLogo(d);
    });
    return () => {
      annule = true;
    };
  }, [logo]);

  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    let annule = false;
    QRCode.toDataURL(numero, { errorCorrectionLevel: "M", margin: 1, width: 120 })
      .then((url) => {
        if (!annule) setQr(url);
      })
      .catch(() => {
        if (!annule) setQr(null);
      });
    return () => {
      annule = true;
    };
  }, [numero]);

  return (
    <div className="bon-feuille">
      {/* ── Masthead ───────────────────────────────────────────────────── */}
      <div className="bon-entete">
        <div className="bon-entete-cote">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo ? <img src={logo} alt="CHU Mustapha" className="bon-logo" /> : <div className="bon-logo" />}
        </div>

        <div className="bon-entete-centre">
          <div className="bon-republique">République Algérienne Démocratique et Populaire</div>
          <div className="bon-republique" dir="rtl">
            المركز الاستشفائي الجامعي مصطفى
          </div>
          <div className="bon-republique">Centre Hospitalo-Universitaire Mustapha</div>

          {service && <div className="bon-service">{service}</div>}
          {localisation && <div className="bon-service">{localisation}</div>}

          <div className="bon-titre">{titre}</div>

          <div className="bon-reperes">
            <span>
              {labelNumero} : <b>{numero}</b>
              {numeroLegacy && numeroLegacy !== numero && (
                <span className="bon-ancien"> (ancien n° {numeroLegacy})</span>
              )}
            </span>
            <span>Alger le : {date}</span>
          </div>
        </div>

        <div className="bon-entete-cote">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr ? <img src={qr} alt="" className="bon-qr" /> : <div className="bon-qr bon-qr-vide" />}
        </div>
      </div>

      {/* ── Who or what it concerns ────────────────────────────────────── */}
      {(correspondant || complement) && (
        <div className="bon-parties">
          <div className="bon-partie">{correspondant}</div>
          {complement && <div className="bon-partie bon-partie-droite">{complement}</div>}
        </div>
      )}

      <div className="bon-corps">{children}</div>

      {signatures && (
        <div className="bon-signatures">
          {signatures.map((s) => (
            <div className="bon-signature" key={s}>
              <div className="bon-signature-libelle">{s}</div>
              <div className="bon-signature-ligne" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
