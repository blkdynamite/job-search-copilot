import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { buildDocx } from "@/lib/resume/buildDocx";
import { buildPdf } from "@/lib/resume/buildPdf";
import { pageCount } from "@/lib/resume/pageCount";
import { generateTailored } from "@/lib/resume/generate";

export const runtime = "nodejs";
export const maxDuration = 120;

const BUCKET = "firsthour-resumes";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// POST /api/tailor  (body: { jobId })
// Tailors the user's resume to one job, spends a tailor credit, stores the files, and logs a
// to-apply row in the tracker. Returns summary, diffs, signed links, remaining credits, and gaps.
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const jobId: string | undefined = typeof body?.jobId === "string" ? body.jobId : undefined;
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const svc = createServiceClient();

  const { data: job } = await svc.from("firsthour_jobs").select("*").eq("id", jobId).maybeSingle();
  if (!job) return NextResponse.json({ error: "That job is no longer available." }, { status: 404 });

  // Base material: prefer the structured template, else the uploaded resume's extracted text.
  const { data: tmpl } = await svc
    .from("firsthour_resumes")
    .select("content_json")
    .eq("user_id", user.id)
    .eq("kind", "template")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let resumeBase = tmpl?.content_json ? JSON.stringify(tmpl.content_json) : "";
  if (!resumeBase) {
    const { data: up } = await svc
      .from("firsthour_resumes")
      .select("content_json")
      .eq("user_id", user.id)
      .eq("kind", "uploaded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    resumeBase = up?.content_json?.raw_text ?? "";
  }
  if (!resumeBase) {
    return NextResponse.json({ error: "Upload a resume first — I need it to tailor." }, { status: 400 });
  }

  // Fail fast if the user is already out of credits (the atomic spend below is the real guard).
  const { data: creditRow } = await svc
    .from("firsthour_users")
    .select("tailor_credits")
    .eq("id", user.id)
    .maybeSingle();
  if (!creditRow || creditRow.tailor_credits <= 0) {
    return NextResponse.json({ error: "You're out of tailor credits.", remainingCredits: 0 }, { status: 402 });
  }

  // Generate + render (2-page verified).
  let lastPdf: Buffer | null = null;
  let result;
  try {
    ({ result } = await generateTailored(
      resumeBase,
      { company: job.company, title: job.title, description: job.raw_description },
      async (r) => {
        const pdf = await buildPdf(r.content);
        lastPdf = pdf;
        return { pages: await pageCount(pdf) };
      }
    ));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't tailor the resume. Try again." },
      { status: 502 }
    );
  }
  if (!lastPdf) return NextResponse.json({ error: "PDF render failed." }, { status: 500 });

  const docx = await buildDocx(result.content);
  const ts = Date.now();
  const path = `${user.id}/tailored-${jobId}-${ts}`;
  const up1 = await svc.storage.from(BUCKET).upload(`${path}.docx`, docx, { contentType: DOCX_MIME, upsert: false });
  const up2 = await svc.storage.from(BUCKET).upload(`${path}.pdf`, lastPdf, { contentType: "application/pdf", upsert: false });
  if (up1.error || up2.error) return NextResponse.json({ error: "Storing the files failed." }, { status: 500 });

  const { data: resumeRow } = await svc
    .from("firsthour_resumes")
    .insert({
      user_id: user.id,
      kind: "tailored",
      job_id: jobId,
      docx_path: `${path}.docx`,
      pdf_path: `${path}.pdf`,
      content_json: result.content,
    })
    .select("id")
    .single();

  // Atomic credit spend + tracker entry.
  const { data: remaining } = await svc.rpc("firsthour_spend_tailor_credit", { p_user: user.id });
  await svc.from("firsthour_applications").upsert(
    { user_id: user.id, job_id: jobId, status: "to_apply", resume_id: resumeRow?.id ?? null, updated_at: new Date(ts).toISOString() },
    { onConflict: "user_id,job_id" }
  );

  // Honest gap heads-up from the existing triage.
  const { data: match } = await svc
    .from("firsthour_matches")
    .select("gaps")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle();

  const [docxSigned, pdfSigned] = await Promise.all([
    svc.storage.from(BUCKET).createSignedUrl(`${path}.docx`, 3600),
    svc.storage.from(BUCKET).createSignedUrl(`${path}.pdf`, 3600),
  ]);

  return NextResponse.json({
    summary_of_fixes: result.summary_of_fixes,
    diffs: result.diffs,
    docxUrl: docxSigned.data?.signedUrl ?? null,
    pdfUrl: pdfSigned.data?.signedUrl ?? null,
    remainingCredits: typeof remaining === "number" ? remaining : 0,
    gaps: (match?.gaps as string[] | null) ?? [],
    company: job.company,
  });
}
