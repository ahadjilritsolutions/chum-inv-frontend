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

// Fallback only. The real tab title is the établissement's own name, applied
// by useBrandDocumentTitle() once the identity has loaded — naming a hospital
// here would put the wrong one in every other installation's tab.
export const metadata: Metadata = {
  title: "Inventaire",
  description: "Gestion de l'inventaire des biens hospitaliers",
  icons: {
    icon: [
      { url: "/brand/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/brand/icon-180.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
