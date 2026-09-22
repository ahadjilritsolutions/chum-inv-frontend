import type { Metadata } from "next";
// Poppins is self-hosted through @fontsource (same weights as the DEP and LIS
// frontends), not fetched from Google Fonts: the CHU network is not guaranteed
// to reach the outside, and globals.css names Poppins first in the stack — so
// without these imports the whole app silently falls back to Segoe UI.
import "@fontsource/poppins/300.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "CHU Mustapha — Inventaire",
  description: "Gestion de l'inventaire des biens hospitaliers",
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
