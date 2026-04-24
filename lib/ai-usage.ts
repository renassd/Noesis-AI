import { getSupabaseAdmin } from "@/lib/supabase";

export type UserPlan = "free" | "pro";

type PlanConfig = {
  monthlyCredits: number;
  rateLimitPerMinute: number;
  maxOutputTokens: number;
  maxInputChars: number;
  model: string;
};

type UsageRow = {
  user_id: string;
  plan: string | null;
  credits_used: number | null;
  last_reset_at: string | null;
  created_at?: string;
  updated_at?: string;
};

type UsageEventRow = {
  id: string;
};

export type AiUsageSnapshot = {
  plan: UserPlan;
  monthlyCredits: number;
  creditsUsed: number;
  creditsRemaining: number;
  lastResetAt: string;
  nextResetAt: string;
  rateLimitPerMinute: number;
  maxInputChars: number;
  maxOutputTokens: number;
  model: string;
};

export type AiRequestReservation = {
  eventId: string;
  usage: AiUsageSnapshot;
  plan: UserPlan;
  maxTokens: number;
  model: string;
};

export class AiUsageError extends Error {
  status: number;
  usage?: AiUsageSnapshot;

  constructor(message: string, status: number, usage?: AiUsageSnapshot) {
    super(message);
    this.name = "AiUsageError";
    this.status = status;
    this.usage = usage;
  }
}

const PLAN_CONFIG: Record<UserPlan, PlanConfig> = {
  free: {
    monthlyCredits: 50,
    rateLimitPerMinute: 5,
    maxOutputTokens: 500,
    maxInputChars: 3000,
    model: process.env.ANTHROPIC_MODEL_FREE ?? "claude-3-5-haiku-20241022",
  },
  pro: {
    monthlyCredits: 1000,
    rateLimitPerMinute: 20,
    maxOutputTokens: 1500,
    maxInputChars: 12000,
    model: process.env.ANTHROPIC_MODEL_PRO ?? "claude-sonnet-4-20250514",
  },
};

function normalizePlan(plan: string | null | undefined): UserPlan {
  return plan === "pro" ? "pro" : "free";
}

function addMonth(value: Date): Date {
  const next = new Date(value);
  next.setMonth(next.getMonth() + 1);
  return next;
}

function toIsoString(value: string | null | undefined): string {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

function createSnapshot(row: UsageRow): AiUsageSnapshot {
  const plan = normalizePlan(row.plan);
  const config = PLAN_CONFIG[plan];
  const creditsUsed = Math.max(0, row.credits_used ?? 0);
  const lastResetAt = toIsoString(row.last_reset_at);
  const nextResetAt = addMonth(new Date(lastResetAt)).toISOString();

  return {
    plan,
    monthlyCredits: config.monthlyCredits,
    creditsUsed,
    creditsRemaining: Math.max(config.monthlyCredits - creditsUsed, 0),
    lastResetAt,
    nextResetAt,
    rateLimitPerMinute: config.rateLimitPerMinute,
    maxInputChars: config.maxInputChars,
    maxOutputTokens: config.maxOutputTokens,
    model: config.model,
  };
}

async function ensureUsageRow(userId: string): Promise<UsageRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_user_usage")
    .select("user_id, plan, credits_used, last_reset_at, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle<UsageRow>();

  if (error) {
    throw new Error(`No se pudo cargar el estado de uso: ${error.message}`);
  }

  if (data) {
    const normalizedPlan = normalizePlan(data.plan);
    if (data.plan !== normalizedPlan) {
      const { data: updated, error: updateError } = await supabase
        .from("ai_user_usage")
        .update({ plan: normalizedPlan, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select("user_id, plan, credits_used, last_reset_at, created_at, updated_at")
        .single<UsageRow>();

      if (updateError || !updated) {
        throw new Error(updateError?.message ?? "No se pudo normalizar el plan del usuario.");
      }
      return updated;
    }

    return data;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("ai_user_usage")
    .insert({
      user_id: userId,
      plan: "free",
      credits_used: 0,
      last_reset_at: new Date().toISOString(),
    })
    .select("user_id, plan, credits_used, last_reset_at, created_at, updated_at")
    .single<UsageRow>();

  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? "No se pudo crear el estado de uso del usuario.");
  }

  return inserted;
}

async function resetIfNeeded(row: UsageRow): Promise<UsageRow> {
  const lastResetAt = new Date(toIsoString(row.last_reset_at));
  const nextResetAt = addMonth(lastResetAt);
  if (Date.now() < nextResetAt.getTime()) {
    return row;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_user_usage")
    .update({
      credits_used: 0,
      last_reset_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", row.user_id)
    .select("user_id, plan, credits_used, last_reset_at, created_at, updated_at")
    .single<UsageRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo reiniciar el uso mensual.");
  }

  return data;
}

async function getActiveUsageRow(userId: string): Promise<UsageRow> {
  const ensured = await ensureUsageRow(userId);
  return resetIfNeeded(ensured);
}

async function getRecentRequestCount(userId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count, error } = await supabase
    .from("ai_request_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["started", "succeeded", "failed"])
    .gte("created_at", oneMinuteAgo);

  if (error) {
    throw new Error(`No se pudo validar la frecuencia de uso: ${error.message}`);
  }

  return count ?? 0;
}

export async function getAiUsageSnapshot(userId: string): Promise<AiUsageSnapshot> {
  const row = await getActiveUsageRow(userId);
  return createSnapshot(row);
}

export async function reserveAiRequest(params: {
  userId: string;
  requestedMaxTokens?: number;
  inputChars: number;
}): Promise<AiRequestReservation> {
  const row = await getActiveUsageRow(params.userId);
  const usage = createSnapshot(row);

  if (params.inputChars > usage.maxInputChars) {
    throw new AiUsageError(
      `El mensaje es demasiado largo para tu plan actual. Límite: ${usage.maxInputChars} caracteres.`,
      413,
      usage,
    );
  }

  const recentRequests = await getRecentRequestCount(params.userId);
  if (recentRequests >= usage.rateLimitPerMinute) {
    throw new AiUsageError(
      "Estás enviando demasiadas solicitudes. Esperá un momento e intentá de nuevo.",
      429,
      usage,
    );
  }

  if (usage.creditsRemaining < 1) {
    throw new AiUsageError(
      "Ya alcanzaste tu límite mensual. Actualizá a Pro para seguir usando Neosis.",
      403,
      usage,
    );
  }

  const maxTokens = Math.max(
    1,
    Math.min(params.requestedMaxTokens ?? usage.maxOutputTokens, usage.maxOutputTokens),
  );

  const supabase = getSupabaseAdmin();
  const { data: inserted, error } = await supabase
    .from("ai_request_events")
    .insert({
      user_id: params.userId,
      plan: usage.plan,
      status: "started",
      credits_used: 0,
      request_chars: params.inputChars,
      max_tokens: maxTokens,
      model: usage.model,
    })
    .select("id")
    .single<UsageEventRow>();

  if (error || !inserted) {
    throw new Error(error?.message ?? "No se pudo registrar la solicitud de IA.");
  }

  return {
    eventId: inserted.id,
    usage,
    plan: usage.plan,
    maxTokens,
    model: usage.model,
  };
}

export async function finalizeAiRequestSuccess(params: {
  userId: string;
  eventId: string;
  creditsUsed?: number;
  model?: string;
}): Promise<AiUsageSnapshot> {
  const creditsUsed = params.creditsUsed ?? 1;
  const row = await getActiveUsageRow(params.userId);
  const nextCreditsUsed = Math.max(0, (row.credits_used ?? 0) + creditsUsed);
  const now = new Date().toISOString();
  const supabase = getSupabaseAdmin();

  const { data: updatedRow, error: rowError } = await supabase
    .from("ai_user_usage")
    .update({
      credits_used: nextCreditsUsed,
      updated_at: now,
    })
    .eq("user_id", params.userId)
    .select("user_id, plan, credits_used, last_reset_at, created_at, updated_at")
    .single<UsageRow>();

  if (rowError || !updatedRow) {
    throw new Error(rowError?.message ?? "No se pudo actualizar el consumo de créditos.");
  }

  const { error: eventError } = await supabase
    .from("ai_request_events")
    .update({
      status: "succeeded",
      credits_used: creditsUsed,
      completed_at: now,
      model: params.model ?? createSnapshot(updatedRow).model,
    })
    .eq("id", params.eventId);

  if (eventError) {
    throw new Error(eventError.message);
  }

  return createSnapshot(updatedRow);
}

export async function finalizeAiRequestFailure(params: {
  eventId: string;
  reason?: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("ai_request_events")
    .update({
      status: "failed",
      failure_reason: params.reason?.slice(0, 400) ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", params.eventId);

  if (error) {
    console.error("No se pudo marcar la solicitud fallida:", error.message);
  }
}
