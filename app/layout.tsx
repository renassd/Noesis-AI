import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./globals-patch.css";
import "./landing-patch.css";
import "katex/dist/katex.min.css";
import "./theme/theme.css";
import "./dark-mode.css";
import "./dark-mode-workflow-patch.css";
import { LangProvider } from "./i18n";
import { ThemeProvider } from "./theme/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Neuvra AI",
  description:
    "Neuvra AI connects understanding and remembering - research flows and memory tools in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" translate="no" className="notranslate" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <LangProvider>
          <ThemeProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ThemeProvider>
        </LangProvider>
      </body>
    </html>
  );
}
