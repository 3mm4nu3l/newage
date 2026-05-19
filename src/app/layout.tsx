import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ezto | Taux immobiliers partenaires",
  description: "Comparez les taux immobiliers partenaires et demandez à être rappelé par un courtier.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
