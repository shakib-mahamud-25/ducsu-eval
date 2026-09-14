import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const isValid = password === process.env.ADMIN_PASSWORD;

    return NextResponse.json({ success: isValid }, { status: isValid ? 200 : 401 });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
