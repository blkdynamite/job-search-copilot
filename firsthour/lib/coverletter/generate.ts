import { anthropic } from "@/lib/anthropic";
import { MODELS } from "@/lib/models";

export type CoverIntake = {
  experience: string; // most relevant experience, in the candidate's words
  impact: string; // concrete impact / real numbers
  motivation: string; // what draws them to this company
};

export type CoverMode = "draft" | "outline_only";

const DRAFT_SYSTEM = `You are helping a candidate write a cover letter for one specific job. Use ONLY the real experience, impact, and motivation the candidate gives you — never invent employers, facts, or metrics. Write 250-400 words, one page, in a plain human voice: warm, specific, first person. No buzzwords, no AI clichés ("I am excited to apply", "leverage", "passionate about", "align with"). Bracket [like this] anything the candidate must fill in with a real specific you don't have. Structure: open with why THIS company (their words), ground the middle in their real impact, close with a confident, concrete next step. Output ONLY the letter text.`;

const OUTLINE_SYSTEM = `This posting prohibits AI-generated applications, so you must NOT write a ready-to-send letter. Instead, produce a short OUTLINE plus the candidate's own raw talking points as bullets — drawn ONLY from what they told you — that they will rewrite in their own words. Start with one line telling them plainly: this company asks you to write it yourself, so here is scaffolding, not a final letter. Never invent facts. Output the outline and bullets only.`;

// Draft a cover letter (or an outline for no-AI postings) strictly from the candidate's own intake.
export async function generateCoverLetter(
  intake: CoverIntake,
  job: { company: string | null; title: string | null; description: string | null },
  mode: CoverMode
): Promise<string> {
  const system = mode === "outline_only" ? OUTLINE_SYSTEM : DRAFT_SYSTEM;
  const userText =
    `COMPANY: ${job.company ?? "(unknown)"}\n` +
    `ROLE: ${job.title ?? "(unknown)"}\n` +
    `JOB DESCRIPTION:\n${(job.description ?? "(none)").slice(0, 4000)}\n\n` +
    `THE CANDIDATE'S OWN WORDS (the only true source):\n` +
    `- Most relevant experience: ${intake.experience}\n` +
    `- Concrete impact: ${intake.impact || "(none given)"}\n` +
    `- What draws them to this company: ${intake.motivation}`;

  const msg = await anthropic().messages.create({
    model: MODELS.sonnet,
    max_tokens: 900,
    system,
    messages: [{ role: "user", content: userText }],
  });
  return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
}
