import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
    '/',
    '/designer',
    '/heatmap',
    '/dashboard',
    '/upload',
    '/profile',
    '/labor',
    '/admin',
];

// Routes that are always public
const publicRoutes = [
    '/landing',
    '/login',
    '/auth/callback',
];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip middleware for static assets and API routes
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.includes('.') // files like favicon.ico, images, etc.
    ) {
        return NextResponse.next();
    }

    // Create a response to modify
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    // Create Supabase client for server-side session checking
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                },
            },
        }
    );

    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();

    const isAuthenticated = !!session;
    const isProtectedRoute = protectedRoutes.some(route =>
        pathname === route || pathname.startsWith(route + '/')
    );
    const isPublicRoute = publicRoutes.some(route =>
        pathname === route || pathname.startsWith(route + '/')
    );
    const isLoginPage = pathname === '/login';

    // Redirect unauthenticated users from protected routes to landing
    if (!isAuthenticated && isProtectedRoute) {
        const redirectUrl = new URL('/landing', request.url);
        return NextResponse.redirect(redirectUrl);
    }

    // Redirect authenticated users from login page to home
    if (isAuthenticated && isLoginPage) {
        const redirectUrl = new URL('/', request.url);
        return NextResponse.redirect(redirectUrl);
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
