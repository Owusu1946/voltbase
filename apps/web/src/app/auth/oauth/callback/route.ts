import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { COOKIE_KEYS } from '@voltbase/constants';

export async function GET(request: NextRequest) {
  const accessToken = request.nextUrl.searchParams.get('access_token');
  const refreshToken = request.nextUrl.searchParams.get('refresh_token');

  if (!accessToken || !refreshToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const response = NextResponse.redirect(new URL('/dashboard', request.url));

  response.cookies.set(COOKIE_KEYS.ACCESS_TOKEN, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  });

  response.cookies.set(COOKIE_KEYS.REFRESH_TOKEN, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
