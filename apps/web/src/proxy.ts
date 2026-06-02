import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { checkRateLimit } from './lib/rate-limit';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';
const key = new TextEncoder().encode(JWT_SECRET);

export async function proxy(req: NextRequest) {
  // Apply rate limiting for API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    // Max 100 requests per minute per IP
    const allowed = checkRateLimit(ip, { maxRequests: 100, windowMs: 60 * 1000 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }
  }

  const token = req.cookies.get('accessToken')?.value;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/signup');
  const isProtectedPage = req.nextUrl.pathname.startsWith('/dashboard') || 
                          req.nextUrl.pathname.startsWith('/projects') ||
                          req.nextUrl.pathname.startsWith('/settings');

  if (!token) {
    if (isProtectedPage) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  try {
    // Verify token validity
    await jwtVerify(token, key);
    
    // If user is logged in, they shouldn't be on auth pages
    if (isAuthPage || req.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    
    return NextResponse.next();
  } catch (error) {
    // Invalid token - kick to login if on protected page
    if (isProtectedPage) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
