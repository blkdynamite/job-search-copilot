import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureFirstHourUser } from "@/lib/supabase/provisionUser";

export const runtime = "nodejs";

// Magic-link landing: Supabase emails a link to /auth/confirm?token_hash=…&type=…
// We verify the OTP (which sets the session cookies), provision the FirstHour user row, and go to /chat.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (token_hash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        try {
          await ensureFirstHourUser(user.id, user.email ?? null);
        } catch {
          // provisioning is best-effort; the chat page retries it idempotently.
        }
      }
      return NextResponse.redirect(new URL("/chat", origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=expired", origin));
}
