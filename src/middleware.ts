import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (error) {
    console.error('Middleware error:', error);
    return;
  }
}

export const config = {
  matcher: ["/protected/:path*", "/auth/:path*"],
};
