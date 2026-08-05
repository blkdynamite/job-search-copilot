import { isAtsUrl, sourceForUrl, type JobPosting } from "./provider";

// Fetch a pasted ATS posting and verify it's still open. Closed Greenhouse postings redirect to the
// company board root (no /jobs/ segment) — treat that as closed.
export async function fetchPosting(
  url: string
): Promise<{ ok: true; posting: JobPosting } | { ok: false; reason: string }> {
  if (!isAtsUrl(url)) return { ok: false, reason: "Not a Greenhouse/Lever/Ashby posting link." };

  let res: Response;
  try {
    res = await fetch(url, { redirect: "follow", headers: { "User-Agent": "FirstHourBot/1.0" } });
  } catch {
    return { ok: false, reason: "Couldn't reach that link." };
  }
  if (!res.ok) return { ok: false, reason: `Posting looks closed (HTTP ${res.status}).` };

  const finalUrl = res.url || url;
  if (finalUrl.includes("greenhouse.io") && !/\/jobs\//.test(finalUrl)) {
    return { ok: false, reason: "Posting looks closed (redirected to the company board)." };
  }

  const html = await res.text();
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";
  const [rawTitle, rawCompany] = pageTitle.split(/\s[|\-–]\s/).map((s) => s.trim());

  const description = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);

  let host = "";
  try {
    host = new URL(finalUrl).host;
  } catch {
    /* noop */
  }

  return {
    ok: true,
    posting: {
      source: sourceForUrl(finalUrl),
      company: rawCompany || host.split(".")[0] || "Unknown",
      title: rawTitle || pageTitle || "(from posting)",
      location: null,
      url: finalUrl,
      description: description || null,
      postedAt: null,
    },
  };
}
