import type { SupabaseClient } from "@supabase/supabase-js";
import { getProvider } from "./provider";
import { canonicalTitle } from "./canonicalize";
import { FRESH_DAYS, locationBucket } from "./freshness";

export type JobRow = {
  id: string;
  source: string;
  company: string | null;
  title: string | null;
  canonical_title: string | null;
  location: string | null;
  location_bucket: string | null;
  url: string;
  posted_at: string | null;
  first_seen_at: string;
  raw_description: string | null;
  ai_prohibited: boolean;
  status: string;
  last_verified_at: string | null;
};

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h

// Cache-first refresh for one (canonical title, location) cluster.
// Fresh cache → serve from the shared index, no provider call. Otherwise query the provider, upsert
// new postings (preserving first_seen_at on conflict), and refresh the cache row.
export async function refreshTitle(
  svc: SupabaseClient<any, any, any>,
  rawTitle: string,
  location: string,
  nowMs: number
): Promise<{ canonical: string; jobs: JobRow[]; cacheHit: boolean }> {
  const canonical = await canonicalTitle(svc, rawTitle);
  const bucket = locationBucket(location);

  const { data: cache } = await svc
    .from("firsthour_search_cache")
    .select("fetched_at")
    .eq("canonical_title", canonical)
    .eq("location_bucket", bucket)
    .maybeSingle();

  const fresh = cache && nowMs - new Date(cache.fetched_at).getTime() < CACHE_TTL_MS;

  if (!fresh) {
    const provider = await getProvider();
    const postings = await provider.search({ title: canonical, location: location || "Remote", afterDays: FRESH_DAYS });

    if (postings.length) {
      // ignoreDuplicates → INSERT ... ON CONFLICT (url) DO NOTHING, so first_seen_at is never overwritten.
      await svc.from("firsthour_jobs").upsert(
        postings.map((p) => ({
          source: p.source,
          company: p.company,
          title: p.title,
          canonical_title: canonical,
          location: p.location,
          location_bucket: bucket,
          url: p.url,
          posted_at: p.postedAt,
          raw_description: p.description,
          status: "unknown",
        })),
        { onConflict: "url", ignoreDuplicates: true }
      );
    }

    await svc.from("firsthour_search_cache").upsert(
      {
        canonical_title: canonical,
        location_bucket: bucket,
        query_hash: `${canonical}::${bucket}`,
        fetched_at: new Date(nowMs).toISOString(),
        result_count: postings.length,
      },
      { onConflict: "canonical_title,location_bucket" }
    );
  }

  const sinceIso = new Date(nowMs - FRESH_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: jobs } = await svc
    .from("firsthour_jobs")
    .select("*")
    .eq("canonical_title", canonical)
    .eq("location_bucket", bucket)
    .gte("first_seen_at", sinceIso)
    .order("first_seen_at", { ascending: false })
    .limit(40);

  return { canonical, jobs: (jobs ?? []) as JobRow[], cacheHit: !!fresh };
}
