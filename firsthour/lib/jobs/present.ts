import type { SupabaseClient } from "@supabase/supabase-js";
import { ageLabel, isFresh } from "./freshness";
import type { JobRow } from "./refresh";

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

const ORDER: Record<string, number> = { strong: 0, stretch: 1, skip: 2 };

// List a user's matches joined to the shared job rows, freshest fit first, filtered to recent postings.
export async function listMatches(
  svc: SupabaseClient<any, any, any>,
  userId: string,
  nowMs: number
): Promise<MatchView[]> {
  const { data } = await svc
    .from("firsthour_matches")
    .select("verdict, verdict_reason, gaps, created_at, firsthour_jobs(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as Array<{
    verdict: "strong" | "stretch" | "skip";
    verdict_reason: string | null;
    gaps: string[] | null;
    firsthour_jobs: JobRow | null;
  }>;

  const views: MatchView[] = [];
  for (const r of rows) {
    const job = r.firsthour_jobs;
    if (!job || !isFresh(job, nowMs)) continue;
    views.push({
      jobId: job.id,
      company: job.company,
      title: job.title,
      location: job.location,
      url: job.url,
      source: job.source,
      verdict: r.verdict,
      reason: r.verdict_reason,
      gaps: r.gaps ?? [],
      age: ageLabel(job, nowMs),
      aiProhibited: job.ai_prohibited,
    });
  }

  views.sort((a, b) => ORDER[a.verdict] - ORDER[b.verdict]);
  return views;
}
