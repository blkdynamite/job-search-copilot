import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/lib/anthropic";
import { MODELS } from "@/lib/models";
import {
  RESUME_TOOL_NAME,
  RESUME_TOOL_SCHEMA,
  type TemplateResult,
} from "./schema";

const HONESTY = `Honesty rules are absolute:
- Never invent experience, tools, titles, or metrics. Only reframe what the resume already evidences.
- Rewrite bullets with Google's XYZ formula: "Accomplished X as measured by Y, by doing Z."
- Where a bullet has no real, measurable Y, write a [bracketed] ask for the number the user must supply — never fabricate one.
- Contact line is city/metro only — never a home street address.
- Keep it to what fits two pages: full bullets for the most relevant roles, tighter treatment for older/less-relevant ones.`;

const TEMPLATE_SYSTEM = `You are a senior recruiter rebuilding a candidate's resume into a clean two-page "resume template". ${HONESTY}
- Fix red flags: title inflation, buzzword soup, responsibility-language, unquantified top roles, keyword-variant misses. Add ATS keywords the material supports.
Return your result ONLY by calling the ${RESUME_TOOL_NAME} tool.`;

const TAILOR_SYSTEM = `You are a senior recruiter tailoring a candidate's resume to ONE specific job posting. ${HONESTY}
- Re-angle the summary and 2-4 bullets per relevant role toward THIS posting's stated responsibilities, using the posting's exact phrases where truthful.
- Reorder skills so the job's stated requirements lead.
- Do not add any experience the candidate hasn't evidenced. If the posting requires something the resume doesn't show, leave it out and note it in summary_of_fixes as a real gap — do not paper over it.
- summary_of_fixes should describe the angle you took for this job; diffs should show the re-angled bullets.
Return your result ONLY by calling the ${RESUME_TOOL_NAME} tool.`;

async function callModel(system: string, userText: string): Promise<TemplateResult> {
  const msg = await anthropic().messages.create({
    model: MODELS.sonnet,
    max_tokens: 4096,
    system,
    tools: [
      {
        name: RESUME_TOOL_NAME,
        description: "Emit the resume as structured content plus a summary of fixes and before/after diffs.",
        input_schema: RESUME_TOOL_SCHEMA as unknown as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: RESUME_TOOL_NAME },
    messages: [{ role: "user", content: userText }],
  });

  const block = msg.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("Model did not return a resume.");
  }
  return block.input as TemplateResult;
}

// Shared: generate, then enforce the 2-page rule with at most one tighten pass.
async function generate(
  system: string,
  base: string,
  build: (r: TemplateResult) => Promise<{ pages: number }>
): Promise<{ result: TemplateResult; overLength: boolean }> {
  let result = await callModel(system, base);
  let { pages } = await build(result);
  if (pages <= 2) return { result, overLength: false };

  result = await callModel(
    system,
    base +
      `\n\nYour previous draft ran to ${pages} pages. Tighten it to TWO pages by cutting the lowest-relevance, least-unique lines first — protect the strongest, most on-target evidence even if older. Do not drop whole recent roles; trim bullets.`
  );
  ({ pages } = await build(result));
  return { result, overLength: pages > 2 };
}

export function generateTemplate(
  resumeText: string,
  notes: string | undefined,
  build: (r: TemplateResult) => Promise<{ pages: number }>
) {
  const base =
    `Here is the candidate's current resume (extracted text):\n\n${resumeText}` +
    (notes ? `\n\nTarget role / context from the candidate:\n${notes}` : "");
  return generate(TEMPLATE_SYSTEM, base, build);
}

export function generateTailored(
  resumeBase: string,
  job: { company: string | null; title: string | null; description: string | null },
  build: (r: TemplateResult) => Promise<{ pages: number }>
) {
  const base =
    `CANDIDATE'S RESUME (base material — the only true source):\n\n${resumeBase}\n\n` +
    `TAILOR THIS RESUME TO THE FOLLOWING JOB:\n` +
    `- ${job.company ?? "Company"} — ${job.title ?? "Role"}\n` +
    `- Description:\n${job.description ?? "(no description available)"}`;
  return generate(TAILOR_SYSTEM, base, build);
}
