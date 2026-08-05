import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { listApplications } from "@/lib/tracker/list";
import { TrackerTable } from "@/components/TrackerTable";

export const metadata = { title: "FirstHour — tracker" };
export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const svc = createServiceClient();
  const rows = await listApplications(svc, user.id);

  return (
    <main className="min-h-screen font-body text-slate">
      <header className="px-5 py-4 flex items-center justify-between border-b bg-white" style={{ borderColor: "#D7DEE8" }}>
        <div className="flex items-baseline gap-3">
          <Link href="/" className="text-xl font-display font-bold tracking-tight text-ink">
            First<span className="text-amber">Hour</span>
          </Link>
          <span className="text-xs uppercase tracking-widest font-mono" style={{ color: "#98A2B3" }}>
            tracker
          </span>
        </div>
        <Link
          href="/chat"
          className="text-xs font-display font-semibold px-3 py-2 rounded-xl"
          style={{ background: "#E0F2F7", color: "#0E4A5C" }}
        >
          ← Back to chat
        </Link>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-display font-bold text-ink text-2xl mb-1">Applications</h1>
        <p className="text-sm mb-6" style={{ color: "#667085" }}>
          Every job you&apos;ve tailored for or drafted a letter for. Update a status inline.
        </p>
        <TrackerTable rows={rows} />
      </div>
    </main>
  );
}
