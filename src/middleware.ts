import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Temporarily simplified for Vercel deployment
  try {
    return await updateSession(request);
  } catch (error) {
    console.error('Middleware error:', error);
    return;
  }
}

export const config = {
  matcher: [
    /*
     * Match only auth routes to avoid Edge Runtime issues
     */
    "/protected/:path*",
    "/auth/:path*"
  ],
};
