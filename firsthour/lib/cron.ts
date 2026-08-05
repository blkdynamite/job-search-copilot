// Guards cron route handlers. Vercel Cron includes `Authorization: Bearer <CRON_SECRET>` when the
// CRON_SECRET env var is set. We require it — an unset secret means the endpoint refuses to run.
export function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
