"use client";

import Link from "next/link";
import { useState } from "react";
import { useLang } from "./i18n";

interface AccordionItemData {
  id: "research" | "study";
  index: string;
  accentClass: string;
  href: string;
}

const ITEMS: AccordionItemData[] = [
  { id: "research", index: "01", accentClass: "accordion-accent-blue", href: "/investigacion" },
  { id: "study", index: "02", accentClass: "accordion-accent-green", href: "/estudio" },
];

const CONTENT = {
  es: {
    research: {
      label: "Investigacion",
      heading: "Investigacion academica profunda.",
      tagline: "Entiende antes de memorizar.",
      description:
        "Resumi papers al instante, genera revisiones de literatura estructuradas y encontra fuentes relevantes desde una pregunta en lenguaje natural. Todo el contexto academico que necesitas, en un solo lugar.",
      features: [
        "Resumen de papers con hallazgos y limitaciones",
        "Revision de literatura con brechas y debates",
        "Estructura tu escritura academica",
        "Explicaciones adaptadas a tu nivel",
      ],
      cta: "Usar Neuvra -> Investigacion",
    },
    study: {
      label: "Estudio",
      heading: "Retencion que realmente funciona.",
      tagline: "Del entendimiento al recuerdo.",
      description:
        "Convierte cualquier material en flashcards listas para repasar, activa el modo tutor para que te explique paso a paso, o extrae los conceptos clave que realmente importan para el examen.",
      features: [
        "Flashcards generadas con IA desde tus apuntes",
        "Modo tutor con verificacion de comprension",
        "Extraccion de conceptos y anclas de memoria",
        "Mazos organizados y listos para repasar",
      ],
      cta: "Usar Neuvra -> Estudio",
    },
  },
  en: {
    research: {
      label: "Research",
      heading: "Deep academic research.",
      tagline: "Understand before you memorise.",
      description:
        "Summarise papers instantly, generate structured literature reviews, and find relevant sources from a natural language question. All the academic context you need, in one place.",
      features: [
        "Paper summaries with findings and limitations",
        "Literature reviews with gaps and debates",
        "Structure your academic writing",
        "Explanations adapted to your level",
      ],
      cta: "Use Neuvra -> Research",
    },
    study: {
      label: "Study",
      heading: "Retention that actually works.",
      tagline: "From understanding to memory.",
      description:
        "Turn any material into flashcards ready to review, activate tutor mode for step-by-step explanations, or extract the key concepts that really matter for the exam.",
      features: [
        "AI-generated flashcards from your notes",
        "Tutor mode with comprehension checks",
        "Key concept and memory anchor extraction",
        "Organised decks ready to review",
      ],
      cta: "Use Neuvra -> Study",
    },
  },
} as const;

export default function FeatureAccordion() {
  const { lang } = useLang();
  const [openId, setOpenId] = useState<string | null>(null);
  const copy = CONTENT[lang] ?? CONTENT.en;

  return (
    <div className="accordion-root">
      {ITEMS.map((item) => {
        const content = copy[item.id];
        const isOpen = openId === item.id;

        return (
          <div
            key={item.id}
            className={`accordion-item ${item.accentClass}${isOpen ? " is-open" : ""}`}
            onMouseEnter={() => setOpenId(item.id)}
            onMouseLeave={() => setOpenId(null)}
          >
            <button
              className="accordion-trigger"
              onClick={() => setOpenId((prev) => (prev === item.id ? null : item.id))}
              aria-expanded={isOpen}
              aria-controls={`accordion-body-${item.id}`}
              type="button"
            >
              <div className="accordion-trigger-left">
                <span className="accordion-index" aria-hidden="true">
                  {item.index}
                </span>
                <div className="accordion-titles">
                  <span className="accordion-label">{content.label}</span>
                  <h3 className="accordion-heading">{content.heading}</h3>
                </div>
              </div>

              <div className="accordion-trigger-right">
                <span className="accordion-tagline">{content.tagline}</span>
                <span className="accordion-chevron" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M4.5 6.75L9 11.25L13.5 6.75"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            </button>

            <div
              id={`accordion-body-${item.id}`}
              className="accordion-body"
              aria-hidden={!isOpen}
            >
              <div className="accordion-body-inner">
                <div className="accordion-description-col">
                  <p className="accordion-description">{content.description}</p>
                  <Link href={item.href} className="accordion-cta">
                    {content.cta}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
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

                <ul className="accordion-features" role="list">
                  {content.features.map((feature) => (
                    <li key={feature} className="accordion-feature-item">
                      <span className="accordion-feature-dot" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
