import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { buildDocx } from "@/lib/resume/buildDocx";
import { buildPdf } from "@/lib/resume/buildPdf";
import { pageCount } from "@/lib/resume/pageCount";
import { generateTemplate } from "@/lib/resume/generate";

export const runtime = "nodejs";
export const maxDuration = 120;

const BUCKET = "firsthour-resumes";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// POST /api/resume/template  (body: { notes?: string })
// Rebuilds the user's most recent uploaded resume into a 2-page template (docx + pdf),
// stores it, and returns the fix summary, diffs, and signed download links.
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const notes: string | undefined = typeof body?.notes === "string" ? body.notes : undefined;

  const svc = createServiceClient();
  const { data: uploaded } = await svc
    .from("firsthour_resumes")
    .select("content_json")
    .eq("user_id", user.id)
    .eq("kind", "uploaded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const resumeText: string | undefined = uploaded?.content_json?.raw_text;
  if (!resumeText) {
    return NextResponse.json(
      { error: "Upload a resume first — I need it to build your template." },
      { status: 400 }
    );
  }

  // Generate + enforce the 2-page rule (one tighten pass). Cache the final pdf buffer.
  let lastPdf: Buffer | null = null;
  let result;
  let overLength;
  try {
    ({ result, overLength } = await generateTemplate(resumeText, notes, async (r) => {
      const pdf = await buildPdf(r.content);
      lastPdf = pdf;
      return { pages: await pageCount(pdf) };
    }));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't build the template. Try again." },
      { status: 502 }
    );
  }
  if (!lastPdf) {
    return NextResponse.json({ error: "PDF render failed." }, { status: 500 });
  }

  const docx = await buildDocx(result.content);
  const ts = Date.now();
  const base = `${user.id}/template-${ts}`;

  const up1 = await svc.storage.from(BUCKET).upload(`${base}.docx`, docx, {
    contentType: DOCX_MIME,
    upsert: false,
  });
  const up2 = await svc.storage.from(BUCKET).upload(`${base}.pdf`, lastPdf, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (up1.error || up2.error) {
    return NextResponse.json({ error: "Storing the files failed. Try again." }, { status: 500 });
  }

  await svc.from("firsthour_resumes").insert({
    user_id: user.id,
    kind: "template",
    docx_path: `${base}.docx`,
    pdf_path: `${base}.pdf`,
    content_json: result.content,
  });

  const [docxSigned, pdfSigned] = await Promise.all([
    svc.storage.from(BUCKET).createSignedUrl(`${base}.docx`, 3600),
    svc.storage.from(BUCKET).createSignedUrl(`${base}.pdf`, 3600),
  ]);

  let summary = result.summary_of_fixes;
  if (overLength) {
    summary +=
      "\n\n**Note:** it still runs slightly over two pages — tell me which role to shorten and I'll tighten it.";
  }

  return NextResponse.json({
    summary_of_fixes: summary,
    diffs: result.diffs,
    docxUrl: docxSigned.data?.signedUrl ?? null,
    pdfUrl: pdfSigned.data?.signedUrl ?? null,
  });
}
