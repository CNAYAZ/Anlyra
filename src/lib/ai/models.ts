/**
 * WHICH MODEL EACH AI SURFACE USES — single source of truth.
 *
 * Before this file every call went to one model (ANTHROPIC_MODEL, default
 * claude-sonnet-5). That is the right default for the surfaces where the quality
 * of the advice IS the product, and needless spend everywhere else.
 *
 * The rule applied here is deliberately conservative: a surface is only moved to
 * a cheaper model when the task is SHORT and SELF-CONTAINED — bounded input, no
 * cross-referencing of the org's financial data, tightly specified output. Where
 * the model has to reason over the whole business context, it stays on the
 * default. Saving money on a worse consiglio is not a saving.
 *
 * ── HOW TO OVERRIDE (no code change) ──
 *  • ANTHROPIC_MODEL — global kill switch. When set it wins for EVERY surface,
 *    exactly as it did before this file existed. This is the one-variable way
 *    back to single-model behaviour if a per-surface choice turns out badly.
 *  • ANTHROPIC_MODEL_<SURFACE> — one surface only (e.g. ANTHROPIC_MODEL_ALERTS).
 *    Narrower rollback: put alerts back on the default without touching chat.
 * On Vercel an env-var change needs a redeploy to take effect.
 */

/** Every place in the app that calls the model. Adding one? Add it here first. */
export type AiSurface =
  /** /api/ai/chat — the conversational consultant. */
  | 'chat'
  /** /api/ai/analyze — AI Agent tabs (financial/marketing/kpi/competitor/chat). */
  | 'analyze'
  /** /api/ai/insights/generate — written advice from the facts engine. */
  | 'insights'
  /** /api/ai/alerts/[id]/analyze — explain ONE already-computed alert. */
  | 'alerts';

/**
 * The model everything used before this file, and the fallback for any surface
 * not listed in AI_SURFACE_MODELS. Fail-safe by design: an unmapped surface gets
 * the GOOD model, never the cheap one. A missing entry should cost money, not
 * quality — the failure nobody notices is the dangerous one.
 */
export const DEFAULT_AI_MODEL = 'claude-sonnet-5';

/**
 * Per-surface choice. Verified against the Anthropic model list (Sonnet 5:
 * $2/$10 per 1M in/out; Haiku 4.5: $1/$5 — half price on both sides).
 */
const AI_SURFACE_MODELS: Record<AiSurface, string> = {
  // ── STAY ON THE DEFAULT: quality here is the product ──
  // Full business context in the system prompt (financials, facts, scadenzario,
  // spese ricorrenti) and an open-ended question. This is the consultant.
  chat: DEFAULT_AI_MODEL,
  // Five specialized analyses over the same full context, long free-form output.
  analyze: DEFAULT_AI_MODEL,
  // Turns the facts engine's numbers into 3-5 pieces of written advice, under a
  // strict "never invent a number" rule. The most quality-sensitive call there is.
  insights: DEFAULT_AI_MODEL,

  // ── MOVED TO THE CHEAP MODEL ──
  // Explains ONE alert that the rules engine has ALREADY computed, and proposes
  // 2-3 actions. It is the only surface that never receives loadBusinessContext:
  // its whole input is the alert's own title/severity/description/recommendation
  // plus (optionally) the org name, industry and headcount — measured at roughly
  // 600 input tokens, answering with ~300 tokens of strict JSON. There is no
  // cross-data reasoning available to it by construction, so the extra capability
  // of the larger model has nothing here to work on.
  alerts: 'claude-haiku-4-5',
};

/** ANTHROPIC_MODEL_CHAT, ANTHROPIC_MODEL_ALERTS, … */
function surfaceEnvVar(surface: AiSurface): string {
  return `ANTHROPIC_MODEL_${surface.toUpperCase()}`;
}

/**
 * The model to use for one surface. Order: global override → per-surface
 * override → the mapped choice → DEFAULT_AI_MODEL.
 *
 * Read at CALL time, not at module load, so a value injected by the host is
 * picked up without depending on when this module was first imported.
 */
export function modelFor(surface: AiSurface): string {
  const global = process.env.ANTHROPIC_MODEL;
  if (global) return global;
  const perSurface = process.env[surfaceEnvVar(surface)];
  if (perSurface) return perSurface;
  return AI_SURFACE_MODELS[surface] ?? DEFAULT_AI_MODEL;
}

/**
 * Every DISTINCT model the app can currently reach, sorted and de-duplicated.
 *
 * Exists for the privacy policy, which names the model(s) processing customer
 * data. Deriving it from the map is the point: the disclosure cannot silently
 * go stale the next time a surface is re-pointed — before this, the page named
 * one model because there WAS only one, and a second model would have made a
 * published legal page quietly wrong.
 */
export function modelsInUse(): string[] {
  const all = (Object.keys(AI_SURFACE_MODELS) as AiSurface[]).map(modelFor);
  return Array.from(new Set(all)).sort();
}
