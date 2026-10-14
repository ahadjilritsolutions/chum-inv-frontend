"use client";

/**
 * L'ÉCUSSON DE L'ÉTABLISSEMENT, en data-URL, chargé UNE fois par session.
 *
 * ── POURQUOI UNE DATA-URL ET NON UNE BALISE <img src="…"> ──────────────────
 * Ces documents partent à l'imprimante dès qu'ils sont peints. Une image encore
 * en cours de téléchargement au moment où `window.print()` s'exécute sort
 * BLANCHE — et personne ne s'en aperçoit avant d'avoir la feuille en main. En
 * data-URL, l'image est déjà dans le DOM : il n'y a plus de course.
 *
 * ── POURQUOI UN CACHE DE MODULE ────────────────────────────────────────────
 * Une planche de trente étiquettes, c'est trente fois le même écusson. Sans
 * cache, ce serait trente requêtes et trente conversions base64 sur le réseau
 * d'un couloir d'hôpital. Le cache garde aussi les appels SIMULTANÉS : trente
 * composants montés dans le même tick partagent une seule requête.
 *
 * ── CE QUI A CHANGÉ ────────────────────────────────────────────────────────
 * Le chemin du fichier n'est plus écrit en dur : le logo est celui que
 * l'établissement a téléversé (Configuration › Identité), servi par le
 * backend, et à défaut la marque du produit livrée dans /public/brand. Tout
 * cela vit dans lib/brand, partagé avec les frontends DEP et Magasin — ce
 * module n'est plus qu'un alias, gardé pour que les appelants (FeuilleImpression,
 * qr-logo) n'aient pas à savoir d'où vient l'image.
 */

import { loadLogoDataUrl } from "@/lib/brand";

export function chargerLogo(): Promise<string | null> {
  return loadLogoDataUrl();
}
