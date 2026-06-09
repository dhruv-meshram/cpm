import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { cache } from 'react';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';
const key = new TextEncoder().encode(JWT_SECRET);

export async function signAccessToken(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function signRefreshToken(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload;
  } catch (error: any) {
    // Token absent or expired — routine, not an actionable server error
    console.debug('[auth] Token verification failed:', error.message || 'invalid token');
    return null;
  }
}

/**
 * Retrieves the current session from the access token cookie.
 * Wrapped with React cache() to deduplicate JWT verification
 * across nested server components in a single request.
 */
export const getSession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return null;
  return verifyToken(token);
});
