import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const apiUrl = process.env['API_URL'] || 'http://localhost:3001';

    const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      // Try to refresh the token
      const refreshToken = cookieStore.get('refresh_token')?.value;
      if (refreshToken) {
        const refreshResponse = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json() as { data: { accessToken: string; refreshToken: string } };
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshData.data;

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

          // Retry the /me request with the new token
          const retryResponse = await fetch(`${apiUrl}/api/v1/auth/me`, {
            headers: {
              Authorization: `Bearer ${newAccessToken}`,
            },
          });

          if (retryResponse.ok) {
            const userData = await retryResponse.json() as { data: unknown };
            return NextResponse.json(userData);
          }
        }
      }

      // Clear cookies if refresh failed
      cookieStore.delete('access_token');
      cookieStore.delete('refresh_token');
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const data = await response.json() as { data: unknown };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
