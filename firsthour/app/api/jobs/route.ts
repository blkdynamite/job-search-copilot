import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { listMatches } from "@/lib/jobs/present";

export const runtime = "nodejs";

// GET /api/jobs — the user's current matches (fresh postings only), best fit first.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();
  const matches = await listMatches(svc, user.id, Date.now());
  return NextResponse.json({ matches });
}
