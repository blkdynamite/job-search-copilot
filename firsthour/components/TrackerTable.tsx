"use client";

import { useState } from "react";
import { APPLICATION_STATUSES, type ApplicationStatus, type TrackerRow } from "@/lib/tracker/types";

const VERDICT_COLOR: Record<string, { bg: string; fg: string }> = {
  strong: { bg: "#0E7490", fg: "#FFFFFF" },
  stretch: { bg: "#FFF6ED", fg: "#B54708" },
  skip: { bg: "#F2F4F7", fg: "#667085" },
};

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  to_apply: "To apply",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "Ghosted",
};

export function TrackerTable({ rows }: { rows: TrackerRow[] }) {
  const [state, setState] = useState<TrackerRow[]>(rows);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function updateStatus(jobId: string, status: ApplicationStatus) {
    const prev = state;
    setState((s) => s.map((r) => (r.jobId === jobId ? { ...r, status } : r)));
    setSavingId(jobId);
    try {
      const resp = await fetch("/api/tracker", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, status }),
      });
      if (!resp.ok) throw new Error();
    } catch {
      setState(prev); // roll back on failure
    } finally {
      setSavingId(null);
    }
  }

  if (!state.length) {
    return (
      <div className="p-8 rounded-2xl text-center bg-white" style={{ border: "1px solid #E4E9F0" }}>
        <p className="text-sm" style={{ color: "#667085" }}>
          No applications yet. Head to the chat, find fresh jobs, and tailor a resume — they&apos;ll show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white" style={{ border: "1px solid #E4E9F0" }}>
      <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr className="text-left" style={{ color: "#667085", borderBottom: "1px solid #E4E9F0" }}>
            <th className="px-4 py-3 font-mono text-xs font-medium">Company</th>
            <th className="px-4 py-3 font-mono text-xs font-medium">Role</th>
            <th className="px-4 py-3 font-mono text-xs font-medium">Fit</th>
            <th className="px-4 py-3 font-mono text-xs font-medium">Status</th>
            <th className="px-4 py-3 font-mono text-xs font-medium">Resume</th>
            <th className="px-4 py-3 font-mono text-xs font-medium">Letter</th>
            <th className="px-4 py-3 font-mono text-xs font-medium">Posting</th>
          </tr>
        </thead>
        <tbody>
          {state.map((r) => {
            const vc = r.verdict ? VERDICT_COLOR[r.verdict] : null;
            return (
              <tr key={r.jobId} style={{ borderBottom: "1px solid #F2F4F7" }}>
                <td className="px-4 py-3 font-semibold text-ink">{r.company || "—"}</td>
                <td className="px-4 py-3">{r.title || "—"}</td>
                <td className="px-4 py-3">
                  {vc && (
                    <span
                      className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded"
                      style={{ background: vc.bg, color: vc.fg }}
                    >
                      {r.verdict}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={r.status}
                    disabled={savingId === r.jobId}
                    onChange={(e) => updateStatus(r.jobId, e.target.value as ApplicationStatus)}
                    className="text-xs px-2 py-1 rounded-lg bg-white"
                    style={{ border: "1px solid #D7DEE8", color: "#0F1728" }}
                  >
                    {APPLICATION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {r.resumeDocxUrl && (
                      <a href={r.resumeDocxUrl} className="text-xs font-mono" style={{ color: "#0E7490" }}>
                        docx
                      </a>
                    )}
                    {r.resumePdfUrl && (
                      <a href={r.resumePdfUrl} className="text-xs font-mono" style={{ color: "#0E7490" }}>
                        pdf
                      </a>
                    )}
                    {!r.resumeDocxUrl && !r.resumePdfUrl && <span className="text-xs" style={{ color: "#98A2B3" }}>—</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {r.hasCoverLetter ? (
                    <span className="text-xs font-mono" style={{ color: r.coverLetterMode === "outline_only" ? "#B54708" : "#0E7490" }}>
                      {r.coverLetterMode === "outline_only" ? "outline" : "draft"}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: "#98A2B3" }}>—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-xs font-mono" style={{ color: "#0E7490" }}>
                      open ↗
                    </a>
                  ) : (
                    <span className="text-xs" style={{ color: "#98A2B3" }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
