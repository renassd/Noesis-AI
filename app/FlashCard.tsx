"use client";

import { useMemo, type CSSProperties, type KeyboardEvent } from "react";
import { useLang } from "./i18n";
import { renderInlineRichText } from "./lib/renderRichText";
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

function splitBg(value: string): { backgroundColor?: string; backgroundImage?: string } {
  if (!value) return {};
  return value.startsWith("linear-gradient") || value.startsWith("radial-gradient")
    ? { backgroundImage: value }
    : { backgroundColor: value };
}

function CornerAccent({ type, accentColor }: { type: CardVisual["cornerAccent"]; accentColor: string }) {
  if (type === "none") return null;
  if (type === "dot") return <div className="fc-corner-accent fc-corner-dot" style={{ backgroundColor: accentColor }} aria-hidden="true" />;
  if (type === "line") return <div className="fc-corner-accent fc-corner-line" style={{ backgroundColor: accentColor }} aria-hidden="true" />;
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
  const { lang, t } = useLang();
  const s = t.study;
  const { prefs } = useTheme();

  const visual: CardVisual = useMemo(() => {
    const global = prefs.cardVisual;
    const perCard = card.visual ?? {};
    const resolvedTemplate =
      perCard.template ??
      ((prefs.colorScheme === "dark" && global.template === "clean") ? "midnight" : global.template);

    return {
      template: resolvedTemplate,
      frontBg: perCard.frontBg || global.frontBg,
      backBg: perCard.backBg || global.backBg,
      textColor: perCard.textColor || global.textColor,
      stickers: perCard.stickers ?? global.stickers,
      showPattern: perCard.showPattern ?? global.showPattern,
      cornerAccent: perCard.cornerAccent ?? global.cornerAccent,
      imageUrl: perCard.imageUrl ?? global.imageUrl,
      imageAlt: perCard.imageAlt ?? global.imageAlt,
      imagePrompt: perCard.imagePrompt ?? global.imagePrompt,
    };
  }, [prefs.cardVisual, prefs.colorScheme, card.visual]);

  const template = CARD_TEMPLATES[visual.template];

  const frontBgValue = visual.frontBg || template.frontBg;
  const backBgValue  = visual.backBg  || template.backBg;
  const frontIsGradient = frontBgValue.startsWith("linear-gradient") || frontBgValue.startsWith("radial-gradient");
  const backIsGradient  = backBgValue.startsWith("linear-gradient")  || backBgValue.startsWith("radial-gradient");

  const frontStyle: CSSProperties = {
    ...splitBg(frontBgValue),
    color: visual.textColor || template.textColor,
    backgroundImage: visual.showPattern && template.patternSvg
      ? frontIsGradient ? `${template.patternSvg}, ${frontBgValue}` : template.patternSvg
      : (frontIsGradient ? frontBgValue : undefined),
    borderColor: template.borderColor,
  };

  const backStyle: CSSProperties = {
    ...splitBg(backBgValue),
    color: visual.textColor || template.textColor,
    backgroundImage: visual.showPattern && template.patternSvg
      ? backIsGradient ? `${template.patternSvg}, ${backBgValue}` : template.patternSvg
      : (backIsGradient ? backBgValue : undefined),
    borderColor: template.accentColor,
  };

  const imageUrl = visual.imageUrl;
  const imageAlt = visual.imageAlt || card.question;
  const cardClass = [
    "fc-card",
    `fc-card--${variant}`,
    flipped ? "fc-card--flipped" : "",
    imageUrl ? "fc-card--has-image" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={cardClass}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); }
      }}
      aria-label={
        flipped
          ? `${s.manualAnswerLabel}: ${card.answer}`
          : `${s.manualQuestionLabel}: ${card.question}`
      }
      aria-pressed={flipped}
    >
      {onEdit && (
        <button
          className="fc-edit-btn"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(card);
          }}
          aria-label={lang === "en" ? "Edit card" : "Editar tarjeta"}
          title={lang === "en" ? "Customize this card" : "Personalizar esta tarjeta"}
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
              {s.manualQuestionLabel}
            </span>
          )}
          <div className="fc-text" dangerouslySetInnerHTML={{ __html: renderInlineRichText(card.question) }} />
          {variant === "study" && (
            <span className="fc-hint fc-hint--front" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2.5 8a5.5 5.5 0 1 0 1.1-3.3M2.5 4V8H6.5"
                  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {lang === "en" ? "See answer" : "Ver respuesta"}
            </span>
          )}
        </div>

        <div className="fc-face fc-back" style={backStyle}>
          <CornerAccent type={visual.cornerAccent} accentColor={template.accentColor} />
          <StickerLayer stickers={visual.stickers} />
          {showLabel && (
            <span className="fc-label" style={{ color: template.accentColor }}>
              {s.manualAnswerLabel}
            </span>
          )}
          {imageUrl && (
            <div className="fc-media">
              <img src={imageUrl} alt={imageAlt} className="fc-media-image" />
            </div>
          )}
          <div className="fc-text" dangerouslySetInnerHTML={{ __html: renderInlineRichText(card.answer) }} />
          {variant === "study" && (
            <span className="fc-hint fc-hint--back" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M13.5 8a5.5 5.5 0 1 1-1.1-3.3M13.5 4V8H9.5"
                  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {lang === "en" ? "Back" : "Volver"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
