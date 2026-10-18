// ─────────────────────────────────────────────────────────────────────────────
// L&R IT Solutions' own identity — what this software IS, as opposed to the
// établissement that bought it (which lives in the database; see types.ts).
//
// The split matters: the product's palette, typeface and mark never change
// from one customer to the next, while the name, slogan and logo on a printed
// document always do. Only the second group is configurable.
//
// The colours are sampled from the supplied logo files, not eyeballed:
//   navy  #0f1b3d  — 85 % of the app tile, the ink of the light lockup
//   gold  #a8812e  — the hexagon mark, as it is in the logo file
//   gold  #c4a660  — SOFTENED for the interface: 7.2:1 on the navy
//                    chrome instead of 4.7:1. Accent only — never
//                    text on white, and never white on top of it.
//   cream #ebe8e1  — the lockup's own background, the ink of the dark lockup
//
// This file is IDENTICAL in every SIH frontend. Change it in one, change it in
// all — and keep it in step with the backend's branding.defaults.ts.
// ─────────────────────────────────────────────────────────────────────────────

/** The product's own identity, shown by an installation that has not
 *  configured an établissement yet (and by a demo for a prospective buyer). */
export const PRODUIT = {
  nom: "Système d'Information Hospitalier",
  nom_court: "SIH",
  slogan: "La plateforme SIH full Web pour l'hôpital",  // tagline de lritsolutions.com
  editeur: "L&R IT Solutions",
} as const;

/** Brand palette. Mirrored as CSS custom properties in globals.css — use the
 *  CSS variables for styling and these constants only where a colour has to
 *  reach JavaScript (a canvas, a generated PDF, an inline <svg> fill). */
export const COULEURS = {
  navy: "#0d1835",
  navyClair: "#14234e",
  navyPale: "#1e3270",
  or: "#c9a84c",
  orClair: "#e4c36e",
  orFonce: "#9a7c30",
  sable: "#f5f0e8",
  texte: "#111827",
} as const;

/**
 * Bundled brand artwork, under /public/brand. App-absolute: pass each through
 * the app's own base-path helper before putting it in an `src`.
 *
 *   mark        the gold hexagon alone, transparent — document headers, the
 *               centre of a QR code, anywhere the navy tile would fight the page
 *   icon*       the navy app tile, for favicons and install icons
 *   lockup      full "SIH · Système d'Information Hospitalier" wordmark in navy
 *               ink, transparent — for light backgrounds
 *   lockupSombre the same wordmark in cream ink — for the navy chrome
 */
export const VISUELS = {
  mark: "/brand/mark.png",
  lockup: "/brand/lockup.png",
  lockupSombre: "/brand/lockup-dark.png",
  icon: "/brand/icon-512.png",
  icon180: "/brand/icon-180.png",
  icon64: "/brand/icon-64.png",
} as const;
