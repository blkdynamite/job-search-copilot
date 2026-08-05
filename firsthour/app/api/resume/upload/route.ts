import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "firsthour-resumes";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// POST /api/resume/upload  (multipart: file=<pdf>)
// Auth required. Extracts text server-side, stores the PDF in Storage, records a firsthour_resumes
// row, and returns the extracted text so the chat can send it to the agent for Phase 1 analysis.
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Please upload a PDF." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That PDF is over 10 MB." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Extract text (serverless-friendly, no native deps).
  let text = "";
  try {
    const pdf = await getDocumentProxy(bytes);
    const result = await extractText(pdf, { mergePages: true });
    text = (Array.isArray(result.text) ? result.text.join("\n") : result.text).trim();
  } catch {
    return NextResponse.json(
      { error: "Couldn't read text from that PDF. Try pasting the text instead." },
      { status: 422 }
    );
  }
  if (!text) {
    return NextResponse.json(
      { error: "That PDF looks empty or scanned (no text layer). Paste the text instead." },
      { status: 422 }
    );
  }

  // Store the file + record the resume row via the service role (writes into the firsthour schema).
  const svc = createServiceClient();
  const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;

  const { error: uploadErr } = await svc.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (uploadErr) {
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 500 });
  }

  const { data: row, error: rowErr } = await svc
    .from("firsthour_resumes")
    .insert({
      user_id: user.id,
      kind: "uploaded",
      pdf_path: path,
      content_json: { filename: file.name, raw_text: text },
    })
    .select("id")
    .single();
  if (rowErr) {
    return NextResponse.json({ error: "Could not save the resume record." }, { status: 500 });
  }

  return NextResponse.json({ resumeId: row.id, text });
}
