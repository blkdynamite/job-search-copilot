// Minimal Resend sender (fetch-based, no SDK dependency). Inert when RESEND_API_KEY is unset —
// the app runs fine without email; setting the key turns digests on, like the search provider.
const FROM = process.env.EMAIL_FROM || "FirstHour <onboarding@resend.dev>";

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY unset — skipping send to", opts.to);
    return false;
  }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [opts.to], subject: opts.subject, html: opts.html }),
    });
    if (!resp.ok) {
      console.error("[email] Resend error", resp.status, await resp.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] send failed", e);
    return false;
  }
}
