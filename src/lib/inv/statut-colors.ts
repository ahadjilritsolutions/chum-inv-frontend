// ─────────────────────────────────────────────────────────────────────────────
// STATUS PALETTES — one source for the sidebar chips, the filter pills, the
// table badges and the dashboard tiles.
//
// Colours and canonical order MUST match chum-inv-backend/db-script.sql
// BLOCK 002, which stores the same hex on `inv_statut_article.couleur`,
// `inv_etat.couleur`, `inv_presence.couleur` and
// `inv_statut_intervention.couleur`. The API returns the stored colour, so a
// screen that reads it from the payload and a screen that reads it from here
// agree — this file exists for the places that have no payload yet (the
// sidebar, a filter pill rendered before the fetch resolves).
//
// THE ARTICLE PALETTES ENCODE THE POINT OF THIS MIGRATION. `etat` (condition)
// and `statut` (lifecycle) are separate axes: an article can be "réformé" AND
// "bon état", which the legacy could not express because it stored both in one
// column. So they get two palettes, never one.
// ─────────────────────────────────────────────────────────────────────────────

export interface StatutStyle {
  /** The inv_* table `code`. */
  id: string;
  label: string;
  color: string;
}

// ── Article lifecycle (inv_statut_article) ──────────────────────────────────

export const STATUT_ARTICLE_ORDER: readonly StatutStyle[] = [
  { id: "en_service", label: "En service", color: "#22c55e" },
  { id: "propose_reforme", label: "Proposé à la réforme", color: "#f59e0b" },
  { id: "reforme", label: "Réformé", color: "#ef4444" },
  { id: "sorti", label: "Sorti de l'inventaire", color: "#64748b" },
];

// ── Physical condition (inv_etat) ───────────────────────────────────────────
// The legacy labels are kept verbatim ("ES (Bon-Etat)", "H-S (En-Panne)") —
// see db-script BLOCK 002 — because 2 930 articles and every printed report
// already use that vocabulary. Group by the `hors_service` flag the API
// returns, never by parsing the ES/H-S prefix out of the string.

export const ETAT_ORDER: readonly StatutStyle[] = [
  { id: "neuf", label: "Neuf", color: "#22c55e" },
  { id: "bon", label: "ES (Bon-Etat)", color: "#4ade80" },
  { id: "mauvais", label: "ES (Mauvais-Etat)", color: "#facc15" },
  { id: "en_panne", label: "H-S (En-Panne)", color: "#ef4444" },
  { id: "attente_etalonnage", label: "H-S (Attente-Etalonnage)", color: "#f59e0b" },
  { id: "maintenance_preventive", label: "H-S (Maintenance-Preventive)", color: "#38bdf8" },
  { id: "maintenance_corrective", label: "H-S (Maintenance-Corrective)", color: "#fb923c" },
  { id: "attente_pieces", label: "H-S (Attente-Pieces)", color: "#a78bfa" },
  { id: "en_reparation", label: "H-S (En-Reparation)", color: "#facc15" },
  { id: "inconnu", label: "Etat non renseigne", color: "#94a3b8" },
];

// ── Physical presence (inv_presence) ────────────────────────────────────────
// Was `mobilier.cod_pays` against the `pays` table, which holds exactly OUI
// and NON. The three extra values are what make a real stock-take possible.

export const PRESENCE_ORDER: readonly StatutStyle[] = [
  { id: "present", label: "Présent", color: "#22c55e" },
  { id: "absent", label: "Absent", color: "#ef4444" },
  { id: "non_verifie", label: "Non vérifié", color: "#94a3b8" },
  { id: "en_reparation", label: "En réparation", color: "#f59e0b" },
  { id: "non_localise", label: "Non localisé", color: "#fb923c" },
];

// ── Intervention lifecycle (inv_statut_intervention) ────────────────────────

export const STATUT_INTERVENTION_ORDER: readonly StatutStyle[] = [
  { id: "en_attente", label: "En attente", color: "#f59e0b" },
  { id: "en_cours", label: "En cours", color: "#3b82f6" },
  { id: "traitee", label: "Traitée", color: "#22c55e" },
  { id: "annulee", label: "Annulée", color: "#94a3b8" },
];

// ── Document lifecycle (inv_document.id_statut) ─────────────────────────────

export const STATUT_DOCUMENT_ORDER: readonly StatutStyle[] = [
  { id: "brouillon", label: "Brouillon", color: "#94a3b8" },
  { id: "valide", label: "Validé", color: "#22c55e" },
  { id: "annule", label: "Annulé", color: "#ef4444" },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

const NEUTRAL = "#94a3b8";

/** The style for a code, or a neutral grey when the code is unknown. */
export function styleFor(
  order: readonly StatutStyle[],
  code: string | null | undefined,
): StatutStyle {
  return (
    order.find((s) => s.id === code) ?? {
      id: code ?? "inconnu",
      label: code ?? "—",
      color: NEUTRAL,
    }
  );
}

/**
 * Background + foreground for a chip of the given colour.
 *
 * One derivation rather than a hand-picked pair per status: the hex is stored
 * in the database and a chip has to stay legible whatever an administrator
 * picks there. `28` is ~16% alpha — enough tint to read as a chip, light
 * enough for the colour itself to remain the text.
 */
export function chip(color: string): { bg: string; fg: string } {
  return { bg: `${color}28`, fg: color };
}

export const statutArticleChip = (code: string | null | undefined) =>
  chip(styleFor(STATUT_ARTICLE_ORDER, code).color);

export const etatChip = (code: string | null | undefined) =>
  chip(styleFor(ETAT_ORDER, code).color);

export const presenceChip = (code: string | null | undefined) =>
  chip(styleFor(PRESENCE_ORDER, code).color);

export const statutInterventionChip = (code: string | null | undefined) =>
  chip(styleFor(STATUT_INTERVENTION_ORDER, code).color);
