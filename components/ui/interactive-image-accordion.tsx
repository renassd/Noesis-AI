"use client";

import Link from "next/link";
import { useState } from "react";
import { useLang } from "@/app/i18n";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
interface PanelData {
  id: "research" | "study";
  imageUrl: string;
}

const PANELS: PanelData[] = [
  {
    id: "research",
    imageUrl:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=1927&auto=format&fit=crop",
  },
  {
    id: "study",
    imageUrl:
      "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1973&auto=format&fit=crop",
  },
];

// ---------------------------------------------------------------------------
// Individual panel
// ---------------------------------------------------------------------------
interface PanelProps {
  panel: PanelData;
  title: string;
  description: string;
  cta: string;
  href: string;
  isActive: boolean;
  onMouseEnter: () => void;
}

function AccordionPanel({
  panel,
  title,
  description,
  cta,
  href,
  isActive,
  onMouseEnter,
}: PanelProps) {
  return (
    <div
      className={`relative h-72 rounded-2xl overflow-hidden cursor-pointer transition-all duration-700 ease-in-out ${
        isActive ? "w-96" : "w-28"
      }`}
      style={{ flexShrink: 0 }}
      onMouseEnter={onMouseEnter}
    >
      {/* Photo */}
      <img
        src={panel.imageUrl}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          const t = e.target as HTMLImageElement;
          t.onerror = null;
          t.src = `https://placehold.co/460x460/0d1b36/ffffff?text=${title}`;
        }}
      />

      {/* Overlay — slightly deeper when active so text pops */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          isActive ? "bg-black/60" : "bg-black/42"
        }`}
      />

      {/* Inactive: rotated label */}
      {!isActive && (
        <span
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 whitespace-nowrap text-white/85 text-sm font-semibold tracking-[0.14em] uppercase"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {title}
        </span>
      )}

      {/* Active: title + description + CTA */}
      {isActive && (
        <div
          className="absolute inset-0 flex flex-col justify-end p-7 gap-3"
          style={{ opacity: 1, transition: "opacity 0.3s ease 0.15s" }}
        >
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.75rem",
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: "-0.025em",
              color: "#fff",
              margin: 0,
            }}
          >
            {title}
          </h3>

          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.875rem",
              lineHeight: 1.72,
              color: "rgba(255,255,255,0.78)",
              margin: 0,
            }}
          >
            {description}
          </p>

          <Link href={href} className="img-accordion-cta">
            {cta}
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2.5 7H11.5M11.5 7L7.5 3M11.5 7L7.5 11"
                stroke="currentColor"
                strokeWidth="1.6"
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

// ---------------------------------------------------------------------------
// Exported component — just the panels row, no outer section wrapper
// ---------------------------------------------------------------------------
export function ImageAccordionPanels() {
  const { t } = useLang();
  const l = t.landing;
  const [activeIndex, setActiveIndex] = useState(0);

  const content = {
    research: {
      title: l.researchHeading,
      description: l.proofResearchDesc,
      cta: l.goResearch,
      href: "/investigacion",
    },
    study: {
      title: l.studyHeading,
      description: l.proofRetentionDesc,
      cta: l.goStudy,
      href: "/estudio",
    },
  } as const;

  return (
    <div className="feat-panels">
      {PANELS.map((panel, index) => {
        const c = content[panel.id];
        return (
          <AccordionPanel
            key={panel.id}
            panel={panel}
            title={c.title}
            description={c.description}
            cta={c.cta}
            href={c.href}
            isActive={index === activeIndex}
            onMouseEnter={() => setActiveIndex(index)}
          />
        );
      })}
    </div>
  );
}
