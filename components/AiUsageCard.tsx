"use client";

import { useMemo } from "react";
import { useAiUsage } from "@/context/AiUsageContext";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/app/i18n";

type Props = {
  variant?: "compact" | "full";
};

export default function AiUsageCard({ variant = "compact" }: Props) {
  const { auth } = useAuth();
  const { lang, t } = useLang();
  const usageText = t.usage;
  const { usage, loading, error, refreshUsage } = useAiUsage();

  const resetLabel = useMemo(() => {
    if (!usage) return "";
    return new Date(usage.nextResetAt).toLocaleDateString(
      lang === "en" ? "en-US" : "es-PY",
      { year: "numeric", month: "short", day: "numeric" },
    );
  }, [usage, lang]);

  if (!auth.signedIn) {
    return (
      <div className={`ai-usage-card ai-usage-card--${variant}`}>
        <p className="ai-usage-empty">{usageText.signInHint}</p>
      </div>
    );
  }

  if (loading && !usage) {
    return (
      <div className={`ai-usage-card ai-usage-card--${variant}`}>
        <p className="ai-usage-empty">{usageText.loading}</p>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className={`ai-usage-card ai-usage-card--${variant}`}>
        <div className="ai-usage-header">
          <h3>{usageText.title}</h3>
          <button type="button" className="ai-usage-refresh" onClick={() => void refreshUsage()}>
            {usageText.refresh}
          </button>
        </div>
        <p className="ai-usage-empty">{error || usageText.unavailable}</p>
      </div>
    );
  }

  const percentUsed = Math.min(100, Math.round((usage.creditsUsed / usage.monthlyCredits) * 100));
  const planLabel = usage.plan === "pro" ? usageText.proPlan : usageText.freePlan;

  return (
    <div className={`ai-usage-card ai-usage-card--${variant}`}>
      <div className="ai-usage-header">
        <div>
          <p className="ai-usage-kicker">{usageText.title}</p>
          <div className="ai-usage-plan-row">
            <strong>{planLabel}</strong>
            <span className={`ai-usage-plan-badge ai-usage-plan-badge--${usage.plan}`}>{planLabel}</span>
          </div>
        </div>
        <button type="button" className="ai-usage-refresh" onClick={() => void refreshUsage()}>
          {usageText.refresh}
        </button>
      </div>

      <div className="ai-usage-meter">
        <div className="ai-usage-meter-bar">
          <div className="ai-usage-meter-fill" style={{ width: `${percentUsed}%` }} />
        </div>
        <div className="ai-usage-meter-copy">
          <strong>{usage.creditsRemaining}</strong>
          <span>{usageText.creditsLeft}</span>
        </div>
      </div>

      <div className="ai-usage-stats">
        <div>
          <span>{usageText.monthlyLimit}</span>
          <strong>{usage.monthlyCredits}</strong>
        </div>
        <div>
          <span>{usageText.creditsUsed}</span>
          <strong>{usage.creditsUsed}</strong>
        </div>
        <div>
          <span>{usageText.resetsOn}</span>
          <strong>{resetLabel}</strong>
        </div>
      </div>

      {usage.plan === "free" && (
        <p className="ai-usage-upgrade">{usageText.upgradeHint}</p>
      )}
    </div>
  );
}
