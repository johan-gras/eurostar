'use server';

import { cookies } from 'next/headers';

interface LoginInput {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginResult {
  success?: boolean;
  error?: string;
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const { email, password, rememberMe } = input;

  try {
    const apiUrl = process.env['API_URL'] || 'http://localhost:3001';

    const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json() as { data?: { accessToken: string; refreshToken: string }; error?: { message: string } };

    if (!response.ok) {
      return {
        error: data.error?.message || 'Invalid email or password',
      };
    }

    const { accessToken, refreshToken } = data.data!;

    const cookieStore = cookies();
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days or 1 day

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
      maxAge: 30 * 24 * 60 * 60, // Always 30 days for refresh token
      path: '/',
    });

    return { success: true };
  } catch {
    return {
      error: 'Unable to connect to the server. Please try again later.',
    };
  }
}
