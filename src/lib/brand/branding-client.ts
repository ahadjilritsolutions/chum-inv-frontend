// ─────────────────────────────────────────────────────────────────────────────
// Loading and caching the établissement's identity in the browser.
//
// Plain fetch with a module-level cache rather than react-query: of the three
// SIH frontends only the DEP has react-query, and the identity has to load the
// same way in all three — including on the login screen, which renders before
// any provider exists, and in a print window, which is a different document.
//
// One in-flight request per page load, one cached answer shared by every
// consumer, and a subscription so a save in Configuration repaints the navbar
// without a reload.
//
// IDENTICAL in every SIH frontend except lib/brand/endpoint.ts, which is the
// one file that knows where each app's backend lives.
// ─────────────────────────────────────────────────────────────────────────────

import { brandAssetPath, brandingApiUrl, brandingAuthHeaders } from "./endpoint";
import { VISUELS } from "./product";
import { BRANDING_DEFAUT, type Branding, type BrandingUpdate } from "./types";

let cache: Branding | null = null;
let inflight: Promise<Branding> | null = null;
const listeners = new Set<(b: Branding) => void>();

/** The identity as currently known, without waiting. Returns the product
 *  defaults until the first load resolves — never null, so no caller has to
 *  render an empty header. */
export function brandingSnapshot(): Branding {
  return cache ?? BRANDING_DEFAUT;
}

function publish(b: Branding): Branding {
  cache = b;
  for (const fn of listeners) fn(b);
  return b;
}

/**
 * Fetches the identity once per page load.
 *
 * A failure is NOT retried and NOT thrown: an unreachable branding endpoint
 * must degrade to an unbranded screen, never to a broken one. The one thing
 * it would be wrong to do is block the login form behind a letterhead.
 */
export function loadBranding(): Promise<Branding> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = fetch(brandingApiUrl("/api/branding"), { headers: { Accept: "application/json" } })
    .then((r) => (r.ok ? (r.json() as Promise<Branding>) : Promise.reject(new Error(String(r.status)))))
    .then((b) => publish({ ...BRANDING_DEFAUT, ...b, entete: { ...BRANDING_DEFAUT.entete, ...b.entete } }))
    .catch(() => BRANDING_DEFAUT)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Subscribe to identity changes. Returns the unsubscribe function. */
export function subscribeBranding(fn: (b: Branding) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Saves a partial edit (Configuration › Identité) and republishes the result,
 * so every mounted surface — navbar, login preview, print header — updates
 * from the server's own answer rather than from the caller's optimistic guess.
 */
export async function saveBranding(patch: BrandingUpdate): Promise<Branding> {
  const res = await fetch(brandingApiUrl("/api/branding"), {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...brandingAuthHeaders() },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Enregistrement impossible (${res.status})`);
  }

  const saved = (await res.json()) as Branding;
  // The logo URL carries a new `?v=`, so dropping the print cache is enough —
  // the browser will not reuse the old bytes for the new URL.
  resetLogoCache();
  return publish(saved);
}

/**
 * Where to draw the établissement's logo from: the uploaded one if there is
 * one, else the product's own gold mark. Always resolvable in an `src`.
 */
export function logoSrc(b: Branding): string {
  return b.logo_url ? brandingApiUrl(b.logo_url) : brandAssetPath(VISUELS.mark);
}

// ── Print: the logo as a data URL ───────────────────────────────────────────
//
// A print window is a document of its own. By the time it paints, a remote
// <img src> may not have arrived, and the sheet prints with a hole where the
// letterhead belongs. Inlining the bytes removes the race entirely, so every
// printed document in these apps goes through this.

let logoDataUrl: string | null = null;
let logoDataUrlPending: Promise<string | null> | null = null;

function resetLogoCache() {
  logoDataUrl = null;
  logoDataUrlPending = null;
}

/** The current logo as a `data:` URL, or null if it cannot be read (the
 *  header then simply leaves the logo box empty rather than failing). */
export function loadLogoDataUrl(): Promise<string | null> {
  if (logoDataUrl) return Promise.resolve(logoDataUrl);
  if (logoDataUrlPending) return logoDataUrlPending;
  if (typeof window === "undefined") return Promise.resolve(null);

  logoDataUrlPending = loadBranding()
    .then((b) => fetch(logoSrc(b)))
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
      logoDataUrl = d;
      return d;
    })
    .catch(() => null)
    .finally(() => {
      logoDataUrlPending = null;
    });

  return logoDataUrlPending;
}
