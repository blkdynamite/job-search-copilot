import type { SupabaseClient } from "@supabase/supabase-js";
import { refreshTitle, type JobRow } from "./refresh";
import { triageJob, type ProfileForTriage } from "./triage";

const MAX_TITLES = 5;
const MAX_TRIAGE_PER_RUN = 12;

export type RunOutcome =
  | { status: "no_prefs" }
  | { status: "no_resume" }
  | { status: "ok"; harvested: number; triaged: number; cacheHits: number };

// Shared cache-first hunt + triage for one user. Used by both /api/jobs/refresh and the daily cron.
export async function refreshAndTriageForUser(
  svc: SupabaseClient<any, any, any>,
  userId: string,
  nowMs: number
): Promise<RunOutcome> {
  const { data: profile } = await svc
    .from("firsthour_profiles")
    .select("target_titles, city_metro, salary_min, salary_max, remote_pref, work_auth")
    .eq("user_id", userId)
    .maybeSingle();

  const titles: string[] = Array.isArray(profile?.target_titles) ? profile!.target_titles : [];
  if (!titles.length) return { status: "no_prefs" };

  const { data: resume } = await svc
    .from("firsthour_resumes")
    .select("content_json")
    .eq("user_id", userId)
    .eq("kind", "uploaded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const resumeText: string = resume?.content_json?.raw_text ?? "";
  if (!resumeText) return { status: "no_resume" };

  const remote = (profile?.remote_pref || "").toLowerCase().includes("remote");
  const location = remote ? "Remote" : profile?.city_metro || "Remote";

  const byId = new Map<string, JobRow>();
  let cacheHits = 0;
  for (const title of titles.slice(0, MAX_TITLES)) {
    const { jobs, cacheHit } = await refreshTitle(svc, title, location, nowMs);
    if (cacheHit) cacheHits++;
    for (const j of jobs) byId.set(j.id, j);
  }

  const jobIds = [...byId.keys()];
  const { data: existing } = await svc
    .from("firsthour_matches")
    .select("job_id")
    .eq("user_id", userId)
    .in("job_id", jobIds.length ? jobIds : ["00000000-0000-0000-0000-000000000000"]);
  const seen = new Set((existing ?? []).map((m: { job_id: string }) => m.job_id));

  const toTriage = [...byId.values()].filter((j) => !seen.has(j.id)).slice(0, MAX_TRIAGE_PER_RUN);
  const prof: ProfileForTriage = profile ?? {};
  for (const job of toTriage) {
    await triageJob(svc, userId, job, prof, resumeText);
  }

  return { status: "ok", harvested: byId.size, triaged: toTriage.length, cacheHits };
}
