import type { SupabaseClient } from "@supabase/supabase-js";
import { anthropic } from "@/lib/anthropic";
import { MODELS } from "@/lib/models";

// Canonicalize a job title so "Sr. PM" / "Senior Product Manager" / "Product Manager, Senior" collapse
// to one canonical_title (shared-index key). Checks the firsthour_title_aliases cache first, then Haiku.
export async function canonicalTitle(svc: SupabaseClient<any, any, any>, raw: string): Promise<string> {
  const alias = raw.trim();
  if (!alias) return alias;

  const { data: hit } = await svc
    .from("firsthour_title_aliases")
    .select("canonical_title")
    .eq("alias", alias.toLowerCase())
    .maybeSingle();
  if (hit?.canonical_title) return hit.canonical_title;

  let canonical = alias;
  try {
    const msg = await anthropic().messages.create({
      model: MODELS.haiku,
      max_tokens: 60,
      system:
        "Normalize a job title to its canonical form: expand abbreviations (Sr.→Senior, PM→Product Manager, Eng→Engineer), Title Case, no seniority reordering artifacts. Reply with ONLY the canonical title, nothing else.",
      messages: [{ role: "user", content: alias }],
    });
    const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    if (text) canonical = text.split("\n")[0].slice(0, 120);
  } catch {
    // fall back to the raw title if Haiku is unavailable
  }

  await svc
    .from("firsthour_title_aliases")
    .upsert({ alias: alias.toLowerCase(), canonical_title: canonical }, { onConflict: "alias", ignoreDuplicates: true });

  return canonical;
}
