import type { Metadata } from "next";
// L&R IT Solutions' own type pairing (lritsolutions.com), the same one
// cabinet-frontend uses and the one the SIH logotype is set in: Outfit for
// body/UI text, Playfair Display for display — the serif "SIH" and the italic
// "par L&R IT Solutions" are Playfair.
//
// Self-hosted through @fontsource, never fetched from Google Fonts: a hospital
// network is not guaranteed to reach the outside, and globals.css names these
// first in the stack — so without these imports the app silently falls back to
// Segoe UI. The typefaces are part of the PRODUCT's identity, not the
// customer's, so they are bundled rather than configurable.
import "@fontsource/outfit/300.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/400-italic.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import "./globals.css";
// Pose les couleurs de l'établissement sur <html> dès que le branding est
// chargé ; sans rendu propre. Monté ici pour couvrir TOUTES les pages,
// y compris l'écran de connexion qui vit hors du shell applicatif.
import ThemeApplier from "@/components/branding/ThemeApplier";

// Fallback only. The real tab title is the établissement's own name, applied
// by useBrandDocumentTitle() once the identity has loaded — naming a hospital
// here would put the wrong one in every other installation's tab.
//
// Les URL des icônes de métadonnées ne reçoivent pas le basePath de Next :
// sans le préfixe, elles partiraient à la racine du site.
const BASE = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

export const metadata: Metadata = {
  title: "Inventaire",
  description: "Gestion de l'inventaire des biens hospitaliers",
  icons: {
    icon: [
      { url: `${BASE}/brand/icon-32.png`, sizes: "32x32", type: "image/png" },
      { url: `${BASE}/brand/icon-180.png`, sizes: "180x180", type: "image/png" },
      { url: `${BASE}/brand/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
    apple: `${BASE}/brand/icon-180.png`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {/* Réglages d'exécution (public/config.js) : chargé avant le rendu
            de l'application pour que window.__SIH_CONFIG__ existe quand les
            composants le lisent. Fichier ordinaire, éditable sur le serveur. */}
        <script src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/config.js`} />
        <ThemeApplier />
        {children}
      </body>
    </html>
  );
}
