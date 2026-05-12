/* ══════════════════════════════════════════════════════════════
   INSTRUCCIONES DE INTEGRACIÓN — Dark/Light Mode
   ═══════════════════════════════════════════════════════════════

   ARCHIVOS A USAR:
   ├── context/ThemeContext.tsx       → nuevo
   ├── components/ColorModeToggle.tsx → nuevo
   ├── app/dark-mode.css              → nuevo
   └── (modificaciones en layout.tsx y page.tsx)

   ─────────────────────────────────────────────────────────────
   1. app/layout.tsx — agregar import + provider
   ─────────────────────────────────────────────────────────────

   ANTES:
     import { LangProvider } from "./i18n";

   DESPUÉS (agregar):
     import { LangProvider } from "./i18n";
     import { ColorModeProvider } from "@/context/ThemeContext";
     import "./dark-mode.css";  // ← después de globals.css

   Y en el JSX, envolver con ColorModeProvider:

     <LangProvider>
       <ColorModeProvider>          ← agregar
         <ThemeProvider>
           <AuthProvider>{children}</AuthProvider>
         </ThemeProvider>
       </ColorModeProvider>         ← agregar
     </LangProvider>

   ─────────────────────────────────────────────────────────────
   2. app/page.tsx (landing) — agregar toggle en el topbar
   ─────────────────────────────────────────────────────────────

   Agregar import:
     import ColorModeToggle from "@/components/ColorModeToggle";

   En el JSX del topbar, dentro de <div className="nav-group">:

     <div className="nav-group">
       <nav className="nav">
         <a href="#workflow">{nav.howItWorks}</a>
       </nav>
       <div className="topbar-auth">
         {/* ... auth buttons ... */}
       </div>
       <LangToggle />
       <ColorModeToggle />          ← agregar aquí (último elemento)
     </div>

   ─────────────────────────────────────────────────────────────
   3. app/estudio/page.tsx — agregar toggle en el topbar standalone
   ─────────────────────────────────────────────────────────────

   Agregar import:
     import ColorModeToggle from "@/components/ColorModeToggle";

   En el JSX:
     <header className="standalone-topbar">
       ...
       <LangToggle />
       <ColorModeToggle />          ← agregar aquí
     </header>

   ─────────────────────────────────────────────────────────────
   4. app/investigacion/page.tsx — igual que estudio
   ─────────────────────────────────────────────────────────────

     <div className="standalone-nav-right">
       <ResearchPrefsBar />
       <LangToggle />
       <ColorModeToggle />          ← agregar aquí
     </div>

   ─────────────────────────────────────────────────────────────
   CSS DEL TOGGLE — ya incluido en dark-mode.css
   Las clases son: .color-mode-toggle, .color-mode-track, .color-mode-thumb
   ─────────────────────────────────────────────────────────────

   COMPORTAMIENTO:
   • Al cargar: lee localStorage("noesis_color_mode")
   • Si no existe: detecta prefers-color-scheme del sistema
   • Al cambiar: aplica clase .dark o .light en <html>
                 guarda en localStorage
   • El ColorModeProvider usa suppressHydrationWarning via mounted state
     para evitar hydration mismatch entre SSR y cliente

*/
