"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAiUsage } from "@/context/AiUsageContext";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/app/i18n";

type Props = {
  variant?: "compact" | "full" | "inline";
};

export default function AiUsageCard({ variant = "compact" }: Props) {
  const { auth } = useAuth();
  const router = useRouter();
  const { lang, t } = useLang();
  const usageText = t.usage;
  const { usage, loading, error } = useAiUsage();

  function handleUpgradeClick() {
    router.push("/#pricing");
  }

  const resetLabel = useMemo(() => {
    if (!usage) return "";
    const nextReset = new Date(usage.nextResetAt);
    const now = new Date();
    const sameDay = nextReset.toDateString() === now.toDateString();

    return nextReset.toLocaleString(
      lang === "en" ? "en-US" : "es-PY",
      sameDay
        ? { hour: "2-digit", minute: "2-digit" }
        : { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
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
          <button type="button" className="ai-usage-refresh" onClick={handleUpgradeClick}>
            {usageText.refresh}
          </button>
        </div>
        <p className="ai-usage-empty">{error || usageText.unavailable}</p>
      </div>
    );
  }

  const percentUsed = Math.min(100, Math.round((usage.creditsUsed / usage.monthlyCredits) * 100));
  const planLabel = usage.plan === "pro" ? usageText.proPlan : usageText.freePlan;

  if (variant === "inline") {
    return (
      <div className="ai-usage-card ai-usage-card--inline">
        <div className="ai-usage-inline-main">
          <div className="ai-usage-inline-copy">
            <span>
              {usageText.resetsOn} {resetLabel}
            </span>
          </div>
          <button type="button" className="ai-usage-refresh ai-usage-refresh--inline" onClick={handleUpgradeClick}>
            {usageText.refresh}
          </button>
        </div>
      </div>
    );
  }

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
        <button type="button" className="ai-usage-refresh" onClick={handleUpgradeClick}>
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
