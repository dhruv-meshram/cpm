import { NextResponse } from 'next/server';
import { verifyToken, signAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    let refreshToken = cookieStore.get('refreshToken')?.value;

    if (!refreshToken) {
      // Allow fallback to body for API clients
      const body = await req.json().catch(() => ({}));
      refreshToken = body.refreshToken;
    }

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token required' }, { status: 401 });
    }

    const payload = await verifyToken(refreshToken);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    }

    const accessToken = await signAccessToken({ userId: payload.userId });
    
    cookieStore.set('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' });

    return NextResponse.json({ accessToken });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
