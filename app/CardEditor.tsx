"use client";

import { useEffect, useState } from "react";
import FlashCard from "./FlashCard";
import { CARD_TEMPLATES, STICKER_SETS } from "./theme/card-templates";
import { DEFAULT_CARD_VISUAL } from "./theme/types";
import type { CardSticker, CardTemplate, CardVisual } from "./theme/types";
import type { Flashcard } from "./types";

type TabId = "template" | "colors" | "stickers" | "details";

interface CardEditorProps {
  card: Flashcard;
  onSave: (cardId: string, visual: Partial<CardVisual>) => void;
  onClose: () => void;
}

function resolveVisual(visual?: Partial<CardVisual>): CardVisual {
  return {
    ...DEFAULT_CARD_VISUAL,
    ...visual,
    stickers: visual?.stickers ?? DEFAULT_CARD_VISUAL.stickers,
  };
}

function diffVisual(visual: CardVisual): Partial<CardVisual> {
  const diff: Partial<CardVisual> = {};

  if (visual.template !== DEFAULT_CARD_VISUAL.template) diff.template = visual.template;
  if (visual.frontBg !== DEFAULT_CARD_VISUAL.frontBg) diff.frontBg = visual.frontBg;
  if (visual.backBg !== DEFAULT_CARD_VISUAL.backBg) diff.backBg = visual.backBg;
  if (visual.textColor !== DEFAULT_CARD_VISUAL.textColor) diff.textColor = visual.textColor;
  if (visual.showPattern !== DEFAULT_CARD_VISUAL.showPattern) diff.showPattern = visual.showPattern;
  if (visual.cornerAccent !== DEFAULT_CARD_VISUAL.cornerAccent) diff.cornerAccent = visual.cornerAccent;
  if (visual.stickers.length > 0) diff.stickers = visual.stickers;

  return diff;
}

function bgStyle(value: string): { backgroundColor?: string; backgroundImage?: string } {
  if (!value) return {};
  return value.startsWith("linear-gradient") || value.startsWith("radial-gradient")
    ? { backgroundImage: value }
    : { backgroundColor: value };
}

export default function CardEditor({ card, onSave, onClose }: CardEditorProps) {
  const [visual, setVisual] = useState<CardVisual>(() => resolveVisual(card.visual));
  const [previewFlipped, setPreviewFlipped] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("template");

  useEffect(() => {
    setVisual(resolveVisual(card.visual));
    setPreviewFlipped(false);
  }, [card.id, card.visual]);

  function patch(delta: Partial<CardVisual>) {
    setVisual((prev) => ({ ...prev, ...delta }));
  }

  function handleSave() {
    onSave(card.id, diffVisual(visual));
    onClose();
  }

  function handleReset() {
    const empty: Partial<CardVisual> = {};
    setVisual(resolveVisual(empty));
    onSave(card.id, empty);
  }

  return (
    <div className="ce-backdrop" onClick={onClose}>
      <div className="ce-panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Editar tarjeta">
        <div className="ce-header">
          <div className="ce-header-left">
            <div className="ce-header-icon">*</div>
            <div>
              <h3 className="ce-title">Editar tarjeta</h3>
              <p className="ce-subtitle">Los cambios se ven en tiempo real</p>
            </div>
          </div>

          <div className="ce-header-actions">
            <button className="ce-reset-btn" onClick={handleReset} type="button">
              Restablecer
            </button>
            <button className="ce-save-btn" onClick={handleSave} type="button">
              Guardar
            </button>
            <button className="ce-close-btn" onClick={onClose} aria-label="Cerrar" type="button">
              x
            </button>
          </div>
        </div>

        <div className="ce-body">
          <div className="ce-preview-section">
            <p className="ce-section-label">Vista previa - clic para voltear</p>
            <div className="ce-preview-wrap">
              <FlashCard
                card={{ ...card, visual }}
                flipped={previewFlipped}
                onClick={() => setPreviewFlipped((value) => !value)}
                variant="study"
                showLabel
              />
            </div>
          </div>

          <div className="ce-tabs">
            {([
              ["template", "Plantilla"],
              ["colors", "Colores"],
              ["stickers", "Stickers"],
              ["details", "Detalles"],
            ] as const).map(([tabId, label]) => (
              <button
                key={tabId}
                className={`ce-tab${activeTab === tabId ? " active" : ""}`}
                onClick={() => setActiveTab(tabId)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === "template" && (
            <div className="ce-tab-content">
              <p className="ce-section-label">Plantilla visual</p>
              <div className="ce-template-grid">
                {(Object.entries(CARD_TEMPLATES) as Array<[CardTemplate, (typeof CARD_TEMPLATES)[CardTemplate]]>).map(
                  ([key, template]) => (
                    <button
                      key={key}
                      className={`ce-template-btn${visual.template === key ? " active" : ""}`}
                      onClick={() => patch({ template: key, frontBg: "", backBg: "" })}
                      title={template.label}
                      type="button"
                    >
                      <span className="ce-template-swatch" style={bgStyle(template.frontBg)} />
                      <span className="ce-template-emoji">{template.emoji}</span>
                      <span className="ce-template-label">{template.label}</span>
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {activeTab === "colors" && (
            <div className="ce-tab-content">
              <p className="ce-section-label">
                Colores personalizados <span className="ce-section-note">(anulan la plantilla)</span>
              </p>
              <div className="ce-color-grid">
                {([
                  { key: "frontBg", label: "Fondo frente", fallback: "#ffffff" },
                  { key: "backBg", label: "Fondo reverso", fallback: "#ffffff" },
                  { key: "textColor", label: "Color de texto", fallback: "#0d1b36" },
                ] as const).map(({ key, label, fallback }) => {
                  const value = visual[key];
                  return (
                    <div key={key} className="ce-color-field">
                      <span className="ce-color-label">{label}</span>
                      <div className="ce-color-row">
                        <div className="ce-color-preview" style={{ backgroundColor: value || fallback }} />
                        <input
                          type="color"
                          className="ce-color-input"
                          value={value || "#ffffff"}
                          onChange={(event) => patch({ [key]: event.target.value })}
                        />
                        <span className="ce-color-hex">{value || "-"}</span>
                        {value && (
                          <button
                            className="ce-color-clear"
                            onClick={() => patch({ [key]: "" })}
                            title="Usar color de plantilla"
                            type="button"
                          >
                            x
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "stickers" && (
            <div className="ce-tab-content">
              {visual.stickers.length > 0 && (
                <div className="ce-active-stickers">
                  <p className="ce-section-label">Stickers activos</p>
                  {visual.stickers.map((sticker, index) => (
                    <div key={`${sticker.emoji}-${index}`} className="ce-sticker-row">
                      <span className="ce-sticker-emoji">{sticker.emoji}</span>
                      <div className="ce-sticker-controls">
                        <div className="ce-sticker-pos-group">
                          {([
                            "top-left",
                            "top-right",
                            "bottom-left",
                            "bottom-right",
                            "center-top",
                          ] as CardSticker["position"][]).map((position) => (
                            <button
                              key={position}
                              className={`ce-pos-btn${sticker.position === position ? " active" : ""}`}
                              onClick={() => {
                                const next = [...visual.stickers];
                                next[index] = { ...next[index], position };
                                patch({ stickers: next });
                              }}
                              title={position}
                              type="button"
                            >
                              {position === "top-left" && "TL"}
                              {position === "top-right" && "TR"}
                              {position === "bottom-left" && "BL"}
                              {position === "bottom-right" && "BR"}
                              {position === "center-top" && "CT"}
                            </button>
                          ))}
                        </div>

                        <div className="ce-sticker-size-group">
                          {(["sm", "md", "lg"] as CardSticker["size"][]).map((size) => (
                            <button
                              key={size}
                              className={`ce-size-btn${sticker.size === size ? " active" : ""}`}
                              onClick={() => {
                                const next = [...visual.stickers];
                                next[index] = { ...next[index], size };
                                patch({ stickers: next });
                              }}
                              type="button"
                            >
                              {size.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        className="ce-sticker-remove"
                        onClick={() => patch({ stickers: visual.stickers.filter((_, itemIndex) => itemIndex !== index) })}
                        title="Quitar sticker"
                        type="button"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {visual.stickers.length < 3 ? (
                <>
                  <p className="ce-section-label">
                    Agregar sticker
                    {visual.stickers.length > 0 && (
                      <span className="ce-section-note"> ({3 - visual.stickers.length} disponibles)</span>
                    )}
                  </p>

                  {STICKER_SETS.map((set) => (
                    <div key={set.label} className="ce-sticker-set">
                      <span className="ce-sticker-set-label">{set.label}</span>
                      <div className="ce-sticker-picker">
                        {set.emojis.map((emoji) => (
                          <button
                            key={emoji}
                            className="ce-emoji-btn"
                            onClick={() =>
                              patch({
                                stickers: [...visual.stickers, { emoji, position: "top-right", size: "md" }],
                              })
                            }
                            type="button"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <p className="ce-info">Maximo 3 stickers por tarjeta. Quita uno para agregar otro.</p>
              )}
            </div>
          )}

          {activeTab === "details" && (
            <div className="ce-tab-content">
              <p className="ce-section-label">Acento de esquina</p>
              <div className="ce-detail-row">
                {(["none", "dot", "line", "arc"] as CardVisual["cornerAccent"][]).map((cornerAccent) => (
                  <button
                    key={cornerAccent}
                    className={`ce-detail-btn${visual.cornerAccent === cornerAccent ? " active" : ""}`}
                    onClick={() => patch({ cornerAccent })}
                    type="button"
                  >
                    {cornerAccent === "none" && "Sin acento"}
                    {cornerAccent === "dot" && "Punto"}
                    {cornerAccent === "line" && "Linea"}
                    {cornerAccent === "arc" && "Arco"}
                  </button>
                ))}
              </div>

              <p className="ce-section-label">Patron de fondo</p>
              <div className="ce-detail-row">
                <button
                  className={`ce-detail-btn${!visual.showPattern ? " active" : ""}`}
                  onClick={() => patch({ showPattern: false })}
                  type="button"
                >
                  Sin patron
                </button>
                <button
                  className={`ce-detail-btn${visual.showPattern ? " active" : ""}`}
                  onClick={() => patch({ showPattern: true })}
                  type="button"
                >
                  Con patron
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
