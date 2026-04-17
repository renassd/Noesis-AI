"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/app/i18n";
import { useAuth } from "@/context/AuthContext";

interface PanelData {
  id: "research" | "study";
  imageUrl: string;
}

interface PanelContent {
  title: string;
  tagline: string;
  description: string;
  cta: string;
  href: string;
  accentColor: string;
}

const PANELS: PanelData[] = [
  {
    id: "research",
    imageUrl:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=1400&auto=format&fit=crop",
  },
  {
    id: "study",
    imageUrl:
      "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1400&auto=format&fit=crop",
  },
];

function getContent(lang: "en" | "es"): Record<"research" | "study", PanelContent> {
  const isSpanish = lang === "es";

  return {
    research: {
      title: isSpanish ? "Investigacion" : "Research",
      tagline: isSpanish ? "Flujos academicos" : "Academic flows",
      description: isSpanish
        ? "Encuentra papers, resume evidencia y genera resultados academicos estructurados"
        : "Find papers, summarize evidence, and generate structured academic outputs",
      cta: isSpanish ? "Usar Noesis -> Investigacion" : "Use Noesis -> Research",
      href: "/investigacion",
      accentColor: "#5b8ef5",
    },
    study: {
      title: isSpanish ? "Estudio" : "Study",
      tagline: isSpanish ? "Flujos de retencion" : "Retention flows",
      description: isSpanish
        ? "Convierte resultados en flashcards, explicaciones simples y mazos para aprender de verdad"
        : "Convert results into flashcards, simple explanations, and decks for real learning",
      cta: isSpanish ? "Usar Noesis -> Estudio" : "Use Noesis -> Study",
      href: "/estudio",
      accentColor: "#1a8060",
    },
  };
}

function AccordionPanel({
  panel,
  content,
  index,
  isActive,
  onMouseEnter,
  onClick,
}: {
  panel: PanelData;
  content: Record<"research" | "study", PanelContent>;
  index: number;
  isActive: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  const current = content[panel.id];

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        height: "240px",
        borderRadius: "24px",
        flex: isActive ? "3.5 1 0%" : "1 1 0%",
        transition: "flex 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        minWidth: 0,
        border: isActive
          ? "1px solid rgba(214,224,240,0.5)"
          : "1px solid rgba(214,224,240,0.35)",
        boxShadow: isActive
          ? "0 8px 32px rgba(23,60,155,0.13)"
          : "0 2px 8px rgba(23,60,155,0.06)",
      }}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-expanded={isActive}
      suppressHydrationWarning
      onKeyDown={(event) => {
        if (event.key === "Enter") onClick();
      }}
    >
      <img
        src={panel.imageUrl}
        alt={current.title}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transition: "transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
          transform: isActive ? "scale(1.05)" : "scale(1.02)",
        }}
        onError={(event) => {
          const target = event.target as HTMLImageElement;
          target.onerror = null;
          target.src = `https://placehold.co/900x240/0d1b36/ffffff?text=${current.title}`;
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(8,16,36,0.96) 0%, rgba(8,16,36,0.82) 38%, rgba(8,16,36,0.30) 62%, transparent 100%)",
          transition: "opacity 0.4s ease",
          opacity: isActive ? 1 : 0.85,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(13,27,54,0.45) 0%, transparent 50%)",
          opacity: isActive ? 0.5 : 0.75,
          transition: "opacity 0.4s ease",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: current.accentColor,
          opacity: isActive ? 1 : 0,
          transform: isActive ? "scaleX(1)" : "scaleX(0.4)",
          transformOrigin: "left",
          transition: "opacity 0.4s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />

      {!isActive && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: current.accentColor,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              writingMode: "vertical-rl",
              fontFamily: "var(--font-body)",
              lineHeight: 1,
            }}
          >
            {current.title}
          </span>
        </div>
      )}

      {isActive && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "0 26px 26px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "7px",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: current.accentColor,
              fontFamily: "var(--font-body)",
              lineHeight: 1,
              opacity: 0.95,
            }}
          >
            0{index + 1} · {current.tagline}
          </span>

          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.3rem",
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.025em",
              color: "#ffffff",
              margin: 0,
            }}
          >
            {current.title}
          </h3>

          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "12.5px",
              lineHeight: 1.62,
              color: "rgba(255,255,255,0.88)",
              margin: 0,
              maxWidth: "46ch",
            }}
          >
            {current.description}
          </p>

          <Link
            href={current.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "4px",
              padding: "7px 15px",
              borderRadius: "999px",
              background:
                panel.id === "research" ? "rgba(91,142,245,0.90)" : "rgba(26,128,96,0.90)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              textDecoration: "none",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              whiteSpace: "nowrap",
              flexShrink: 0,
              letterSpacing: "0.01em",
              transition: "background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease",
              boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
            }}
            onMouseEnter={(event) => {
              const element = event.currentTarget;
              element.style.background =
                panel.id === "research" ? "rgba(91,142,245,1)" : "rgba(26,128,96,1)";
              element.style.transform = "translateY(-1px)";
              element.style.boxShadow = "0 4px 16px rgba(0,0,0,0.32)";
            }}
            onMouseLeave={(event) => {
              const element = event.currentTarget;
              element.style.background =
                panel.id === "research" ? "rgba(91,142,245,0.90)" : "rgba(26,128,96,0.90)";
              element.style.transform = "translateY(0)";
              element.style.boxShadow = "0 2px 10px rgba(0,0,0,0.25)";
            }}
          >
            {current.cta}
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M2.5 7H11.5M11.5 7L7.5 3M11.5 7L7.5 11"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}

export function ImageAccordionPanels() {
  const { lang } = useLang();
  const { auth, openModal } = useAuth();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const content = getContent(lang);

  function handleClick(panel: PanelData, index: number) {
    if (index !== activeIndex) {
      setActiveIndex(index);
      return;
    }

    if (auth.signedIn) {
      router.push(content[panel.id].href);
    } else {
      openModal();
    }
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        width: "100%",
        alignItems: "stretch",
      }}
    >
      {PANELS.map((panel, index) => (
        <AccordionPanel
          key={panel.id}
          panel={panel}
          content={content}
          index={index}
          isActive={index === activeIndex}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => handleClick(panel, index)}
        />
      ))}
    </div>
  );
}
