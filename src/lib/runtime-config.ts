"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Réglages lus dans le navigateur à l'EXÉCUTION, pas figés à la compilation.
//
// POURQUOI PAS SIMPLEMENT NEXT_PUBLIC_*
// Next.js remplace `process.env.NEXT_PUBLIC_…` par sa valeur littérale au
// moment du build. Dans un produit livré en image Docker à plusieurs
// établissements, cela voudrait dire une image par client — et un nouveau
// build à chaque fois qu'une adresse change. `public/config.js` est un
// fichier ordinaire, éditable sur le serveur, qui pose `window.__SIH_CONFIG__`
// et l'emporte sur la valeur du build. En développement il est vide et rien
// ne change.
//
// C'est le mécanisme que le frontend MAGASINS utilise déjà ; il est repris ici
// mot pour mot pour que les quatre applications se configurent pareil.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

interface RuntimeConfig {
  /** Le portail SIH : destination de « Retour » et de « Aide et FAQ ». */
  portalUrl?: string;
}

declare global {
  interface Window {
    __SIH_CONFIG__?: RuntimeConfig;
  }
}

function runtime(): RuntimeConfig {
  return (typeof window !== "undefined" && window.__SIH_CONFIG__) || {};
}

/** Valeur du build : ce avec quoi les pages ont été pré-rendues. */
const PORTAL_BUILD = (process.env.NEXT_PUBLIC_PORTAL_URL ?? "").trim();

/**
 * L'adresse du portail SIH, ou "" quand aucun portail n'est configuré.
 *
 * LA CHAÎNE VIDE EST UN CAS NORMAL, PAS UN OUBLI. Une clinique qui n'achète
 * que la DEP n'a pas de portail : un bouton « Retour » pointant vers un hôte
 * inexistant est pire que pas de bouton. Les appelants masquent donc le lien
 * quand la valeur est vide, au lieu de replier sur une adresse en dur — ce
 * qu'on faisait, et qui embarquait l'IP d'un hôpital précis dans le produit.
 */
export function portalUrl(): string {
  return (runtime().portalUrl ?? "").trim() || PORTAL_BUILD;
}

/**
 * `portalUrl()` pour un lien rendu.
 *
 * Les pages sont pré-rendues là où config.js n'existe pas : on part donc de
 * la valeur du build — celle avec laquelle le HTML a été produit — puis on
 * applique celle de l'exécution une fois monté. Sans ce détour, le premier
 * rendu client différerait du HTML serveur et React signalerait une
 * incohérence d'hydratation.
 */
export function usePortalUrl(): string {
  const [url, setUrl] = useState(PORTAL_BUILD);
  useEffect(() => setUrl(portalUrl()), []);
  return url;
}
