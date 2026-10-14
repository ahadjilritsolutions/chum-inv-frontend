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
  title: "CHU Bab El Oued — Inventaire",
  description: "Gestion de l'inventaire des biens hospitaliers",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <head>
        {/* Runtime settings (backend address…), editable on the server without a
            rebuild — see src/lib/runtime-config.ts. Synchronous on purpose: it
            must be set before the app's own scripts read it. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/config.js`} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
