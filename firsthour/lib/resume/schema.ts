// Canonical structured resume content — shared by the model tool-schema and both renderers
// (docx + pdf). Mirrors the skill's resume_builder.js `resume_data.json` schema.

export type ResumeJob = {
  company: string;
  location?: string;
  title: string;
  dates: string;
  stack?: string; // "Tool1, Tool2" — visible to ATS and skimming humans
  bullets: string[]; // XYZ-formula bullets
};

export type ResumeProject = {
  name: string;
  label?: string;
  stack?: string;
  bullet: string;
};

export type ResumeEducation = {
  degree: string;
  detail: string;
};

export type ResumeContent = {
  name: string;
  contact: string; // "City, ST | email | phone | linkedin.com/in/x" — never a street address
  summary: string;
  jobs: ResumeJob[];
  projects?: ResumeProject[];
  skills: [string, string][]; // [["Category", "comma, separated, keywords"], ...]
  education: ResumeEducation[];
};

export type ResumeDiff = { before: string; after: string };

export type TemplateResult = {
  content: ResumeContent;
  summary_of_fixes: string; // markdown: red flags found + how each was fixed + ATS keywords added
  diffs: ResumeDiff[]; // 2-3 representative before/after bullet upgrades
};

// Anthropic tool input_schema for forced structured output. Kept in lockstep with TemplateResult.
export const RESUME_TOOL_NAME = "emit_resume_template";

export const RESUME_TOOL_SCHEMA = {
  type: "object",
  properties: {
    content: {
      type: "object",
      properties: {
        name: { type: "string" },
        contact: {
          type: "string",
          description: "City, ST | email | phone | linkedin — NEVER a home street address",
        },
        summary: { type: "string", description: "3-4 sentence professional summary" },
        jobs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              company: { type: "string" },
              location: { type: "string" },
              title: { type: "string" },
              dates: { type: "string" },
              stack: { type: "string", description: "comma-separated tools; omit if none" },
              bullets: {
                type: "array",
                items: { type: "string" },
                description: "XYZ-formula bullets; use [bracketed] asks where a real metric is missing — never invent one",
              },
            },
            required: ["company", "title", "dates", "bullets"],
          },
        },
        projects: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              label: { type: "string" },
              stack: { type: "string" },
              bullet: { type: "string" },
            },
            required: ["name", "bullet"],
          },
        },
        skills: {
          type: "array",
          description: "Array of [category label, comma-separated keywords] pairs",
          items: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 2,
          },
        },
        education: {
          type: "array",
          items: {
            type: "object",
            properties: {
              degree: { type: "string" },
              detail: { type: "string" },
            },
            required: ["degree", "detail"],
          },
        },
      },
      required: ["name", "contact", "summary", "jobs", "skills", "education"],
    },
    summary_of_fixes: {
      type: "string",
      description:
        "Markdown: red flags found (gaps, title inflation, buzzword soup, missing metrics), how each was fixed, and ATS keywords added.",
    },
    diffs: {
      type: "array",
      description: "2-3 representative before/after bullet upgrades that show the improvement.",
      items: {
        type: "object",
        properties: {
          before: { type: "string" },
          after: { type: "string" },
        },
        required: ["before", "after"],
      },
    },
  },
  required: ["content", "summary_of_fixes", "diffs"],
} as const;
