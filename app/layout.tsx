import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./workspace.css";
import "./standalone.css";
import "./globals-patch.css";
import "katex/dist/katex.min.css";
import "./theme/theme.css";
import "./card-visual.css";
import { LangProvider } from "./i18n";
import { ThemeProvider } from "./theme/ThemeContext";

export const metadata: Metadata = {
  title: "Noesis AI",
  description:
    "Noesis connects understanding and remembering - research flows and memory tools in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <LangProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </LangProvider>
      </body>
    </html>
  );
}
