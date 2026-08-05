import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/profile — save job-search preferences to firsthour_profiles (RLS: own row).
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const titles: string[] = Array.isArray(body.target_titles)
    ? body.target_titles.map((t: unknown) => String(t).trim()).filter(Boolean).slice(0, 12)
    : typeof body.target_titles === "string"
      ? body.target_titles.split(",").map((t: string) => t.trim()).filter(Boolean).slice(0, 12)
      : [];

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (titles.length) update.target_titles = titles;
  if (typeof body.city_metro === "string") update.city_metro = body.city_metro.trim();
  if (typeof body.remote_pref === "string") update.remote_pref = body.remote_pref.trim();
  if (typeof body.work_auth === "string") update.work_auth = body.work_auth.trim();
  if (Number.isFinite(body.salary_min)) update.salary_min = Math.round(body.salary_min);
  if (Number.isFinite(body.salary_max)) update.salary_max = Math.round(body.salary_max);

  const { error } = await supabase.from("firsthour_profiles").update(update).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Could not save preferences." }, { status: 500 });

  return NextResponse.json({ ok: true, target_titles: titles });
}
