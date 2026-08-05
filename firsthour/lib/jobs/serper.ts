import {
  isAtsUrl,
  sourceForUrl,
  type JobPosting,
  type JobsProvider,
  type SearchParams,
} from "./provider";

// Real provider: Serper.dev (Google Search API). Inert unless SERPER_API_KEY is set.
// Builds the dated ATS query the skill's Phase 3 relies on; keeps only real ATS postings.
// Note: Google results rarely expose an exact posted date, so postedAt is left null and the index's
// first_seen_at becomes the freshness anchor. Descriptions are fetched lazily elsewhere if needed.
function dateNDaysAgo(n: number): string {
  // Avoid Date.now-in-worker concerns: compute from a passed anchor is overkill here; this runs
  // server-side per request where Date is available.
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export const serperProvider: JobsProvider = {
  name: "serper",
  async search({ title, location, afterDays }: SearchParams): Promise<JobPosting[]> {
    const after = dateNDaysAgo(afterDays);
    const q =
      `site:boards.greenhouse.io OR site:job-boards.greenhouse.io OR site:jobs.lever.co OR site:jobs.ashbyhq.com ` +
      `"${title}" "${location}" after:${after}`;

    const resp = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q, num: 100 }),
    });
    if (!resp.ok) throw new Error(`Serper error ${resp.status}`);
    const data = (await resp.json()) as { organic?: Array<{ title?: string; link?: string; snippet?: string }> };

    const out: JobPosting[] = [];
    for (const r of data.organic ?? []) {
      if (!r.link || !isAtsUrl(r.link)) continue;
      // Serper titles look like "Company - Senior PM - Greenhouse"; keep it simple and let triage read the snippet.
      const company = (r.title ?? "").split(/[-|]/)[0].trim() || "Unknown";
      out.push({
        source: sourceForUrl(r.link),
        company,
        title,
        location: location || null,
        url: r.link,
        description: r.snippet ?? null,
        postedAt: null,
      });
    }
    return out;
  },
};
