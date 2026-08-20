import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-session";

// Named proxy.ts, not middleware.ts -- Next.js 16 renamed the convention
// (middleware.ts is deprecated but still works).
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
