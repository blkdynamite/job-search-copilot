import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateCoverLetter, type CoverIntake } from "@/lib/coverletter/generate";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/cover-letter  (body: { jobId, intake: { experience, impact, motivation } })
// Intake-driven: drafts ONLY from the candidate's own words. No-AI postings get an outline instead.
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const jobId: string | undefined = typeof body?.jobId === "string" ? body.jobId : undefined;
  const intake: CoverIntake = {
    experience: String(body?.intake?.experience ?? "").trim(),
    impact: String(body?.intake?.impact ?? "").trim(),
    motivation: String(body?.intake?.motivation ?? "").trim(),
  };
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });
  if (!intake.experience || !intake.motivation) {
    return NextResponse.json(
      { error: "Tell me your most relevant experience and what draws you to the company — I only write from your real input." },
      { status: 400 }
    );
  }

  const svc = createServiceClient();
  const { data: job } = await svc.from("firsthour_jobs").select("*").eq("id", jobId).maybeSingle();
  if (!job) return NextResponse.json({ error: "That job is no longer available." }, { status: 404 });

  const mode: "draft" | "outline_only" = job.ai_prohibited ? "outline_only" : "draft";

  let text: string;
  try {
    text = await generateCoverLetter(
      intake,
      { company: job.company, title: job.title, description: job.raw_description },
      mode
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't draft the cover letter. Try again." },
      { status: 502 }
    );
  }

  const { data: cl } = await svc
    .from("firsthour_cover_letters")
    .insert({ user_id: user.id, job_id: jobId, mode, body: text, intake_json: intake })
    .select("id")
    .single();

  // Link to the tracker without clobbering an existing status.
  const { data: updated } = await svc
    .from("firsthour_applications")
    .update({ cover_letter_id: cl?.id ?? null, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .select("id");
  if (!updated || !updated.length) {
    await svc.from("firsthour_applications").insert({
      user_id: user.id,
      job_id: jobId,
      status: "to_apply",
      cover_letter_id: cl?.id ?? null,
    });
  }

  return NextResponse.json({ mode, body: text, company: job.company });
}
