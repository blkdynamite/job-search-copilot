import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { refreshAndTriageForUser } from "@/lib/jobs/runForUser";
import { listMatches } from "@/lib/jobs/present";
import { sendEmail } from "@/lib/email/resend";
import { digestHtml } from "@/lib/email/templates";
import { authorizeCron, APP_URL } from "@/lib/cron";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_USERS = 50;

// GET /api/cron/daily — nightly hunt + triage for every set-up user, then email a digest to anyone
// with fresh Strong/Stretch matches. Guarded by CRON_SECRET.
export async function GET(req: Request) {
  if (!authorizeCron(req)) return new Response("Unauthorized", { status: 401 });

  const svc = createServiceClient();
  const nowMs = Date.now();
  const { data: users } = await svc.from("firsthour_users").select("id, email").limit(MAX_USERS);

  let processed = 0;
  let emailed = 0;
  for (const u of users ?? []) {
    const outcome = await refreshAndTriageForUser(svc, u.id, nowMs);
    processed++;
    if (outcome.status !== "ok" || !u.email) continue;

    // Only email when there are genuinely new triaged postings, and only surface Strong/Stretch.
    if (outcome.triaged > 0) {
      const matches = (await listMatches(svc, u.id, nowMs)).filter((m) => m.verdict !== "skip").slice(0, 8);
      if (matches.length) {
        const ok = await sendEmail({
          to: u.email,
          subject: `${matches.length} fresh job match${matches.length === 1 ? "" : "es"} on FirstHour`,
          html: digestHtml(matches, APP_URL),
        });
        if (ok) emailed++;
      }
    }
  }

  return NextResponse.json({ processed, emailed });
}
