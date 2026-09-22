"use client";

/**
 * L'ÉCUSSON DU CHU, en data-URL, chargé UNE fois par session.
 *
 * ── POURQUOI UNE DATA-URL ET NON UNE BALISE <img src="/logo.png"> ───────────
 * Ces documents partent à l'imprimante dès qu'ils sont peints. Une image encore
 * en cours de téléchargement au moment où `window.print()` s'exécute sort
 * BLANCHE — et personne ne s'en aperçoit avant d'avoir la feuille en main. En
 * data-URL, l'image est déjà dans le DOM : il n'y a plus de course.
 *
 * ── POURQUOI UN CACHE DE MODULE ────────────────────────────────────────────
 * Une planche de trente étiquettes, c'est trente fois le même écusson. Sans
 * cache, ce serait trente requêtes et trente conversions base64 sur le réseau
 * d'un couloir d'hôpital. `logoPromise` garde aussi les appels SIMULTANÉS :
 * trente composants montés dans le même tick partagent une seule requête.
 *
 * Extrait de FeuilleImpression, où ce code vivait seul, le jour où l'étiquette
 * en a eu besoin elle aussi. Deux copies auraient divergé sur le chemin du
 * fichier — et l'une des deux aurait fini par imprimer un cadre vide.
 */

let logoCache: string | null = null;
let logoPromise: Promise<string | null> | null = null;

export async function chargerLogo(): Promise<string | null> {
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
    // Un écusson manquant ne doit pas empêcher d'imprimer : l'étiquette reste
    // lisible sans lui, le numéro et le QR sont ce qui compte.
    .catch(() => null);

  return logoPromise;
}
