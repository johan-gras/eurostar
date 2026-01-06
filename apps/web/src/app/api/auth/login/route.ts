import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as LoginRequest;
    const { email, password, rememberMe = false } = body;

    const apiUrl = process.env['API_URL'] || 'http://localhost:3001';

    const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json() as {
      data?: { accessToken: string; refreshToken: string };
      error?: { message: string };
    };

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Invalid email or password' },
        { status: response.status }
      );
    }

    const { accessToken, refreshToken } = data.data!;
    const cookieStore = cookies();
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;

    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Unable to connect to the server' },
      { status: 500 }
    );
  }
}
