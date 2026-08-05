import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { anthropic } from "@/lib/anthropic";
import { MODELS } from "@/lib/models";
import type { JobRow } from "./refresh";

export type ProfileForTriage = {
  target_titles?: string[];
  city_metro?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  remote_pref?: string | null;
  work_auth?: string | null;
};

export type Verdict = "strong" | "stretch" | "skip";
export type TriageResult = { verdict: Verdict; verdict_reason: string; gaps: string[]; ai_prohibited: boolean };

const TOOL = "emit_triage";
const SCHEMA = {
  type: "object",
  properties: {
    verdict: {
      type: "string",
      enum: ["strong", "stretch", "skip"],
      description:
        "strong = requirements + level + pay match; stretch = 1-2 real gaps; skip = hard-requirement failure, wrong function, wrong geography, or severely below level/pay.",
    },
    verdict_reason: { type: "string", description: "One blunt sentence naming the reason." },
    gaps: {
      type: "array",
      items: { type: "string" },
      description: "Specific missing requirements the candidate would need to address. Empty for a clean strong match.",
    },
    ai_prohibited: {
      type: "boolean",
      description: "True only if the posting explicitly prohibits AI-generated application content.",
    },
  },
  required: ["verdict", "verdict_reason", "gaps", "ai_prohibited"],
} as const;

const SYSTEM = `You are a senior recruiter triaging one job for one candidate. Be blunt and honest — a bad-fit application wastes the candidate's hours. Rank STRONG / STRETCH / SKIP by real fit: requirements, level, pay band, geography/remote, and work authorization. Never invent candidate experience; judge only what the resume evidences. If a hard requirement fails (degree/license, wrong geography with no remote, wrong function, far below level/pay), it is SKIP with a one-line reason. Also report whether the posting prohibits AI-generated applications. Respond ONLY via the ${TOOL} tool.`;

// Triage one job against the candidate; upsert the per-user match and (if flagged) the job's ai_prohibited.
export async function triageJob(
  svc: SupabaseClient<any, any, any>,
  userId: string,
  job: JobRow,
  profile: ProfileForTriage,
  resumeText: string
): Promise<TriageResult> {
  const prompt =
    `CANDIDATE PROFILE:\n` +
    `- Target titles: ${(profile.target_titles ?? []).join(", ") || "(unspecified)"}\n` +
    `- Location: ${profile.city_metro || "(unspecified)"} | Remote pref: ${profile.remote_pref || "(unspecified)"}\n` +
    `- Salary band: ${profile.salary_min ?? "?"}–${profile.salary_max ?? "?"}\n` +
    `- Work authorization: ${profile.work_auth || "(unspecified)"}\n\n` +
    `RESUME (extracted):\n${resumeText.slice(0, 6000)}\n\n` +
    `JOB POSTING:\n- ${job.company} — ${job.title} (${job.location ?? "location n/a"})\n- ${job.raw_description ?? "(no description available)"}`;

  let result: TriageResult = {
    verdict: "stretch",
    verdict_reason: "Could not fully assess; treat as a stretch.",
    gaps: [],
    ai_prohibited: false,
  };

  try {
    const msg = await anthropic().messages.create({
      model: MODELS.haiku,
      max_tokens: 400,
      system: SYSTEM,
      tools: [{ name: TOOL, description: "Emit the triage verdict.", input_schema: SCHEMA as unknown as Anthropic.Tool.InputSchema }],
      tool_choice: { type: "tool", name: TOOL },
      messages: [{ role: "user", content: prompt }],
    });
    const block = msg.content.find((b) => b.type === "tool_use");
    if (block && block.type === "tool_use") result = block.input as TriageResult;
  } catch {
    // keep the safe default
  }

  if (result.ai_prohibited && !job.ai_prohibited) {
    await svc.from("firsthour_jobs").update({ ai_prohibited: true }).eq("id", job.id);
  }

  await svc.from("firsthour_matches").upsert(
    {
      user_id: userId,
      job_id: job.id,
      verdict: result.verdict,
      verdict_reason: result.verdict_reason,
      gaps: result.gaps,
    },
    { onConflict: "user_id,job_id" }
  );

  return result;
}
