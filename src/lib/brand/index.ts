// The établissement's identity — one import for every consumer.
//
//   const b = useBranding();            // React, re-renders on save
//   brandingSnapshot()                  // outside React (a print builder)
//   resoudreEntete(b)                   // the document header's lines
//   logoSrc(b) / loadLogoDataUrl()      // the logo, on screen / on paper
//   PRODUIT, COULEURS, VISUELS          // L&R's own identity, never per-client

export { PRODUIT, COULEURS, VISUELS } from "./product";
export {
  BRANDING_DEFAUT,
  ENTETE_DEFAUT,
  type Branding,
  type BrandingIdentite,
  type BrandingUpdate,
  type EnteteConfig,
} from "./types";
export {
  brandingSnapshot,
  loadBranding,
  loadLogoDataUrl,
  logoSrc,
  saveBranding,
  subscribeBranding,
} from "./branding-client";
export { useBranding, useBrandDocumentTitle } from "./useBranding";
export {
  LIGNE_REPUBLIQUE,
  echapperHtml,
  enteteLignesHtml,
  resoudreEntete,
  type EnteteLigne,
  type EnteteResolu,
} from "./entete";
