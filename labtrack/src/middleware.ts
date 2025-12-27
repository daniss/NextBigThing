import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/upload", "/reports", "/trends", "/settings"];

// Routes only for unauthenticated users (redirect to dashboard if logged in)
const authRoutes = ["/login", "/signup"];

// Public routes (accessible to everyone)
const publicRoutes = ["/", "/api"];

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    // Create Supabase client with cookie handling
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options });
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    });
                    response.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: "", ...options });
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    });
                    response.cookies.set({ name, value: "", ...options });
                },
            },
        }
    );

    // IMPORTANT: Use getUser() instead of getSession() for security
    // getUser() validates the token with Supabase auth server
    const { data: { user }, error } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;

    // Check if current path is a protected route
    const isProtectedRoute = protectedRoutes.some(route =>
        pathname === route || pathname.startsWith(route + "/")
    );

    // Check if current path is an auth route (login/signup)
    const isAuthRoute = authRoutes.some(route => pathname === route);

    // If user is NOT authenticated and trying to access protected route
    if (!user && isProtectedRoute) {
        const redirectUrl = new URL("/login", request.url);
        // Store the original URL to redirect back after login
        redirectUrl.searchParams.set("redirectTo", pathname);
        return NextResponse.redirect(redirectUrl);
    }

    // If user IS authenticated and trying to access auth pages (login/signup)
    if (user && isAuthRoute) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder assets
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
