import type { Metadata } from "next";
// Poppins is self-hosted through @fontsource (same weights as the other SIH
// frontends), not fetched from Google Fonts: a hospital network is not
// guaranteed to reach the outside, and globals.css names Poppins first in the
// stack — so without these imports the whole app silently falls back to
// Segoe UI. The typeface is part of the product's identity, not the
// customer's, so it is bundled rather than configurable.
import "@fontsource/poppins/300.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
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
