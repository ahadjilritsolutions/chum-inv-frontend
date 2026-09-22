// ─────────────────────────────────────────────────────────────────────────────
// Visual language, shared with the DEP frontend.
//
// The DEP, the LIS and this app are applications of the same SIH and staff move between them
// in one session, so the chrome and the component styling are deliberately
// identical. The gradients live as CSS custom properties in globals.css (same
// values as chum-dep-frontend); this module only re-exports them for the few
// places that need an inline `style`, plus the LIS-specific status palette.
// ─────────────────────────────────────────────────────────────────────────────

/** Navbar / page-header gradient. */
export const GRADIENT_BRAND = "var(--gradient-brand)";

/** Sidebar gradient. */
export const GRADIENT_SIDEBAR = "var(--gradient-sidebar)";

/** Application background behind the cards. */
export const PAGE_BG = "var(--app-bg)";

/** Solid navy used by table headers. */
export const HEADER_NAVY = "var(--header-navy)";

/** Fixed navbar height — the offset every fixed element is measured from. */
export const NAVBAR_HEIGHT = 57;

/** Collapsed sidebar rail width on desktop. */
export const SIDEBAR_RAIL = 60;

/** Expanded sidebar width (hover on desktop, drawer on mobile). */
export const SIDEBAR_WIDTH = 240;

/**
 * Card surface used across both apps: white, softly elevated, generously
 * rounded. Kept as a class string rather than an inline style so Tailwind's
 * hover/responsive variants can be appended at the call site.
 */
export const CARD_CLS = "bg-white rounded-2xl shadow-sm";


/**
 * Neutral chip, for a value with no status colour of its own.
 *
 * Status palettes live in lib/inv/statut-colors.ts — the canonical order and
 * colours shared by the sidebar, the filter pills, the table badges and the
 * dashboard tiles. Import the helpers from there, never from here, so all four
 * surfaces say the same thing with the same hue.
 */
export const NEUTRAL_CHIP = { bg: "#f1f5f9", fg: "#475569" };

/**
 * Chips for an article's LIFECYCLE status.
 *
 * Same shape as the magasin's DOCUMENT_STYLES so the two applications paint
 * their lists the same way. Colours come from db-script BLOCK 002, which is
 * what the API also returns — these are the fallback for surfaces that render
 * before a payload arrives.
 */
export const STATUT_ARTICLE_STYLES = {
  en_service:      { bg: "#dcfce7", fg: "#15803d", label: "En service" },
  propose_reforme: { bg: "#fef3c7", fg: "#b45309", label: "Proposé à la réforme" },
  reforme:         { bg: "#fee2e2", fg: "#b91c1c", label: "Réformé" },
  sorti:           { bg: "#f1f5f9", fg: "#475569", label: "Sorti" },
} as const;

export const statutArticleChip = (code: string | null | undefined) =>
  STATUT_ARTICLE_STYLES[code as keyof typeof STATUT_ARTICLE_STYLES] ?? NEUTRAL_CHIP;

/**
 * Chips for a movement TYPE.
 *
 * The direction of a movement is the one thing that must never be misread on a
 * history list — a transfert in and a réforme look identical apart from this —
 * so, as in the magasin, the type is colour-coded before anything else.
 */
export const MOUVEMENT_STYLES = {
  creation:            { bg: "#cffafe", fg: "#0e7490", label: "Création" },
  transfert:           { bg: "#dbeafe", fg: "#1d4ed8", label: "Transfert" },
  proposition_reforme: { bg: "#fef3c7", fg: "#b45309", label: "Proposition réforme" },
  reforme:             { bg: "#fee2e2", fg: "#b91c1c", label: "Réforme" },
  mise_service:        { bg: "#dcfce7", fg: "#15803d", label: "Mise en service" },
  sortie:              { bg: "#f1f5f9", fg: "#475569", label: "Sortie" },
  changement_etat:     { bg: "#ffedd5", fg: "#c2410c", label: "Changement d'état" },
  changement_presence: { bg: "#ede9fe", fg: "#6d28d9", label: "Présence" },
  suppression:         { bg: "#fee2e2", fg: "#b91c1c", label: "Suppression" },
  restauration:        { bg: "#dcfce7", fg: "#15803d", label: "Restauration" },
} as const;

export const mouvementChip = (type: string | null | undefined) =>
  MOUVEMENT_STYLES[type as keyof typeof MOUVEMENT_STYLES] ?? NEUTRAL_CHIP;

/** The chip element itself, so no screen hand-rolls the same span. */
export const chipStyle = (c: { bg: string; fg: string }) => ({
  background: c.bg,
  color: c.fg,
});
