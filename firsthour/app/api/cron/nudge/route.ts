import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { nudgeHtml } from "@/lib/email/templates";
import { authorizeCron, APP_URL } from "@/lib/cron";

export const runtime = "nodejs";
export const maxDuration = 120;

// GET /api/cron/nudge — nudge applications that have sat in "applied" for ~5 days with no update.
// The 5-6 day window means each application is nudged roughly once. Guarded by CRON_SECRET.
export async function GET(req: Request) {
  if (!authorizeCron(req)) return new Response("Unauthorized", { status: 401 });

  const svc = createServiceClient();
  const now = Date.now();
  const from = new Date(now - 6 * 24 * 3600_000).toISOString();
  const to = new Date(now - 5 * 24 * 3600_000).toISOString();

  const { data: apps } = await svc
    .from("firsthour_applications")
    .select("user_id, firsthour_jobs(company,title)")
    .eq("status", "applied")
    .gte("updated_at", from)
    .lt("updated_at", to);

  // Group stale apps by user.
  const byUser = new Map<string, { company: string | null; title: string | null }[]>();
  for (const a of (apps ?? []) as unknown as Array<{ user_id: string; firsthour_jobs: { company: string | null; title: string | null } | null }>) {
    if (!a.firsthour_jobs) continue;
    const list = byUser.get(a.user_id) ?? [];
    list.push(a.firsthour_jobs);
    byUser.set(a.user_id, list);
  }

  let emailed = 0;
  for (const [userId, items] of byUser) {
    const { data: u } = await svc.from("firsthour_users").select("email").eq("id", userId).maybeSingle();
    if (!u?.email) continue;
    const ok = await sendEmail({
      to: u.email,
      subject: `Follow up on ${items.length} application${items.length === 1 ? "" : "s"}?`,
      html: nudgeHtml(items, APP_URL),
    });
    if (ok) emailed++;
  }

  return NextResponse.json({ users: byUser.size, emailed });
}
