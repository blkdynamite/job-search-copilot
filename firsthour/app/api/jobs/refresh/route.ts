import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { refreshTitle, type JobRow } from "@/lib/jobs/refresh";
import { triageJob, type ProfileForTriage } from "@/lib/jobs/triage";
import { listMatches } from "@/lib/jobs/present";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_TITLES = 5;
const MAX_TRIAGE_PER_RUN = 12;

// POST /api/jobs/refresh — cache-first hunt across the user's target titles, triage new postings,
// return the ranked matches. Returns { needPrefs: true } if the profile has no target titles.
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();

  const { data: profile } = await svc
    .from("firsthour_profiles")
    .select("target_titles, city_metro, salary_min, salary_max, remote_pref, work_auth")
    .eq("user_id", user.id)
    .maybeSingle();

  const titles: string[] = Array.isArray(profile?.target_titles) ? profile!.target_titles : [];
  if (!titles.length) {
    return NextResponse.json({ needPrefs: true, error: "Tell me your target titles and location first." }, { status: 200 });
  }

  const { data: resume } = await svc
    .from("firsthour_resumes")
    .select("content_json")
    .eq("user_id", user.id)
    .eq("kind", "uploaded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const resumeText: string = resume?.content_json?.raw_text ?? "";
  if (!resumeText) {
    return NextResponse.json({ needResume: true, error: "Upload a resume first so I can triage fit." }, { status: 200 });
  }

  const remote = (profile?.remote_pref || "").toLowerCase().includes("remote");
  const location = remote ? "Remote" : profile?.city_metro || "Remote";
  const nowMs = Date.now();

  // Cache-first hunt.
  const byId = new Map<string, JobRow>();
  let cacheHits = 0;
  for (const title of titles.slice(0, MAX_TITLES)) {
    const { jobs, cacheHit } = await refreshTitle(svc, title, location, nowMs);
    if (cacheHit) cacheHits++;
    for (const j of jobs) byId.set(j.id, j);
  }

  // Only triage jobs this user hasn't been matched on yet (cap per run to bound cost).
  const jobIds = [...byId.keys()];
  const { data: existing } = await svc
    .from("firsthour_matches")
    .select("job_id")
    .eq("user_id", user.id)
    .in("job_id", jobIds.length ? jobIds : ["00000000-0000-0000-0000-000000000000"]);
  const seen = new Set((existing ?? []).map((m: { job_id: string }) => m.job_id));

  const toTriage = [...byId.values()].filter((j) => !seen.has(j.id)).slice(0, MAX_TRIAGE_PER_RUN);
  const prof: ProfileForTriage = profile ?? {};
  for (const job of toTriage) {
    await triageJob(svc, user.id, job, prof, resumeText);
  }

  const matches = await listMatches(svc, user.id, nowMs);
  return NextResponse.json({
    matches,
    stats: { titles: titles.slice(0, MAX_TITLES).length, harvested: byId.size, triaged: toTriage.length, cacheHits },
  });
}
