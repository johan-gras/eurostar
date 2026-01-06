'use server';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface RegisterResult {
  success?: boolean;
  error?: string;
}

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const { name, email, password } = input;

  try {
    const apiUrl = process.env['API_URL'] || 'http://localhost:3001';

    const response = await fetch(`${apiUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json() as { data?: unknown; error?: { message: string } };

    if (!response.ok) {
      return {
        error: data.error?.message || 'Registration failed. Please try again.',
      };
    }

    return { success: true };
  } catch {
    return {
      error: 'Unable to connect to the server. Please try again later.',
    };
  }
}
