import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApplicationStatus, TrackerRow } from "./types";

const BUCKET = "firsthour-resumes";

type AppRow = {
  status: ApplicationStatus;
  updated_at: string;
  job_id: string;
  firsthour_jobs: { company: string | null; title: string | null; location: string | null; url: string } | null;
  firsthour_resumes: { docx_path: string | null; pdf_path: string | null } | null;
  firsthour_cover_letters: { mode: "draft" | "outline_only" } | null;
};

// List a user's applications joined to job / resume / cover-letter, with signed resume links and the
// triage verdict mapped on. Service client (reads the service-only firsthour_jobs); always scoped to userId.
export async function listApplications(
  svc: SupabaseClient<any, any, any>,
  userId: string
): Promise<TrackerRow[]> {
  const { data } = await svc
    .from("firsthour_applications")
    .select(
      "status, updated_at, job_id, firsthour_jobs(company,title,location,url), firsthour_resumes(docx_path,pdf_path), firsthour_cover_letters(mode)"
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  const rows = (data ?? []) as unknown as AppRow[];
  if (!rows.length) return [];

  // Verdicts, one query.
  const jobIds = rows.map((r) => r.job_id);
  const { data: matches } = await svc
    .from("firsthour_matches")
    .select("job_id, verdict")
    .eq("user_id", userId)
    .in("job_id", jobIds);
  const verdictByJob = new Map((matches ?? []).map((m: { job_id: string; verdict: TrackerRow["verdict"] }) => [m.job_id, m.verdict]));

  const out: TrackerRow[] = [];
  for (const r of rows) {
    let docxUrl: string | null = null;
    let pdfUrl: string | null = null;
    if (r.firsthour_resumes?.docx_path) {
      const { data: s } = await svc.storage.from(BUCKET).createSignedUrl(r.firsthour_resumes.docx_path, 3600);
      docxUrl = s?.signedUrl ?? null;
    }
    if (r.firsthour_resumes?.pdf_path) {
      const { data: s } = await svc.storage.from(BUCKET).createSignedUrl(r.firsthour_resumes.pdf_path, 3600);
      pdfUrl = s?.signedUrl ?? null;
    }
    out.push({
      jobId: r.job_id,
      company: r.firsthour_jobs?.company ?? null,
      title: r.firsthour_jobs?.title ?? null,
      location: r.firsthour_jobs?.location ?? null,
      url: r.firsthour_jobs?.url ?? null,
      verdict: verdictByJob.get(r.job_id) ?? null,
      status: r.status,
      hasCoverLetter: !!r.firsthour_cover_letters,
      coverLetterMode: r.firsthour_cover_letters?.mode ?? null,
      resumeDocxUrl: docxUrl,
      resumePdfUrl: pdfUrl,
      updatedAt: r.updated_at,
    });
  }
  return out;
}
