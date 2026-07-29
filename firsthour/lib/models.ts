// Model routing — IDs live in env/config, never hardcoded (verify at platform.claude.com/docs).
// Sonnet tier: agent conversation, Phase 1 analysis, resume tailoring, cover-letter drafting.
// Haiku tier: triage, title canonicalization, dedup, no-AI-policy scan, freshness parsing.

export const MODELS = {
  sonnet: process.env.FIRSTHOUR_MODEL_SONNET ?? "claude-sonnet-4-6",
  haiku: process.env.FIRSTHOUR_MODEL_HAIKU ?? "claude-haiku-4-5-20251001",
} as const;

export type ModelTier = keyof typeof MODELS;
