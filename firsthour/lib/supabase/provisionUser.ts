import { createServiceClient } from "./server";

// Lazy user provisioning — replaces an on_auth_user_created trigger.
//
// auth.users is SHARED across every app in the Dap_app project, so we must not add a signup trigger
// there. Instead, the first time an authenticated FirstHour request comes in, we upsert this user's
// firsthour_users + firsthour_profiles rows. Idempotent; safe to call on every authenticated entry.
export async function ensureFirstHourUser(userId: string, email: string | null) {
  const svc = createServiceClient();

  const { error: userErr } = await svc
    .from("firsthour_users")
    .upsert({ id: userId, email }, { onConflict: "id", ignoreDuplicates: true });
  if (userErr) throw userErr;

  const { error: profileErr } = await svc
    .from("firsthour_profiles")
    .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  if (profileErr) throw profileErr;
}
