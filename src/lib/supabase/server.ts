import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Create a new client per request -- never share across requests/renders.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component without a mutable cookie store
            // (e.g. during a page render) -- safe to ignore since proxy.ts
            // refreshes the session on the surrounding request instead.
          }
        },
      },
    },
  );
}
