import type { JobPosting, JobsProvider, SearchParams } from "./provider";

// Deterministic mock provider — lets the whole pipeline run without a search API key.
// Produces a spread of postings (strong / stretch / skip / no-AI) per title so triage is exercised.
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const mockProvider: JobsProvider = {
  name: "mock",
  async search({ title, location }: SearchParams): Promise<JobPosting[]> {
    const t = slug(title);
    const loc = location || "Remote";
    return [
      {
        source: "greenhouse",
        company: "Northwind Labs",
        title,
        location: loc,
        url: `https://boards.greenhouse.io/northwindlabs/jobs/${t}-1001`,
        description: `We're hiring a ${title}. You'll own core workflows end to end. Requirements: 4+ years in a closely related role, strong ownership, ${location.includes("Remote") ? "remote-friendly" : loc}. Comp: competitive, market rate.`,
        postedAt: null,
      },
      {
        source: "lever",
        company: "Meridian",
        title: `Senior ${title}`,
        location: loc,
        url: `https://jobs.lever.co/meridian/${t}-senior-2002`,
        description: `Senior ${title} role. Requires 8+ years and prior team leadership — a stretch for mid-level candidates. On-site preferred.`,
        postedAt: null,
      },
      {
        source: "ashby",
        company: "Quill AI",
        title,
        location: loc,
        url: `https://jobs.ashbyhq.com/quill-ai/${t}-3003`,
        description: `${title} at Quill AI. Please do NOT use AI-generated content in your application; we want to hear your authentic voice. 3+ years experience.`,
        postedAt: null,
      },
      {
        source: "greenhouse",
        company: "Helios Bio",
        title: `${title} (Clinical)`,
        location: "Boston, MA",
        url: `https://boards.greenhouse.io/heliosbio/jobs/${t}-clinical-4004`,
        description: `${title} embedded in a clinical genomics lab. Hard requirement: PhD in molecular biology and on-site in Boston. Not remote.`,
        postedAt: null,
      },
    ];
  },
};
