// Central, FIXED per-operation AI credit costs. Kept in one place so the numbers
// are trivial to tune and so every AI call site charges from the same source
// instead of scattered magic numbers. A map (not a single constant) lets each
// operation diverge later. NOTE: this is the fixed-cost baseline — the
// token-proportional pricing is a separate step layered on top of these.
export const AI_CREDIT_COST = {
  analyze: 1, // POST /api/ai/analyze (the 5 agent modes)
  chat: 1, // POST /api/ai/chat (legacy conversational)
  alertAnalyze: 1, // POST /api/ai/alerts/[id]/analyze
} as const;

export type AiOperation = keyof typeof AI_CREDIT_COST;
