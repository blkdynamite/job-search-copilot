import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { refreshAndTriageForUser } from "@/lib/jobs/runForUser";
import { listMatches } from "@/lib/jobs/present";

export const runtime = "nodejs";
export const maxDuration = 120;

// POST /api/jobs/refresh — cache-first hunt across the user's target titles, triage new postings,
// return the ranked matches. Returns { needPrefs } / { needResume } when setup is incomplete.
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();
  const nowMs = Date.now();
  const outcome = await refreshAndTriageForUser(svc, user.id, nowMs);

  if (outcome.status === "no_prefs") {
    return NextResponse.json({ needPrefs: true, error: "Tell me your target titles and location first." });
  }
  if (outcome.status === "no_resume") {
    return NextResponse.json({ needResume: true, error: "Upload a resume first so I can triage fit." });
  }

  const matches = await listMatches(svc, user.id, nowMs);
  return NextResponse.json({
    matches,
    stats: { harvested: outcome.harvested, triaged: outcome.triaged, cacheHits: outcome.cacheHits },
  });
}
