import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureFirstHourUser } from "@/lib/supabase/provisionUser";
import Chat from "@/components/Chat";

export const metadata = { title: "FirstHour — your recruiter" };
export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Idempotent safety net — ensures the firsthour_users/profiles rows exist.
  try {
    await ensureFirstHourUser(user.id, user.email ?? null);
  } catch {
    // non-fatal; provisioning also runs at magic-link confirm.
  }

  const { data: row } = await supabase
    .from("firsthour_users")
    .select("tailor_credits")
    .eq("id", user.id)
    .maybeSingle();

  return <Chat userEmail={user.email ?? ""} initialCredits={row?.tailor_credits ?? 0} />;
}
