import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./workspace.css";
import "./standalone.css";
import "./globals-patch.css";

export const metadata: Metadata = {
  title: "Noesis AI",
  description:
    "Plataforma de estudio con IA para investigacion, resumenes, flashcards y flujos de aprendizaje basados en la memoria.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
