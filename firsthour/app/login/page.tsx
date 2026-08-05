"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="min-h-screen font-body text-slate flex flex-col">
      <nav className="px-6 py-5 max-w-5xl mx-auto w-full">
        <Link href="/" className="text-xl font-display font-bold tracking-tight text-ink">
          First<span className="text-amber">Hour</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {sent ? (
            <div className="p-6 rounded-2xl bg-white text-center" style={{ border: "1px solid #E4E9F0" }}>
              <p className="text-2xl mb-2">📬</p>
              <h1 className="font-display font-semibold text-ink mb-2">Check your email</h1>
              <p className="text-sm leading-relaxed">
                We sent a magic link to <strong className="text-ink">{email}</strong>. Click it and
                you&apos;ll land right back here, signed in.
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-display font-bold text-ink text-2xl mb-1">Sign in</h1>
              <p className="text-sm mb-6">No password — we&apos;ll email you a magic link.</p>
              <form onSubmit={submit} className="flex flex-col gap-3">
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="px-4 py-3 rounded-xl outline-none text-sm bg-white text-ink"
                  style={{ border: "1px solid #D7DEE8" }}
                />
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="px-4 py-3 rounded-xl text-sm font-display font-semibold text-white"
                  style={{ background: loading || !email.trim() ? "#D7DEE8" : "#DC6803" }}
                >
                  {loading ? "Sending…" : "Send magic link"}
                </button>
                {error && (
                  <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#FEF3F2", color: "#B42318" }}>
                    {error}
                  </p>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
