"use client";

import { useMemo, type CSSProperties, type KeyboardEvent } from "react";
import { useTheme } from "./theme/ThemeContext";
import { CARD_TEMPLATES } from "./theme/card-templates";
import type { CardSticker, CardVisual } from "./theme/types";

export interface FlashCardData {
  id: string;
  question: string;
  answer: string;
  visual?: Partial<CardVisual>;
}

interface FlashCardProps {
  card: FlashCardData;
  flipped: boolean;
  onClick: () => void;
  variant?: "grid" | "study";
  showLabel?: boolean;
  onEdit?: (card: FlashCardData) => void;
}

function renderCardText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function CornerAccent({ type, accentColor }: { type: CardVisual["cornerAccent"]; accentColor: string }) {
  if (type === "none") return null;
  if (type === "dot") return <div className="fc-corner-accent fc-corner-dot" style={{ background: accentColor }} aria-hidden="true" />;
  if (type === "line") return <div className="fc-corner-accent fc-corner-line" style={{ background: accentColor }} aria-hidden="true" />;
  return <div className="fc-corner-accent fc-corner-arc" style={{ borderColor: accentColor }} aria-hidden="true" />;
}

const STICKER_SIZES: Record<CardSticker["size"], string> = { sm: "18px", md: "24px", lg: "32px" };

function StickerLayer({ stickers }: { stickers: CardSticker[] }) {
  if (!stickers.length) return null;
  return (
    <>
      {stickers.map((sticker, index) => (
        <span
          key={`${sticker.emoji}-${sticker.position}-${index}`}
          className={`fc-sticker fc-sticker-${sticker.position}`}
          style={{ fontSize: STICKER_SIZES[sticker.size] }}
          aria-hidden="true"
        >
          {sticker.emoji}
        </span>
      ))}
    </>
  );
}

export default function FlashCard({
  card,
  flipped,
  onClick,
  variant = "grid",
  showLabel = true,
  onEdit,
}: FlashCardProps) {
  const { prefs } = useTheme();

  const visual: CardVisual = useMemo(() => {
    const global = prefs.cardVisual;
    const perCard = card.visual ?? {};
    return {
      template: perCard.template ?? global.template,
      frontBg: perCard.frontBg || global.frontBg,
      backBg: perCard.backBg || global.backBg,
      textColor: perCard.textColor || global.textColor,
      stickers: perCard.stickers ?? global.stickers,
      showPattern: perCard.showPattern ?? global.showPattern,
      cornerAccent: perCard.cornerAccent ?? global.cornerAccent,
    };
  }, [prefs.cardVisual, card.visual]);

  const template = CARD_TEMPLATES[visual.template];

  const frontStyle: CSSProperties = {
    background: visual.frontBg || template.frontBg,
    color: visual.textColor || template.textColor,
    backgroundImage:
      visual.showPattern && template.patternSvg
        ? `${template.patternSvg}, ${visual.frontBg || template.frontBg}`
        : undefined,
    borderColor: template.borderColor,
  };

  const backStyle: CSSProperties = {
    background: visual.backBg || template.backBg,
    color: visual.textColor || template.textColor,
    backgroundImage:
      visual.showPattern && template.patternSvg
        ? `${template.patternSvg}, ${visual.backBg || template.backBg}`
        : undefined,
    borderColor: template.accentColor,
  };

  const cardClass = ["fc-card", `fc-card--${variant}`, flipped ? "fc-card--flipped" : ""].filter(Boolean).join(" ");

  return (
    <div
      className={cardClass}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => e.key === "Enter" && onClick()}
      aria-label={flipped ? `Respuesta: ${card.answer}` : `Pregunta: ${card.question}`}
    >
      {onEdit && (
        <button
          className="fc-edit-btn"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(card);
          }}
          aria-label="Editar tarjeta"
          title="Personalizar esta tarjeta"
          type="button"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325" />
          </svg>
        </button>
      )}
      <div className="fc-inner">
        <div className="fc-face fc-front" style={frontStyle}>
          <CornerAccent type={visual.cornerAccent} accentColor={template.accentColor} />
          <StickerLayer stickers={visual.stickers} />
          {showLabel && (
            <span className="fc-label" style={{ color: template.accentColor }}>
              Pregunta
            </span>
          )}
          <p className="fc-text" dangerouslySetInnerHTML={{ __html: renderCardText(card.question) }} />
          {variant === "study" && <span className="fc-hint">Clic para ver la respuesta</span>}
        </div>

        <div className="fc-face fc-back" style={backStyle}>
          <CornerAccent type={visual.cornerAccent} accentColor={template.accentColor} />
          <StickerLayer stickers={visual.stickers} />
          {showLabel && (
            <span className="fc-label" style={{ color: template.accentColor }}>
              Respuesta
            </span>
          )}
          <p className="fc-text" dangerouslySetInnerHTML={{ __html: renderCardText(card.answer) }} />
        </div>
      </div>
    </div>
  );
}
