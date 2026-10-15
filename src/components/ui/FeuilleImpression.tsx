"use client";

import { useEffect, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import { resoudreEntete, useBranding } from "@/lib/brand";
import { chargerLogo } from "@/lib/inv/logo";

/**
 * La feuille A4 de TOUT document imprimé du module — fiche d'article, fiche de
 * transfert, PV de réforme.
 *
 * Reprise de magasin-migration, qui la tenait du PrintTemplate de la DEP :
 * même géométrie (210×297 mm, marge 12 mm), même bandeau (écusson à gauche,
 * l'en-tête de l'établissement au centre, QR à droite), même
 * titre-filet-« N° / le : », même corps sans-serif 12 px. Les agents classent
 * une fiche d'article et un bon de sortie dans le même dossier.
 *
 * L'en-tête lui-même n'est plus écrit ici : il vient de Configuration ›
 * Identité, via lib/brand, partagé avec les frontends DEP et Magasin.
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
  // The établissement's identity + the header switches (Configuration ›
  // Identité). `resoudreEntete` decides which lines exist and in what order —
  // the same rules the DEP and Magasin sheets follow.
  const entete = resoudreEntete(useBranding());

  // Inline data-URL, not an <img src>: this sheet is printed as soon as it is
  // painted, and an image still downloading when print() fires comes out
  // blank. Cached in lib/brand, shared with the étiquettes.
  const [logo, setLogo] = useState<string | null>(null);
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
          {entete.afficherLogo && logo ? (
            <img src={logo} alt="" className="bon-logo" />
          ) : (
            <div className="bon-logo" />
          )}
        </div>

        <div className="bon-entete-centre" style={{ textAlign: entete.alignement }}>
          {entete.lignes.map((ligne, i) => (
            <div
              key={i}
              dir={ligne.rtl ? "rtl" : undefined}
              className={
                ligne.kind === "nom"
                  ? "bon-nom"
                  : ligne.kind === "republique" || ligne.kind === "nom_ar"
                    ? "bon-republique"
                    : "bon-service"
              }
            >
              {ligne.text}
            </div>
          ))}

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
            <span>{entete.ligneDate(date)}</span>
          </div>
        </div>

        <div className="bon-entete-cote">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {entete.afficherQr && qr ? (
            <img src={qr} alt="" className="bon-qr" />
          ) : (
            <div className="bon-qr bon-qr-vide" />
          )}
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
