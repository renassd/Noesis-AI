import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./globals-patch.css";
import "./landing-patch.css";
import "katex/dist/katex.min.css";
import "./theme/theme.css";
import "./dark-mode.css";
import "./dark-mode-workflow-patch.css";
import "./landing-unbox.css";
import "./landing-stitch.css";
import "./landing-light.css";  // light-mode overrides — activates on html.light
import { LangProvider } from "./i18n";
import { ThemeProvider } from "./theme/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { AiUsageProvider } from "@/context/AiUsageContext";

export const metadata: Metadata = {
  title: "Neuvra AI — Tu sistema completo de aprendizaje",
  description:
    "Neuvra convierte información en comprensión y la comprensión en memoria. Un sistema de aprendizaje completo: comprensión activa, síntesis inteligente y motor de memoria.",
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
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&display=swap"
          rel="stylesheet"
        />
        {/* Material Symbols Outlined — required by landing page and Who We Are page icons */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <LangProvider>
          <ThemeProvider>
            <AuthProvider>
              <AiUsageProvider>{children}</AiUsageProvider>
            </AuthProvider>
          </ThemeProvider>
        </LangProvider>
      </body>
    </html>
  );
}
