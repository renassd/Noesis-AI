"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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

const SCHEME_SWATCHES: { id: ColorScheme; label: string; bg: string; dot: string }[] = [
  { id: "default", label: "Azul", bg: "#f0f4ff", dot: "#2e63de" },
  { id: "dark", label: "Oscuro", bg: "#0e1117", dot: "#6b9fff" },
  { id: "sepia", label: "Sepia", bg: "#f5efe6", dot: "#a0673a" },
  { id: "forest", label: "Bosque", bg: "#0f1a14", dot: "#66c983" },
  { id: "ocean", label: "Oceano", bg: "#07111e", dot: "#48cae4" },
  { id: "rose", label: "Rosa", bg: "#fdf0f3", dot: "#e04070" },
  { id: "slate", label: "Pizarra", bg: "#f1f3f7", dot: "#5468a8" },
];

const CARD_STYLES: { id: CardStyle; label: string; desc: string }[] = [
  { id: "flat", label: "Flat", desc: "Sin sombra, borde sutil" },
  { id: "elevated", label: "Elevado", desc: "Sombra suave, flotante" },
  { id: "glass", label: "Glass", desc: "Blur y transparencia" },
  { id: "outlined", label: "Outlined", desc: "Borde marcado, sin sombra" },
  { id: "brutal", label: "Brutal", desc: "Borde solido desplazado" },
];

const CARD_RADII: { id: CardRadius; label: string }[] = [
  { id: "none", label: "0" },
  { id: "sm", label: "8" },
  { id: "md", label: "14" },
  { id: "lg", label: "22" },
  { id: "xl", label: "32" },
];

const CARD_SIZES: { id: CardSize; label: string }[] = [
  { id: "compact", label: "Compacto" },
  { id: "default", label: "Normal" },
  { id: "large", label: "Grande" },
];

function bgStyle(value: string): { backgroundColor?: string; backgroundImage?: string } {
  if (!value) return {};
  return value.startsWith("linear-gradient") || value.startsWith("radial-gradient")
    ? { backgroundImage: value }
    : { backgroundColor: value };
}

function PreviewCard({ visual }: { visual: CardVisual }) {
  const [flipped, setFlipped] = useState(false);
  const template = CARD_TEMPLATES[visual.template ?? "clean"];

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
    <div className="tp-preview-scene" onClick={() => setFlipped((value) => !value)} title="Clic para voltear">
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
          <span className="tp-preview-label" style={{ color: template.accentColor }}>Pregunta</span>
          <p className="tp-preview-text">Cual es el rol del sueno en la memoria?</p>
          <span className="tp-preview-hint">clic para ver respuesta</span>
        </div>
        <div className="tp-preview-card tp-preview-back" style={backStyle}>
          {visual.stickers.map((sticker, index) => (
            <span key={`${sticker.emoji}-${index}`} className={`fc-sticker fc-sticker-${sticker.position}`}>
              {sticker.emoji}
            </span>
          ))}
          <span className="tp-preview-label" style={{ color: template.accentColor }}>Respuesta</span>
          <p className="tp-preview-text">Consolida recuerdos durante el sueno profundo y mejora la recuperacion posterior.</p>
        </div>
      </div>
    </div>
  );
}

export default function ThemePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { prefs, update, reset } = useTheme();
  const [customAccent, setCustomAccent] = useState(prefs.accentColor ?? SCHEMES[prefs.colorScheme].blue700);
  const prevScheme = useRef(prefs.colorScheme);

  useEffect(() => {
    if (prevScheme.current !== prefs.colorScheme && !prefs.accentColor) {
      setCustomAccent(SCHEMES[prefs.colorScheme].blue700);
    }
    prevScheme.current = prefs.colorScheme;
  }, [prefs.colorScheme, prefs.accentColor]);

  if (!open) return null;

  return (
    <>
      <div className="tp-backdrop" onClick={onClose} />
      <aside className="tp-drawer" aria-label="Panel de personalizacion">
        <div className="tp-header">
          <div>
            <h3 className="tp-title">Personalizacion</h3>
            <p className="tp-sub">Los cambios se aplican en tiempo real</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="tp-reset" onClick={reset} title="Restablecer todo" type="button">Restablecer</button>
            <button className="tp-close" onClick={onClose} aria-label="Cerrar" type="button">X</button>
          </div>
        </div>

        <div className="tp-body">
          <section className="tp-section">
            <span className="tp-section-label">Tema de color</span>
            <div className="tp-scheme-grid">
              {SCHEME_SWATCHES.map((scheme) => (
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
            <span className="tp-section-label">Color de acento</span>
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
            <span className="tp-section-label">Tipografia</span>
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
            <span className="tp-section-label">Estilo de tarjeta</span>
            <div className="tp-card-style-grid">
              {CARD_STYLES.map((style) => (
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
            <span className="tp-section-label">Radio de bordes</span>
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
            <span className="tp-section-label">Tamano de tarjeta</span>
            <div className="tp-size-row">
              {CARD_SIZES.map((size) => (
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
              <span className="tp-section-label">Intensidad de sombra</span>
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
              <span className="tp-section-label">Animaciones</span>
              <span className="tp-section-sub">Volteo y transiciones de tarjetas</span>
            </div>
            <button
              className={`tp-toggle${prefs.animationsEnabled ? " on" : ""}`}
              onClick={() => update({ animationsEnabled: !prefs.animationsEnabled })}
              aria-label="Activar o desactivar animaciones"
              type="button"
            >
              <span className="tp-toggle-thumb" />
            </button>
          </section>

          <section className="tp-section">
            <span className="tp-section-label">Plantilla visual</span>
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
            <span className="tp-section-label">Colores personalizados</span>
            <div className="tp-custom-color-row">
              {[
                { key: "frontBg" as const, label: "Frente" },
                { key: "backBg" as const, label: "Reverso" },
                { key: "textColor" as const, label: "Texto" },
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
                        title="Usar color de plantilla"
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
            <span className="tp-section-label">Stickers decorativos</span>
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
                      title={`Agregar ${emoji}`}
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
            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>Maximo 3 stickers. Haz clic en × para quitar.</p>
          </section>

          <section className="tp-section">
            <span className="tp-section-label">Detalles decorativos</span>
            <div className="tp-toggle-row">
              {(["none", "dot", "line", "arc"] as CardVisual["cornerAccent"][]).map((accent) => (
                <button
                  key={accent}
                  className={`tp-pill-toggle${(prefs.cardVisual?.cornerAccent ?? "none") === accent ? " active" : ""}`}
                  onClick={() => update({ cardVisual: { ...(prefs.cardVisual ?? DEFAULT_CARD_VISUAL), cornerAccent: accent } })}
                  type="button"
                >
                  {accent === "none" ? "Sin acento" : accent === "dot" ? "• Punto" : accent === "line" ? "— Linea" : "Arco"}
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
                Patron
              </button>
            </div>
          </section>

          <section className="tp-section">
            <span className="tp-section-label">Vista previa - clic para voltear</span>
            <PreviewCard visual={prefs.cardVisual ?? DEFAULT_CARD_VISUAL} />
          </section>
        </div>
      </aside>
    </>
  );
}
