import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { fetchPosting } from "@/lib/jobs/fetchPosting";
import { canonicalTitle } from "@/lib/jobs/canonicalize";
import { locationBucket } from "@/lib/jobs/freshness";
import { triageJob, type ProfileForTriage } from "@/lib/jobs/triage";
import { listMatches } from "@/lib/jobs/present";
import type { JobRow } from "@/lib/jobs/refresh";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_URLS = 8;

// POST /api/jobs/paste — the "paste as extra input" path. Fetch + verify each link, add to the
// shared index, triage, and return updated matches + any dead links.
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const urls: string[] = (Array.isArray(body.urls) ? body.urls : typeof body.url === "string" ? [body.url] : [])
    .map((u: unknown) => String(u).trim())
    .filter(Boolean)
    .slice(0, MAX_URLS);
  if (!urls.length) return NextResponse.json({ error: "No links provided." }, { status: 400 });

  const svc = createServiceClient();

  const { data: profile } = await svc
    .from("firsthour_profiles")
    .select("target_titles, city_metro, salary_min, salary_max, remote_pref, work_auth")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: resume } = await svc
    .from("firsthour_resumes")
    .select("content_json")
    .eq("user_id", user.id)
    .eq("kind", "uploaded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const resumeText: string = resume?.content_json?.raw_text ?? "";

  const nowMs = Date.now();
  const dead: { url: string; reason: string }[] = [];

  for (const url of urls) {
    const r = await fetchPosting(url);
    if (!r.ok) {
      dead.push({ url, reason: r.reason });
      continue;
    }
    const p = r.posting;
    const canonical = await canonicalTitle(svc, p.title);

    await svc.from("firsthour_jobs").upsert(
      {
        source: "pasted",
        company: p.company,
        title: p.title,
        canonical_title: canonical,
        location: p.location,
        location_bucket: locationBucket(p.location),
        url: p.url,
        raw_description: p.description,
        status: "open",
        last_verified_at: new Date(nowMs).toISOString(),
      },
      { onConflict: "url", ignoreDuplicates: false }
    );

    const { data: job } = await svc.from("firsthour_jobs").select("*").eq("url", p.url).maybeSingle();
    if (job && resumeText) {
      await triageJob(svc, user.id, job as JobRow, (profile ?? {}) as ProfileForTriage, resumeText);
    }
  }

  const matches = await listMatches(svc, user.id, nowMs);
  return NextResponse.json({ matches, dead, needResume: !resumeText });
}
