import type { MatchView } from "@/lib/chat";

const WRAP = (inner: string, appUrl: string) => `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#344054">
  <div style="padding:20px 0">
    <span style="font-size:20px;font-weight:700;color:#0F1728">First<span style="color:#DC6803">Hour</span></span>
  </div>
  ${inner}
  <div style="margin-top:24px;padding-top:16px;border-top:1px solid #E4E9F0;font-size:12px;color:#98A2B3">
    <a href="${appUrl}/chat" style="color:#0E7490;text-decoration:none">Open FirstHour →</a>
    · Every line must survive an interview.
  </div>
</div>`;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function digestHtml(matches: MatchView[], appUrl: string): string {
  const rows = matches
    .map((m) => {
      const badge = m.verdict === "strong" ? "#0E7490" : "#B54708";
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #F2F4F7">
          <span style="font-size:10px;text-transform:uppercase;font-family:monospace;color:#fff;background:${badge};padding:2px 6px;border-radius:4px">${m.verdict}</span>
          <div style="font-weight:600;color:#0F1728;margin-top:4px">${esc(m.company || "")} — ${esc(m.title || "")}</div>
          <div style="font-size:13px;color:#667085">${esc(m.location || "")} · ${esc(m.age)}${m.aiProhibited ? " · ⚠ no-AI policy" : ""}</div>
          ${m.reason ? `<div style="font-size:13px;margin-top:2px">${esc(m.reason)}</div>` : ""}
          <a href="${m.url}" style="font-size:12px;color:#0E7490;text-decoration:none">View posting →</a>
        </td>
      </tr>`;
    })
    .join("");
  const inner = `
    <h1 style="font-size:20px;color:#0F1728;margin:0 0 4px">${matches.length} fresh match${matches.length === 1 ? "" : "es"} today</h1>
    <p style="font-size:14px;color:#667085;margin:0 0 12px">Caught while they're new — tailor a resume before the swarm piles in.</p>
    <table style="width:100%;border-collapse:collapse">${rows}</table>`;
  return WRAP(inner, appUrl);
}

export function nudgeHtml(items: { company: string | null; title: string | null }[], appUrl: string): string {
  const list = items
    .map((i) => `<li style="margin-bottom:4px"><strong style="color:#0F1728">${esc(i.company || "")}</strong> — ${esc(i.title || "")}</li>`)
    .join("");
  const inner = `
    <h1 style="font-size:20px;color:#0F1728;margin:0 0 4px">Time to follow up</h1>
    <p style="font-size:14px;color:#667085;margin:0 0 12px">You applied to these about 5 days ago and haven't heard back. A short, specific follow-up often unsticks a review.</p>
    <ul style="font-size:14px;padding-left:18px">${list}</ul>`;
  return WRAP(inner, appUrl);
}
