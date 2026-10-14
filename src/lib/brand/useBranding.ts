"use client";

// React access to the établissement's identity.
//
// Backed by the module-level store in branding-client.ts through
// useSyncExternalStore, so there is NO provider to mount: the login screen,
// the navbar, a configuration preview and a print sheet all read the same
// cached value from wherever they happen to be in the tree. A save in
// Configuration republishes, and every one of them repaints.
//
// IDENTICAL in every SIH frontend.

import { useEffect, useSyncExternalStore } from "react";
import {
  brandingSnapshot,
  loadBranding,
  subscribeBranding,
} from "./branding-client";
import { BRANDING_DEFAUT, type Branding } from "./types";

// Server render has no store to read: both snapshots must be the SAME object
// identity on every call or useSyncExternalStore loops, which is why this
// returns the module constant rather than building a default.
const serverSnapshot = () => BRANDING_DEFAUT;

/** The établissement's identity, re-rendering when it is saved. Returns the
 *  product defaults until the first load resolves. */
export function useBranding(): Branding {
  const branding = useSyncExternalStore(
    subscribeBranding,
    brandingSnapshot,
    serverSnapshot,
  );

  // Fires once per page load — loadBranding() de-duplicates, so every
  // component may ask without any of them coordinating.
  useEffect(() => {
    void loadBranding();
  }, []);

  return branding;
}

/**
 * Keeps the browser tab titled after the établissement —
 * "<Établissement> — <Module>", e.g. "CHU Mustapha — DEP". The static
 * `metadata.title` in layout.tsx cannot do this: the identity is only knowable
 * after a fetch. Mount once, high in the app shell.
 */
export function useBrandDocumentTitle(module: string): void {
  const { nom_court, nom } = useBranding();
  useEffect(() => {
    const court = nom_court?.trim() || nom?.trim();
    document.title = court ? `${court} — ${module}` : module;
  }, [nom_court, nom, module]);
}
