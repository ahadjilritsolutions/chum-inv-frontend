"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Pose les couleurs de l'établissement sur le document.
//
// globals.css déclare --sih-primaire / --sih-secondaire / --sih-accent aux
// valeurs de la marque, et TOUT en dérive : les dégradés du chrome, le navy
// des en-têtes de tableau, et l'échelle d'accent qui remplace les utilitaires
// cyan-* de Tailwind (1 164 appels dans la seule DEP). Réécrire ces trois
// propriétés sur <html> repeint donc l'application entière sans toucher une
// ligne de CSS.
//
// Ce composant ne rend RIEN. Il est monté une fois, haut dans l'arbre.
//
// Pourquoi écrire sur `document.documentElement` plutôt que rendre une
// balise <style> : les deux marchent, mais une propriété personnalisée posée
// sur l'élément racine s'applique aussi à ce qui sort du flux React — une
// fenêtre d'impression construite à la main, un portail — et n'a pas besoin
// d'être sérialisée puis reparsée à chaque changement.
//
// Une couleur nulle est RETIRÉE et non remise à la valeur du produit : la
// propriété disparaît, et la déclaration de globals.css reprend la main.
// C'est ce qui fait qu'une évolution de la palette produit rattrape les
// installations qui n'ont rien choisi.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { useBranding } from "@/lib/brand";

/** Nom de la propriété CSS par clé de couleur. */
const PROPRIETE = {
  primaire: "--sih-primaire",
  secondaire: "--sih-secondaire",
  accent: "--sih-accent",
} as const;

export default function ThemeApplier() {
  const branding = useBranding();
  const { primaire, secondaire, accent } = branding.couleurs;

  // Les trois valeurs sont listées une à une dans les dépendances plutôt que
  // l'objet : `couleurs` est recréé à chaque chargement du branding, et
  // dépendre de la référence relancerait l'effet pour rien.
  useEffect(() => {
    const racine = document.documentElement;
    const valeurs = { primaire, secondaire, accent };
    for (const [cle, prop] of Object.entries(PROPRIETE)) {
      const v = valeurs[cle as keyof typeof valeurs];
      if (v) racine.style.setProperty(prop, v);
      else racine.style.removeProperty(prop);
    }
  }, [primaire, secondaire, accent]);

  return null;
}
