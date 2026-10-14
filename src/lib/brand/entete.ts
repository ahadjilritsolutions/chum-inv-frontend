// ─────────────────────────────────────────────────────────────────────────────
// The printed document header, resolved once.
//
// Several renderers draw this header — React sheets (PrintTemplate,
// FeuilleImpression), HTML-string sheets built as template literals (the
// dossier prints), and the live preview in Configuration. They must all
// produce the SAME masthead, so the decisions that drive it — which lines
// exist, in what order, how the date reads — live here instead of being
// re-implemented, slightly differently, in each one.
//
// IDENTICAL in every SIH frontend.
// ─────────────────────────────────────────────────────────────────────────────

import type { Branding, EnteteConfig } from "./types";

export const LIGNE_REPUBLIQUE = "République Algérienne Démocratique et Populaire";

/** One resolved line of the header's text column, in render order.
 *
 *  `kind` is what the renderer styles on, so a renderer never has to know
 *  WHY a line is there — only how big and in which script to draw it. */
export interface EnteteLigne {
  kind: "republique" | "nom" | "nom_ar" | "slogan" | "contact" | "libre";
  text: string;
  /** Arabic lines must be drawn right-to-left, in every renderer. */
  rtl?: boolean;
}

export interface EnteteResolu {
  cfg: EnteteConfig;
  lignes: EnteteLigne[];
  /** Whether to render the logo box at all. */
  afficherLogo: boolean;
  /** Whether to render the QR box at all. */
  afficherQr: boolean;
  /** CSS text-align for the middle column — the logo and QR keep their own
   *  corners regardless. */
  alignement: "left" | "center";
  /** "Alger le : 14/10/2026", or "Le : 14/10/2026" with no city configured. */
  ligneDate: (dateStr: string) => string;
}

/** Address, commune and wilaya on one line, skipping whatever is not filled
 *  in — so an établissement with only a wilaya prints "Alger", not ", , Alger". */
function ligneAdresse(b: Branding): string {
  return [b.adresse, b.commune, b.wilaya]
    .map((p) => p?.trim())
    .filter((p): p is string => !!p)
    .join(", ");
}

/** Phone and email share a line: two near-empty lines waste vertical space on
 *  a sheet that is mostly content. */
function ligneContact(b: Branding, cfg: EnteteConfig): string {
  const parts: string[] = [];
  if (cfg.afficher_telephone && b.telephone?.trim()) parts.push(`Tél : ${b.telephone.trim()}`);
  if (cfg.afficher_email && b.email?.trim()) parts.push(b.email.trim());
  return parts.join(" · ");
}

/** Turns the identity + its switches into the exact lines to draw. */
export function resoudreEntete(b: Branding): EnteteResolu {
  const cfg = b.entete;
  const lignes: EnteteLigne[] = [];

  if (cfg.afficher_republique) {
    lignes.push({ kind: "republique", text: LIGNE_REPUBLIQUE });
  }
  // Arabic above Latin, which is the order every Algerian masthead uses.
  if (cfg.afficher_nom_ar && b.nom_ar?.trim()) {
    lignes.push({ kind: "nom_ar", text: b.nom_ar.trim(), rtl: true });
  }
  if (cfg.afficher_nom && b.nom?.trim()) {
    lignes.push({ kind: "nom", text: b.nom.trim() });
  }
  if (cfg.afficher_slogan && b.slogan?.trim()) {
    lignes.push({ kind: "slogan", text: b.slogan.trim() });
  }
  if (cfg.afficher_adresse) {
    const adresse = ligneAdresse(b);
    if (adresse) lignes.push({ kind: "contact", text: adresse });
  }
  const contact = ligneContact(b, cfg);
  if (contact) lignes.push({ kind: "contact", text: contact });

  // Free text is multi-line by design — one EnteteLigne per typed line, so no
  // renderer ever has to deal with a "\n" inside a line.
  if (cfg.texte?.trim()) {
    for (const raw of cfg.texte.split("\n")) {
      const t = raw.trim();
      if (t) lignes.push({ kind: "libre", text: t });
    }
  }

  return {
    cfg,
    lignes,
    afficherLogo: cfg.afficher_logo,
    afficherQr: cfg.afficher_qr,
    alignement: cfg.alignement === "left" ? "left" : "center",
    ligneDate: (dateStr: string) =>
      cfg.ville?.trim() ? `${cfg.ville.trim()} le : ${dateStr}` : `Le : ${dateStr}`,
  };
}

/** Escapes a resolved line for the renderers that build their sheet as an
 *  HTML string rather than as React. An établissement name with an "&" in it
 *  must not be able to break the markup around it. */
export function echapperHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The header's text column as an HTML string, for the template-literal
 * renderers. `classes` maps each line kind to the CSS class that sheet
 * already uses, so each document keeps its own typography while the CONTENT
 * stays identical to what the React renderers draw.
 */
export function enteteLignesHtml(
  resolu: EnteteResolu,
  classes: Partial<Record<EnteteLigne["kind"], string>>,
): string {
  return resolu.lignes
    .map((l) => {
      const cls = classes[l.kind] ?? "";
      const dir = l.rtl ? ' dir="rtl"' : "";
      return `<div class="${cls}"${dir}>${echapperHtml(l.text)}</div>`;
    })
    .join("\n");
}
