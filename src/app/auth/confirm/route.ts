import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;
    const next = searchParams.get("next") ?? "/protected";

    // Handle both new format (token_hash + type) and old format (will be in URL)
    const supabase = await createClient();

    if (token_hash && type) {
      // New format: token_hash and type parameters
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });
      
      if (error) {
        console.error("Email verification error:", error);
        return NextResponse.redirect(
          new URL(`/auth/error?error=${encodeURIComponent(error.message)}`, request.url)
        );
      }
    } else {
      // Old format: Supabase handles it automatically via exchangeCodeForSession
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("Code exchange error:", error);
          return NextResponse.redirect(
            new URL(`/auth/error?error=${encodeURIComponent(error.message)}`, request.url)
          );
        }
      } else {
        return NextResponse.redirect(
          new URL("/auth/error?error=Missing verification parameters", request.url)
        );
      }
    }

    // Successfully verified - redirect to protected page
    return NextResponse.redirect(new URL(next, request.url));
  } catch (err) {
    console.error("Unexpected error in confirm route:", err);
    return NextResponse.redirect(
      new URL("/auth/error?error=An unexpected error occurred", request.url)
    );
  }
}
