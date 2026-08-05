import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { listApplications } from "@/lib/tracker/list";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/tracker/types";

export const runtime = "nodejs";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// GET /api/tracker — the signed-in user's applications.
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const svc = createServiceClient();
  return NextResponse.json({ rows: await listApplications(svc, user.id) });
}

// PATCH /api/tracker — update status/notes on the user's own application (by jobId).
export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const jobId: string | undefined = typeof body?.jobId === "string" ? body.jobId : undefined;
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.status === "string") {
    if (!APPLICATION_STATUSES.includes(body.status as ApplicationStatus)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    update.status = body.status;
  }
  if (typeof body.notes === "string") update.notes = body.notes;

  const svc = createServiceClient();
  const { error } = await svc
    .from("firsthour_applications")
    .update(update)
    .eq("user_id", user.id)
    .eq("job_id", jobId);
  if (error) return NextResponse.json({ error: "Update failed." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
