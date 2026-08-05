import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/lib/anthropic";
import { MODELS } from "@/lib/models";
import {
  RESUME_TOOL_NAME,
  RESUME_TOOL_SCHEMA,
  type TemplateResult,
} from "./schema";

const SYSTEM = `You are a senior recruiter rebuilding a candidate's resume into a clean two-page "resume template". Honesty rules are absolute:
- Never invent experience, tools, titles, or metrics. Only reframe what the resume already evidences.
- Rewrite every bullet with Google's XYZ formula: "Accomplished X as measured by Y, by doing Z."
- Where a bullet has no real, measurable Y, write a [bracketed] ask for the number the user must supply — never fabricate one.
- Fix red flags: title inflation, buzzword soup, responsibility-language, unquantified top roles, keyword-variant misses. Add ATS keywords the material supports.
- Contact line is city/metro only — never a home street address.
- Keep it to what fits two pages: full bullets for the most relevant roles, tighter treatment for older/less-relevant ones.
Return your result ONLY by calling the ${RESUME_TOOL_NAME} tool.`;

async function callModel(userText: string): Promise<TemplateResult> {
  const msg = await anthropic().messages.create({
    model: MODELS.sonnet,
    max_tokens: 4096,
    system: SYSTEM,
    tools: [
      {
        name: RESUME_TOOL_NAME,
        description: "Emit the rebuilt resume template as structured content plus a summary of fixes and before/after diffs.",
        input_schema: RESUME_TOOL_SCHEMA as unknown as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: RESUME_TOOL_NAME },
    messages: [{ role: "user", content: userText }],
  });

  const block = msg.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("Model did not return a resume template.");
  }
  return block.input as TemplateResult;
}

// Generate the template, then enforce the 2-page rule with at most one tighten pass.
export async function generateTemplate(
  resumeText: string,
  notes: string | undefined,
  build: (r: TemplateResult) => Promise<{ pages: number }>
): Promise<{ result: TemplateResult; overLength: boolean }> {
  const base =
    `Here is the candidate's current resume (extracted text):\n\n${resumeText}` +
    (notes ? `\n\nTarget role / context from the candidate:\n${notes}` : "");

  let result = await callModel(base);
  let { pages } = await build(result);
  if (pages <= 2) return { result, overLength: false };

  // One tighten pass: relevance-weighted trimming (SKILL.md Phase 2, step 5).
  result = await callModel(
    base +
      `\n\nYour previous draft ran to ${pages} pages. Tighten it to TWO pages by cutting the lowest-relevance, least-unique lines first — protect the strongest, most on-target evidence even if older. Do not drop whole recent roles; trim bullets.`
  );
  ({ pages } = await build(result));
  return { result, overLength: pages > 2 };
}
