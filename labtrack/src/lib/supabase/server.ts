import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for Server Components, Server Actions, and Route Handlers.
 * Uses HTTP-only cookies for secure session management.
 * 
 * IMPORTANT: Use getUser() instead of getSession() for authentication checks
 * as getUser() validates the token with the Supabase auth server.
 */
export function createClient() {
    const cookieStore = cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch {
                        // This happens in Server Components where cookies are read-only
                        // Session refresh will happen in middleware instead
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: "", ...options });
                    } catch {
                        // This happens in Server Components where cookies are read-only
                    }
                },
            },
        }
    );
}

/**
 * Creates a Supabase admin client with service role key.
 * Use this ONLY in server-side code that needs elevated permissions.
 * NEVER expose this to the client.
 */
export function createAdminClient() {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            cookies: {
                get() { return undefined; },
                set() { },
                remove() { },
            },
        }
    );
}
