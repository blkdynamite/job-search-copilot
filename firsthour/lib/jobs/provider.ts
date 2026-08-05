// A single job posting as returned by a search provider (before it enters the shared index).
export type JobPosting = {
  source: "serp" | "greenhouse" | "lever" | "ashby" | "pasted";
  company: string;
  title: string;
  location: string | null;
  url: string;
  description: string | null; // raw description when available
  postedAt: string | null; // ISO; often unknown from search results
};

export type SearchParams = {
  title: string; // canonical title
  location: string; // "Remote" or a city/metro
  afterDays: number; // freshness window, e.g. 7
};

export interface JobsProvider {
  readonly name: "mock" | "serper" | "serpapi";
  search(params: SearchParams): Promise<JobPosting[]>;
}

// The ATS hosts we accept as real postings.
export const ATS_HOSTS = [
  "boards.greenhouse.io",
  "job-boards.greenhouse.io",
  "jobs.lever.co",
  "jobs.ashbyhq.com",
];

export function sourceForUrl(url: string): JobPosting["source"] {
  if (url.includes("greenhouse.io")) return "greenhouse";
  if (url.includes("lever.co")) return "lever";
  if (url.includes("ashbyhq.com")) return "ashby";
  return "serp";
}

export function isAtsUrl(url: string): boolean {
  try {
    const host = new URL(url).host;
    return ATS_HOSTS.some((h) => host === h);
  } catch {
    return false;
  }
}

// Env-selected provider. Defaults to mock so the pipeline runs with no API key.
export async function getProvider(): Promise<JobsProvider> {
  const choice = (process.env.JOBS_PROVIDER || "mock").toLowerCase();
  if (choice === "serper" && process.env.SERPER_API_KEY) {
    const { serperProvider } = await import("./serper");
    return serperProvider;
  }
  const { mockProvider } = await import("./mock");
  return mockProvider;
}
