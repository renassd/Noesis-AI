"use client";

import { useState, type KeyboardEvent } from "react";

interface WorkflowStepItem {
  id: string;
  number: string;
  title: string;
  summary: string;
  detail: string;
}

export default function WorkflowStepCards({
  steps,
  hintLabel,
  frontActionLabel,
  backActionLabel,
  backLabel,
}: {
  steps: WorkflowStepItem[];
  hintLabel: string;
  frontActionLabel: string;
  backActionLabel: string;
  backLabel: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(steps[0]?.id ?? null);

  function toggleCard(id: string) {
    setActiveId((current) => (current === id ? null : id));
  }

  return (
    <div className="wf-cards-grid">
      {steps.map((step) => {
        const isActive = activeId === step.id;
        return (
          <button
            key={step.id}
            type="button"
            className={`wf-card${isActive ? " is-active" : ""}`}
            onClick={() => toggleCard(step.id)}
            onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleCard(step.id);
              }
            }}
            aria-pressed={isActive}
            aria-label={`${step.title}. ${isActive ? step.detail : step.summary}`}
            suppressHydrationWarning
          >
            <div className="wf-card-inner">
              <div className="wf-card-face wf-card-front">
                <div className="wf-card-content">
                  <div className="wf-card-main">
                    <div className="wf-card-topline">
                      <span className="wf-card-number">{step.number}</span>
                      <span className="wf-card-pill">{hintLabel}</span>
                    </div>
                    <strong className="wf-card-title">{step.title}</strong>
                    <span className="wf-card-copy">{step.summary}</span>
                  </div>
                  <div className="wf-card-footer">
                    <span className="wf-card-cta">{frontActionLabel}</span>
                  </div>
                </div>
              </div>

              <div className="wf-card-face wf-card-back">
                <div className="wf-card-content">
                  <div className="wf-card-main">
                    <span className="wf-card-back-label">{backLabel}</span>
                    <strong className="wf-card-title">{step.title}</strong>
                    <span className="wf-card-copy">{step.detail}</span>
                  </div>
                  <div className="wf-card-footer">
                    <span className="wf-card-cta">{backActionLabel}</span>
                  </div>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
