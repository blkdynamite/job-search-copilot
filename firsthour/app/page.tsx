import Link from "next/link";

const STEPS = [
  { n: "1", label: "Analysis", copy: "Upload your resume. Get a recruiter's honest read — your strongest titles, the ATS keywords each one screens for, and what's missing." },
  { n: "2", label: "Template", copy: "We rebuild it as a resume template — every bullet in the XYZ formula, red flags fixed. Nothing invented; every line survives an interview." },
  { n: "3", label: "Fresh jobs", copy: "The agent hunts live postings on Greenhouse, Lever, and Ashby — and surfaces the fresh ones first, before the swarm piles in." },
  { n: "4", label: "Triage & tailor", copy: "Honest Strong / Stretch / Skip verdicts with reasons, a tailored resume per viable role, and a tracker so you never double-apply." },
];

export default function Home() {
  return (
    <main className="min-h-screen font-body text-slate">
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <span className="text-xl font-display font-bold tracking-tight text-ink">
          First<span className="text-amber">Hour</span>
        </span>
        <Link
          href="/chat"
          className="px-4 py-2 rounded-xl text-sm font-display font-semibold text-white bg-amber"
        >
          Start free
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-20 max-w-3xl mx-auto text-center">
        <p className="text-xs uppercase tracking-widest font-mono text-teal mb-5">
          ● the first hour is the whole game
        </p>
        <h1 className="font-display font-bold text-ink leading-tight" style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)" }}>
          Get to fresh jobs before the swarm.
        </h1>
        <p className="mt-6 text-lg leading-relaxed max-w-xl mx-auto">
          FirstHour is a recruiter-grade agent that reads your resume, hunts postings the moment
          they go live, triages them honestly, and tailors a resume for each one — with a hard rule:
          it never invents a thing.
        </p>
        <div className="mt-9 flex items-center justify-center gap-3">
          <Link
            href="/chat"
            className="px-6 py-3 rounded-xl text-sm font-display font-semibold text-white bg-amber"
          >
            Start with your resume
          </Link>
          <span className="text-xs font-mono" style={{ color: "#98A2B3" }}>
            Free — just your email
          </span>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="grid gap-4 sm:grid-cols-2">
          {STEPS.map((s) => (
            <div key={s.n} className="p-6 rounded-2xl bg-white" style={{ border: "1px solid #E4E9F0" }}>
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-medium text-white bg-teal"
                >
                  {s.n}
                </span>
                <span className="font-display font-semibold text-ink">{s.label}</span>
              </div>
              <p className="text-sm leading-relaxed">{s.copy}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-sm mt-10 max-w-xl mx-auto" style={{ color: "#667085" }}>
          Built on a real recruiter workflow: it flags gaps instead of papering over them, respects
          no-AI application policies, and tailors by reframing your true experience — never by adding
          claims you can&apos;t defend.
        </p>
      </section>

      <footer className="px-6 py-8 border-t" style={{ borderColor: "#D7DEE8" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs" style={{ color: "#98A2B3" }}>
          <span className="font-display font-semibold text-ink">
            First<span className="text-amber">Hour</span>
          </span>
          <span className="font-mono">Every line must survive an interview.</span>
        </div>
      </footer>
    </main>
  );
}
