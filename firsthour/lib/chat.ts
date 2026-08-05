// Shared chat types + constants (client + prompt-facing).

export type Role = "user" | "assistant";

// Anthropic content block shapes we produce on the client.
export type TextBlock = { type: "text"; text: string };
export type DocumentBlock = {
  type: "document";
  source: { type: "base64"; media_type: "application/pdf"; data: string };
};
export type ContentBlock = TextBlock | DocumentBlock;

export type ResumeFiles = { docxUrl: string | null; pdfUrl: string | null };

// Client-safe mirror of the server's MatchView (lib/jobs/present.ts).
export type MatchView = {
  jobId: string;
  company: string | null;
  title: string | null;
  location: string | null;
  url: string;
  source: string;
  verdict: "strong" | "stretch" | "skip";
  reason: string | null;
  gaps: string[];
  age: string;
  aiProhibited: boolean;
};

export type ChatMessage = {
  role: Role;
  display: string; // what the bubble shows
  api: ContentBlock[] | null; // API-shaped content; null for the seeded opening
  phase?: number;
  files?: ResumeFiles; // download buttons (resume template result)
  matches?: MatchView[]; // rendered as job cards (jobs result)
};

// Detect pasted ATS posting links so they route to /api/jobs/paste instead of the chat model.
const ATS_URL_RE =
  /https?:\/\/(?:boards\.greenhouse\.io|job-boards\.greenhouse\.io|jobs\.lever\.co|jobs\.ashbyhq\.com)\/[^\s)]+/gi;

export function extractAtsUrls(text: string): string[] {
  return Array.from(new Set(text.match(ATS_URL_RE) ?? []));
}

export const PHASES = [
  { n: 1, label: "Analysis" },
  { n: 2, label: "Template" },
  { n: 3, label: "Fresh jobs" },
  { n: 4, label: "Triage & tailor" },
] as const;

// Staged loading copy — never a bare spinner (spec §9).
export const LOADING_SETS: Record<string, string[]> = {
  file: [
    "Reading your resume…",
    "Scanning for ATS keywords…",
    "Noting what a recruiter would flag…",
    "Mapping your strongest titles…",
    "Ranking your fit tiers…",
  ],
  "0": ["Thinking it through…", "Getting your file ready…"],
  "1": [
    "Weighing your answers…",
    "Re-ranking your fit tiers…",
    "Sharpening the keyword list…",
  ],
  "2": [
    "Rewriting bullets, XYZ style…",
    "Hunting for missing metrics…",
    "Running the red-flag audit…",
    "Tightening to two pages…",
  ],
  "3": [
    "Hunting fresh postings…",
    "Sweeping Greenhouse, Lever, Ashby…",
    "Checking postings are still open…",
    "Filtering out stale listings…",
  ],
  "4": [
    "Triaging: strong, stretch, skip…",
    "Re-angling your bullets…",
    "Reordering skills to lead…",
    "Updating the tracker…",
  ],
};

export const OPENING: ChatMessage = {
  role: "assistant",
  display:
    "Morning. I'm your recruiter — my job is getting you in front of fresh postings inside the first hour, before the bots swarm them.\n\nTwo things to start:\n\n1. Upload your current resume (PDF) or paste it as text.\n2. Have you already been applying? If you have a list of jobs you've applied to, paste it and I'll use it as our tracker baseline so we never double-apply.",
  api: null,
  phase: 0,
};
