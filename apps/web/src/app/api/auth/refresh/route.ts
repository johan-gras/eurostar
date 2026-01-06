import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const TIMEOUT_MS = 10000; // 10 seconds for auth operations

export async function POST() {
  const cookieStore = cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const apiUrl = process.env['API_URL'] || 'http://localhost:3001';

    const response = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // Clear cookies if refresh failed
      cookieStore.delete('access_token');
      cookieStore.delete('refresh_token');
      return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
    }

    const data = await response.json() as {
      data: { accessToken: string; refreshToken: string };
    };

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data.data;

    // Set new tokens
    cookieStore.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    cookieStore.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    clearTimeout(timeoutId);
  }
}
