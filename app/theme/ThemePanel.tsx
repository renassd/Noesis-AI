"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useLang } from "../i18n";
import { CARD_TEMPLATES, STICKER_SETS } from "./card-templates";
import { FONT_LABELS, SCHEMES } from "./schemes";
import { useTheme } from "./ThemeContext";
import {
  DEFAULT_CARD_VISUAL,
  type CardRadius,
  type CardSize,
  type CardSticker,
  type CardStyle,
  type CardTemplate,
  type CardVisual,
  type ColorScheme,
  type FontFamily,
} from "./types";

const CARD_RADII: { id: CardRadius; label: string }[] = [
  { id: "none", label: "0" },
  { id: "sm", label: "8" },
  { id: "md", label: "14" },
  { id: "lg", label: "22" },
  { id: "xl", label: "32" },
];

const PANEL_TEXT = {
  en: {
    drawerAria: "Theme customization panel",
    title: "Customization",
    subtitle: "Changes apply in real time",
    reset: "Reset",
    resetAll: "Reset all",
    close: "Close",
    colorTheme: "Color theme",
    accentColor: "Accent color",
    typography: "Typography",
    cardStyle: "Card style",
    borderRadius: "Border radius",
    cardSize: "Card size",
    shadowIntensity: "Shadow intensity",
    animations: "Animations",
    animationsSub: "Card flip and transitions",
    animationsAria: "Enable or disable animations",
    visualTemplate: "Visual template",
    customColors: "Custom colors",
    decorativeStickers: "Decorative stickers",
    decorativeDetails: "Decorative details",
    preview: "Preview - click to flip",
    front: "Front",
    back: "Back",
    text: "Text",
    useTemplateColor: "Use template color",
    add: "Add",
    stickerLimit: "Maximum 3 stickers. Click × to remove.",
    noAccent: "No accent",
    dot: "• Dot",
    line: "— Line",
    arc: "Arc",
    pattern: "Pattern",
    clickToFlip: "Click to flip",
    clickForAnswer: "click to view answer",
    question: "Question",
    answer: "Answer",
    previewQuestion: "What is the role of sleep in memory?",
    previewAnswer: "It consolidates memories during deep sleep and improves later recall.",
    blue: "Blue",
    dark: "Dark",
    sepia: "Sepia",
    forest: "Forest",
    ocean: "Ocean",
    rose: "Rose",
    slate: "Slate",
    compact: "Compact",
    normal: "Normal",
    large: "Large",
    flat: "Flat",
    elevated: "Elevated",
    glass: "Glass",
    outlined: "Outlined",
    brutal: "Brutal",
    flatDesc: "No shadow, subtle border",
    elevatedDesc: "Soft shadow, floating",
    glassDesc: "Blur and transparency",
    outlinedDesc: "Strong border, no shadow",
    brutalDesc: "Solid offset border",
  },
  es: {
    drawerAria: "Panel de personalización",
    title: "Personalización",
    subtitle: "Los cambios se aplican en tiempo real",
    reset: "Restablecer",
    resetAll: "Restablecer todo",
    close: "Cerrar",
    colorTheme: "Tema de color",
    accentColor: "Color de acento",
    typography: "Tipografía",
    cardStyle: "Estilo de tarjeta",
    borderRadius: "Radio de bordes",
    cardSize: "Tamaño de tarjeta",
    shadowIntensity: "Intensidad de sombra",
    animations: "Animaciones",
    animationsSub: "Volteo y transiciones de tarjetas",
    animationsAria: "Activar o desactivar animaciones",
    visualTemplate: "Plantilla visual",
    customColors: "Colores personalizados",
    decorativeStickers: "Stickers decorativos",
    decorativeDetails: "Detalles decorativos",
    preview: "Vista previa - clic para voltear",
    front: "Frente",
    back: "Reverso",
    text: "Texto",
    useTemplateColor: "Usar color de plantilla",
    add: "Agregar",
    stickerLimit: "Máximo 3 stickers. Haz clic en × para quitar.",
    noAccent: "Sin acento",
    dot: "• Punto",
    line: "— Línea",
    arc: "Arco",
    pattern: "Patrón",
    clickToFlip: "Clic para voltear",
    clickForAnswer: "clic para ver respuesta",
    question: "Pregunta",
    answer: "Respuesta",
    previewQuestion: "Cuál es el rol del sueño en la memoria?",
    previewAnswer: "Consolida recuerdos durante el sueño profundo y mejora la recuperación posterior.",
    blue: "Azul",
    dark: "Oscuro",
    sepia: "Sepia",
    forest: "Bosque",
    ocean: "Océano",
    rose: "Rosa",
    slate: "Pizarra",
    compact: "Compacto",
    normal: "Normal",
    large: "Grande",
    flat: "Flat",
    elevated: "Elevado",
    glass: "Glass",
    outlined: "Outlined",
    brutal: "Brutal",
    flatDesc: "Sin sombra, borde sutil",
    elevatedDesc: "Sombra suave, flotante",
    glassDesc: "Blur y transparencia",
    outlinedDesc: "Borde marcado, sin sombra",
    brutalDesc: "Borde sólido desplazado",
  },
} as const;

function getSchemeSwatches(lang: "en" | "es"): { id: ColorScheme; label: string; bg: string; dot: string }[] {
  const t = PANEL_TEXT[lang];
  return [
    { id: "default", label: t.blue, bg: "#f0f4ff", dot: "#2e63de" },
    { id: "dark", label: t.dark, bg: "#0e1117", dot: "#6b9fff" },
    { id: "sepia", label: t.sepia, bg: "#f5efe6", dot: "#a0673a" },
    { id: "forest", label: t.forest, bg: "#0f1a14", dot: "#66c983" },
    { id: "ocean", label: t.ocean, bg: "#07111e", dot: "#48cae4" },
    { id: "rose", label: t.rose, bg: "#fdf0f3", dot: "#e04070" },
    { id: "slate", label: t.slate, bg: "#f1f3f7", dot: "#5468a8" },
  ];
}

function getCardStyles(lang: "en" | "es"): { id: CardStyle; label: string; desc: string }[] {
  const t = PANEL_TEXT[lang];
  return [
    { id: "flat", label: t.flat, desc: t.flatDesc },
    { id: "elevated", label: t.elevated, desc: t.elevatedDesc },
    { id: "glass", label: t.glass, desc: t.glassDesc },
    { id: "outlined", label: t.outlined, desc: t.outlinedDesc },
    { id: "brutal", label: t.brutal, desc: t.brutalDesc },
  ];
}

function getCardSizes(lang: "en" | "es"): { id: CardSize; label: string }[] {
  const t = PANEL_TEXT[lang];
  return [
    { id: "compact", label: t.compact },
    { id: "default", label: t.normal },
    { id: "large", label: t.large },
  ];
}

function bgStyle(value: string): { backgroundColor?: string; backgroundImage?: string } {
  if (!value) return {};
  return value.startsWith("linear-gradient") || value.startsWith("radial-gradient")
    ? { backgroundImage: value }
    : { backgroundColor: value };
}

function PreviewCard({ visual, lang }: { visual: CardVisual; lang: "en" | "es" }) {
  const [flipped, setFlipped] = useState(false);
  const template = CARD_TEMPLATES[visual.template ?? "clean"];
  const t = PANEL_TEXT[lang];

  const frontStyle: CSSProperties = {
    ...bgStyle(visual.frontBg || template.frontBg),
    color: visual.textColor || template.textColor,
    borderColor: template.borderColor,
  };

  const backStyle: CSSProperties = {
    ...bgStyle(visual.backBg || template.backBg),
    color: visual.textColor || template.textColor,
    borderColor: template.accentColor,
  };

  return (
    <div className="tp-preview-scene" onClick={() => setFlipped((value) => !value)} title={t.clickToFlip}>
      <div className={`tp-preview-inner${flipped ? " is-flipped" : ""}`}>
        <div className="tp-preview-card tp-preview-front" style={frontStyle}>
          {visual.cornerAccent !== "none" && (
            <div
              className={`fc-corner-accent fc-corner-${visual.cornerAccent}`}
              style={{ backgroundColor: template.accentColor, borderColor: template.accentColor }}
            />
          )}
          {visual.stickers.map((sticker, index) => (
            <span key={`${sticker.emoji}-${index}`} className={`fc-sticker fc-sticker-${sticker.position}`}>
              {sticker.emoji}
            </span>
          ))}
          <span className="tp-preview-label" style={{ color: template.accentColor }}>{t.question}</span>
          <p className="tp-preview-text">{t.previewQuestion}</p>
          <span className="tp-preview-hint">{t.clickForAnswer}</span>
        </div>
        <div className="tp-preview-card tp-preview-back" style={backStyle}>
          {visual.stickers.map((sticker, index) => (
            <span key={`${sticker.emoji}-${index}`} className={`fc-sticker fc-sticker-${sticker.position}`}>
              {sticker.emoji}
            </span>
          ))}
          <span className="tp-preview-label" style={{ color: template.accentColor }}>{t.answer}</span>
          <p className="tp-preview-text">{t.previewAnswer}</p>
        </div>
      </div>
    </div>
  );
}

export default function ThemePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { prefs, update, reset } = useTheme();
  const { lang } = useLang();
  const t = PANEL_TEXT[lang];
  const [customAccent, setCustomAccent] = useState(prefs.accentColor ?? SCHEMES[prefs.colorScheme].blue700);
  const prevScheme = useRef(prefs.colorScheme);

  useEffect(() => {
    if (prevScheme.current !== prefs.colorScheme && !prefs.accentColor) {
      setCustomAccent(SCHEMES[prefs.colorScheme].blue700);
    }
    prevScheme.current = prefs.colorScheme;
  }, [prefs.colorScheme, prefs.accentColor]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div className="tp-backdrop" onClick={onClose} />
      <aside className="tp-drawer" aria-label={t.drawerAria}>
        {/* Absolutely-positioned close button — independent of all layout/scroll/safe-area */}
        <button className="tp-close-pin" onClick={onClose} aria-label={t.close} type="button">✕</button>

        <div className="tp-header">
          <div>
            <h3 className="tp-title">{t.title}</h3>
            <p className="tp-sub">{t.subtitle}</p>
          </div>
          <button className="tp-reset" onClick={reset} title={t.resetAll} type="button">{t.reset}</button>
        </div>

        <div className="tp-body">
          <section className="tp-section">
            <span className="tp-section-label">{t.colorTheme}</span>
            <div className="tp-scheme-grid">
              {getSchemeSwatches(lang).map((scheme) => (
                <button
                  key={scheme.id}
                  className={`tp-scheme-btn${prefs.colorScheme === scheme.id ? " active" : ""}`}
                  onClick={() => update({ colorScheme: scheme.id })}
                  title={scheme.label}
                  style={{ "--swatch-bg": scheme.bg, "--swatch-dot": scheme.dot } as CSSProperties}
                  type="button"
                >
                  <span className="tp-swatch" />
                  <span className="tp-swatch-label">{scheme.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="tp-section">
            <span className="tp-section-label">{t.accentColor}</span>
            <div className="tp-accent-row">
              <input
                type="color"
                className="tp-color-input"
                value={customAccent}
                onChange={(e) => {
                  setCustomAccent(e.target.value);
                  update({ accentColor: e.target.value });
                }}
              />
              <span className="tp-accent-value">{customAccent}</span>
              <button
                className="tp-accent-reset"
                onClick={() => {
                  const fallback = SCHEMES[prefs.colorScheme].blue700;
                  setCustomAccent(fallback);
                  update({ accentColor: null });
                }}
                type="button"
              >
                Auto
              </button>
            </div>
          </section>

          <section className="tp-section">
            <span className="tp-section-label">{t.typography}</span>
            <div className="tp-font-list">
              {(Object.keys(FONT_LABELS) as FontFamily[]).map((font) => (
                <button
                  key={font}
                  className={`tp-font-btn${prefs.fontFamily === font ? " active" : ""}`}
                  onClick={() => update({ fontFamily: font })}
                  style={{ fontFamily: FONT_LABELS[font].stack }}
                  type="button"
                >
                  {FONT_LABELS[font].label}
                  <span className="tp-font-preview">Aa</span>
                </button>
              ))}
            </div>
          </section>

          <section className="tp-section">
            <span className="tp-section-label">{t.cardStyle}</span>
            <div className="tp-card-style-grid">
              {getCardStyles(lang).map((style) => (
                <button
                  key={style.id}
                  className={`tp-card-style-btn${prefs.cardStyle === style.id ? " active" : ""}`}
                  onClick={() => update({ cardStyle: style.id })}
                  type="button"
                >
                  <span className="tp-card-style-name">{style.label}</span>
                  <span className="tp-card-style-desc">{style.desc}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="tp-section">
            <span className="tp-section-label">{t.borderRadius}</span>
            <div className="tp-radius-row">
              {CARD_RADII.map((radius) => (
                <button
                  key={radius.id}
                  className={`tp-radius-btn${prefs.cardRadius === radius.id ? " active" : ""}`}
                  onClick={() => update({ cardRadius: radius.id })}
                  style={{ borderRadius: `${radius.label}px` }}
                  type="button"
                >
                  {radius.label}px
                </button>
              ))}
            </div>
          </section>

          <section className="tp-section">
            <span className="tp-section-label">{t.cardSize}</span>
            <div className="tp-size-row">
              {getCardSizes(lang).map((size) => (
                <button
                  key={size.id}
                  className={`tp-size-btn${prefs.cardSize === size.id ? " active" : ""}`}
                  onClick={() => update({ cardSize: size.id })}
                  type="button"
                >
                  {size.label}
                </button>
              ))}
            </div>
          </section>

          <section className="tp-section">
            <div className="tp-label-row">
              <span className="tp-section-label">{t.shadowIntensity}</span>
              <span className="tp-section-value">{prefs.cardShadowIntensity}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={prefs.cardShadowIntensity}
              onChange={(e) => update({ cardShadowIntensity: Number(e.target.value) })}
              className="tp-range"
            />
          </section>

          <section className="tp-section tp-section-row">
            <div>
              <span className="tp-section-label">{t.animations}</span>
              <span className="tp-section-sub">{t.animationsSub}</span>
            </div>
            <button
              className={`tp-toggle${prefs.animationsEnabled ? " on" : ""}`}
              onClick={() => update({ animationsEnabled: !prefs.animationsEnabled })}
              aria-label={t.animationsAria}
              type="button"
            >
              <span className="tp-toggle-thumb" />
            </button>
          </section>

          <section className="tp-section">
            <span className="tp-section-label">{t.visualTemplate}</span>
            <div className="tp-template-grid">
              {(Object.entries(CARD_TEMPLATES) as [CardTemplate, (typeof CARD_TEMPLATES)[CardTemplate]][]).map(([key, template]) => (
                <button
                  key={key}
                  className={`tp-template-btn${(prefs.cardVisual?.template ?? "clean") === key ? " active" : ""}`}
                  onClick={() => update({ cardVisual: { ...(prefs.cardVisual ?? DEFAULT_CARD_VISUAL), template: key, frontBg: "", backBg: "" } })}
                  title={template.label}
                  type="button"
                >
                  <span className="tp-template-swatch" style={{ ...bgStyle(template.frontBg), borderColor: template.borderColor }} />
                  <span className="tp-template-label">{template.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="tp-section">
            <span className="tp-section-label">{t.customColors}</span>
            <div className="tp-custom-color-row">
              {[
                { key: "frontBg" as const, label: t.front },
                { key: "backBg" as const, label: t.back },
                { key: "textColor" as const, label: t.text },
              ].map(({ key, label }) => (
                <div key={key} className="tp-color-field-group">
                  <label>{label}</label>
                  <div className="tp-color-well">
                    <input
                      type="color"
                      value={prefs.cardVisual?.[key] || "#ffffff"}
                      onChange={(e) => update({ cardVisual: { ...(prefs.cardVisual ?? DEFAULT_CARD_VISUAL), [key]: e.target.value } as CardVisual })}
                    />
                    {prefs.cardVisual?.[key] && (
                      <button
                        className="tp-color-clear"
                        onClick={() => update({ cardVisual: { ...(prefs.cardVisual ?? DEFAULT_CARD_VISUAL), [key]: "" } as CardVisual })}
                        title={t.useTemplateColor}
                        type="button"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="tp-section">
            <span className="tp-section-label">{t.decorativeStickers}</span>
            {(prefs.cardVisual?.stickers ?? []).length > 0 && (
              <div className="tp-active-stickers">
                {(prefs.cardVisual?.stickers ?? []).map((sticker, index) => (
                  <span key={`${sticker.emoji}-${index}`} className="tp-active-sticker">
                    {sticker.emoji}
                    <button
                      className="tp-active-sticker-remove"
                      onClick={() =>
                        update({
                          cardVisual: {
                            ...(prefs.cardVisual ?? DEFAULT_CARD_VISUAL),
                            stickers: (prefs.cardVisual?.stickers ?? []).filter((_, idx) => idx !== index),
                          },
                        })
                      }
                      type="button"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {STICKER_SETS.map((set) => (
              <div key={set.label}>
                <p className="tp-sticker-set-label">{set.label}</p>
                <div className="tp-sticker-grid">
                  {set.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      className="tp-sticker-btn"
                      title={`${t.add} ${emoji}`}
                      onClick={() => {
                        const current = prefs.cardVisual?.stickers ?? [];
                        if (current.length >= 3) return;
                        const newSticker: CardSticker = { emoji, position: "top-right", size: "md" };
                        update({ cardVisual: { ...(prefs.cardVisual ?? DEFAULT_CARD_VISUAL), stickers: [...current, newSticker] } });
                      }}
                      type="button"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>{t.stickerLimit}</p>
          </section>

          <section className="tp-section">
            <span className="tp-section-label">{t.decorativeDetails}</span>
            <div className="tp-toggle-row">
              {(["none", "dot", "line", "arc"] as CardVisual["cornerAccent"][]).map((accent) => (
                <button
                  key={accent}
                  className={`tp-pill-toggle${(prefs.cardVisual?.cornerAccent ?? "none") === accent ? " active" : ""}`}
                  onClick={() => update({ cardVisual: { ...(prefs.cardVisual ?? DEFAULT_CARD_VISUAL), cornerAccent: accent } })}
                  type="button"
                >
                  {accent === "none" ? t.noAccent : accent === "dot" ? t.dot : accent === "line" ? t.line : t.arc}
                </button>
              ))}
              <button
                className={`tp-pill-toggle${prefs.cardVisual?.showPattern ? " active" : ""}`}
                onClick={() =>
                  update({
                    cardVisual: {
                      ...(prefs.cardVisual ?? DEFAULT_CARD_VISUAL),
                      showPattern: !(prefs.cardVisual?.showPattern ?? false),
                    },
                  })
                }
                type="button"
              >
                {t.pattern}
              </button>
            </div>
          </section>

          <section className="tp-section">
            <span className="tp-section-label">{t.preview}</span>
            <PreviewCard visual={prefs.cardVisual ?? DEFAULT_CARD_VISUAL} lang={lang} />
          </section>
        </div>
      </aside>
    </>,
    document.body
  );
}
