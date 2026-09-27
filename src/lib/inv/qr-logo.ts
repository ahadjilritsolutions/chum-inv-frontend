"use client";

import QRCode from "qrcode";
import { chargerLogo } from "./logo";

/**
 * LE QR DE L'ÉTIQUETTE, AVEC L'ÉCUSSON DU CHU EN SON CENTRE.
 *
 * L'étiquette ne porte plus que DEUX choses : ce code et le texte. L'écusson
 * n'est plus une image posée à côté — il est DANS le code, comme sur les QR
 * qu'on voit partout ailleurs. Une vignette de 40 mm n'a pas la place de
 * montrer deux images ; le code doit rester le plus grand possible, puisque
 * c'est lui qu'on vise à bout de bras pendant une tournée.
 *
 * ── LE NIVEAU DE CORRECTION PASSE DE « L » À « H », ET CE N'EST PAS UN DÉTAIL
 * Poser un logo au milieu d'un QR, c'est EFFACER des modules. Le lecteur ne
 * reconstitue le message que si la redondance couvre la surface masquée :
 *
 *     L ≈  7 %   M ≈ 15 %   Q ≈ 25 %   H ≈ 30 %
 *
 * L'écusson occupe ici 25 % du côté, soit environ 5 % de la surface — mais la
 * marge doit rester large, parce qu'une étiquette collée sur un meuble
 * s'écaille, se raye et prend la poussière, et que ces dégâts s'AJOUTENT au
 * masque. « H » est donc le seul niveau raisonnable dès lors qu'on masque le
 * centre.
 *
 * Le choix précédent — « L », pour garder les modules gros — n'était juste que
 * tant que le code était intact. Avec un logo au milieu, « L » produit un code
 * qui s'affiche parfaitement et ne se scanne pas : la pire des pannes, parce
 * qu'elle ne se voit qu'une fois les étiquettes collées sur le parc.
 *
 * ── LE CARTOUCHE BLANC ──────────────────────────────────────────────────────
 * L'écusson est posé sur un carré blanc légèrement plus grand que lui. Sans ce
 * fond, les modules noirs affleurant le logo se lisent comme des modules
 * valides et brouillent le décodage. Le blanc dit clairement « ici, rien ».
 */

/** Côté du rendu, en pixels. Large : l'étiquette part à 300 dpi. */
const COTE = 600;

/** Part du côté occupée par le cartouche de l'écusson. */
const PART_LOGO = 0.25;

/** Le QR seul, sans écusson — le repli quand le canvas ou le logo manque. */
async function qrNu(texte: string): Promise<string> {
  return QRCode.toDataURL(texte, {
    errorCorrectionLevel: "H",
    margin: 0,
    width: COTE,
  });
}

function charger(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image illisible"));
    img.src = src;
  });
}

/**
 * Rend le QR d'un numéro d'inventaire, écusson au centre.
 *
 * Ne rejette jamais : une étiquette sans écusson reste parfaitement utilisable,
 * alors qu'une exception ici ferait échouer toute une planche. Le repli est le
 * code nu.
 */
export async function qrAvecLogo(texte: string): Promise<string> {
  let base: string;
  try {
    base = await qrNu(texte);
  } catch {
    return "";
  }

  if (typeof document === "undefined") return base;

  try {
    const logoSrc = await chargerLogo();
    if (!logoSrc) return base;

    const [qr, logo] = await Promise.all([charger(base), charger(logoSrc)]);

    const canvas = document.createElement("canvas");
    canvas.width = COTE;
    canvas.height = COTE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return base;

    ctx.drawImage(qr, 0, 0, COTE, COTE);

    // Le cartouche, puis l'écusson dedans en respectant ses proportions.
    const cote = COTE * PART_LOGO;
    const marge = cote * 0.1;
    const x = (COTE - cote) / 2;
    const y = (COTE - cote) / 2;

    ctx.fillStyle = "#fff";
    ctx.fillRect(x - marge, y - marge, cote + marge * 2, cote + marge * 2);

    const ratio = Math.min(cote / logo.width, cote / logo.height);
    const lw = logo.width * ratio;
    const lh = logo.height * ratio;
    ctx.drawImage(logo, (COTE - lw) / 2, (COTE - lh) / 2, lw, lh);

    return canvas.toDataURL("image/png");
  } catch {
    return base;
  }
}
