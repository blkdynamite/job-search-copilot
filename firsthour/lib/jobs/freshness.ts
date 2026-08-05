// Freshness helpers. The product surfaces only recent postings and labels estimated ages honestly.

export const FRESH_DAYS = 7;

export function locationBucket(location: string | null | undefined): string {
  const l = (location || "").trim().toLowerCase();
  if (!l) return "unknown";
  if (l.includes("remote")) return "remote";
  return l;
}

// Best-known timestamp: real posted_at if we have it, else when we first saw it.
export function bestTimestamp(job: { posted_at?: string | null; first_seen_at: string }): {
  iso: string;
  estimated: boolean;
} {
  if (job.posted_at) return { iso: job.posted_at, estimated: false };
  return { iso: job.first_seen_at, estimated: true };
}

export function ageLabel(job: { posted_at?: string | null; first_seen_at: string }, nowMs: number): string {
  const { iso, estimated } = bestTimestamp(job);
  const ms = nowMs - new Date(iso).getTime();
  const hours = Math.max(0, Math.floor(ms / 3_600_000));
  const rel = hours < 1 ? "just now" : hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
  return estimated ? `first seen ~${rel}` : `posted ${rel}`;
}

export function isFresh(job: { posted_at?: string | null; first_seen_at: string }, nowMs: number): boolean {
  const { iso } = bestTimestamp(job);
  return nowMs - new Date(iso).getTime() <= FRESH_DAYS * 24 * 3_600_000;
}
