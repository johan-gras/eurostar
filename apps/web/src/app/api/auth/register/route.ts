import { NextResponse } from 'next/server';

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as RegisterRequest;
    const { name, email, password } = body;

    const apiUrl = process.env['API_URL'] || 'http://localhost:3001';

    const response = await fetch(`${apiUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json() as {
      data?: unknown;
      error?: { message: string };
    };

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Registration failed' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Unable to connect to the server' },
      { status: 500 }
    );
  }
}
