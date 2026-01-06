import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export function POST() {
  const cookieStore = cookies();

  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');

  return NextResponse.json({ success: true });
}
